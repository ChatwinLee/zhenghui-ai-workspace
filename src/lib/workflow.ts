import { rolePeople, type Policy, type Project, type State } from "./types";

export const nodeKinds = {
  start: "流程发起",
  approval: "审批节点",
  condition: "条件分支",
  parallel: "并行会签",
  merge: "流程汇聚",
  end: "流程完成",
  terminate: "流程终止",
} as const;
export type NodeKind = keyof typeof nodeKinds;
export const bindings = {
  owner: "项目销售负责人",
  product: "项目产品负责人",
  developers: "项目研发参与人",
  sales: "销售岗位",
  productRole: "产品岗位",
  dev: "研发岗位",
  intake: "需求承接审批岗（管理员）",
} as const;
export type Binding = keyof typeof bindings;
export interface WorkflowNode {
  id: string;
  kind: NodeKind;
  name: string;
  binding: Binding;
  position: { x: number; y: number };
  field?: "amount" | "priority" | "phase";
  operator?: "gte" | "eq";
  value?: string;
}
export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  branch?: "yes" | "no";
}
export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}
export interface WorkflowVersion {
  id: string;
  number: number;
  createdAt: string;
  note: string;
  definition: WorkflowDefinition;
}
export interface WorkflowConfig {
  versions: WorkflowVersion[];
  activeId: string;
  draft: WorkflowDefinition;
}
export interface WorkflowSnapshot {
  versionId: string;
  number: number;
  definition: WorkflowDefinition;
}
const n = (
  id: string,
  kind: NodeKind,
  name: string,
  binding: Binding,
  x: number,
  y: number,
): WorkflowNode => ({ id, kind, name, binding, position: { x, y } });
const e = (
  source: string,
  target: string,
  branch?: "yes" | "no",
): WorkflowEdge => ({ id: `${source}-${target}`, source, target, branch });
export function defaultDefinition(): WorkflowDefinition {
  return {
    nodes: [
      n("start", "start", "提交业务需求", "owner", 300, 0),
      n("intake", "approval", "需求承接审批", "intake", 300, 150),
      {
        ...n("condition", "condition", "是否需要联合评审", "product", 300, 300),
        field: "amount",
        operator: "gte",
        value: "100000",
      },
      n("parallel", "parallel", "产品与研发会签", "product", 80, 460),
      n("product", "approval", "产品方案评审", "product", 0, 620),
      n("dev", "approval", "研发可行性评审", "developers", 260, 620),
      n("merge", "merge", "汇聚评审结果", "product", 300, 790),
      n("end", "end", "进入业务交付", "owner", 300, 950),
      n("stop", "terminate", "不承接并终止", "owner", 620, 300),
    ],
    edges: [
      e("start", "intake"),
      e("intake", "condition", "yes"),
      e("intake", "stop", "no"),
      e("condition", "parallel", "yes"),
      e("condition", "merge", "no"),
      e("parallel", "product"),
      e("parallel", "dev"),
      e("product", "merge", "yes"),
      e("product", "stop", "no"),
      e("dev", "merge", "yes"),
      e("dev", "stop", "no"),
      e("merge", "end"),
    ],
  };
}
export function createWorkflow(): WorkflowConfig {
  const definition = defaultDefinition();
  return {
    activeId: "workflow-v1",
    draft: structuredClone(definition),
    versions: [
      {
        id: "workflow-v1",
        number: 1,
        createdAt: "2026-09-29 17:00",
        note: "初始稳定版本",
        definition,
      },
    ],
  };
}
export function snapshot(config: WorkflowConfig): WorkflowSnapshot {
  const v = config.versions.find((v) => v.id === config.activeId)!;
  return {
    versionId: v.id,
    number: v.number,
    definition: structuredClone(v.definition),
  };
}
export function initializeWorkflow(state: State): State {
  state.workflow ??= createWorkflow();
  state.projects.forEach((p) => {
    if (p.stage !== "demand") p.workflowSnapshot ??= snapshot(state.workflow!);
  });
  return state;
}
export function inFlight(projects: Project[]) {
  return projects.filter(
    (p) => !["demand", "declined", "delivered"].includes(p.stage),
  );
}
export function resolveActors(
  binding: Binding,
  project: Project,
  policies: Policy[],
): string[] {
  const roleMap = {
    sales: "销售",
    productRole: "产品",
    dev: "研发",
    intake: "管理",
  };
  const people =
    binding === "owner"
      ? [project.owner]
      : binding === "product"
        ? [project.product]
        : binding === "developers"
          ? project.developers
          : policies
              .filter(
                (p) =>
                  p.type === "human" &&
                  (p.role === roleMap[binding] ||
                    (binding === "intake" && p.role === "管理员")),
              )
              .map((p) => p.name);
  const admins = new Set(
    policies
      .filter((p) => p.type === "human" && /^(管理|管理员)$/.test(p.role))
      .map((p) => p.name),
  );
  if (binding === "intake" && !people.length) people.push(rolePeople.admin);
  admins.add(rolePeople.admin);
  return [
    ...new Set(
      people.filter((p) => p && (binding === "intake" || !admins.has(p))),
    ),
  ];
}
export function validateWorkflow(d: WorkflowDefinition): string[] {
  const errors: string[] = [];
  const starts = d.nodes.filter((n) => n.kind === "start");
  if (starts.length !== 1) errors.push("流程必须且只能有一个发起节点");
  if (!d.nodes.some((n) => n.kind === "end" || n.kind === "terminate"))
    errors.push("请添加完成或终止节点");
  if (new Set(d.nodes.map((n) => n.id)).size !== d.nodes.length)
    errors.push("节点编号重复");
  d.edges.forEach((e) => {
    if (
      !d.nodes.some((n) => n.id === e.source) ||
      !d.nodes.some((n) => n.id === e.target)
    )
      errors.push("存在无效连线");
  });
  const reached = new Set<string>(),
    visiting = new Set<string>();
  function visit(id: string) {
    if (visiting.has(id)) {
      errors.push("流程存在循环，请移除循环连线");
      return;
    }
    if (reached.has(id)) return;
    visiting.add(id);
    d.edges.filter((e) => e.source === id).forEach((e) => visit(e.target));
    visiting.delete(id);
    reached.add(id);
  }
  if (starts.length === 1) visit(starts[0].id);
  d.nodes.forEach((n) => {
    const out = d.edges.filter((e) => e.source === n.id),
      incoming = d.edges.filter((e) => e.target === n.id);
    if (!n.name.trim()) errors.push("节点名称不能为空");
    if (!(n.binding in bindings))
      errors.push(`${n.name}：请绑定岗位或项目关系`);
    if (
      n.binding === "intake" &&
      !(n.kind === "approval" && n.name === "需求承接审批")
    )
      errors.push(`${n.name}：管理员仅可参与需求承接审批`);
    if (!reached.has(n.id)) errors.push(`${n.name}：未连接至发起节点`);
    if (n.kind === "start" && incoming.length)
      errors.push("发起节点不能有入线");
    if (["end", "terminate"].includes(n.kind) && out.length)
      errors.push(`${n.name}：结束节点不能有出线`);
    if (["condition", "approval"].includes(n.kind)) {
      if (
        out.length !== 2 ||
        out.filter((e) => e.branch === "yes").length !== 1 ||
        out.filter((e) => e.branch === "no").length !== 1
      )
        errors.push(`${n.name}：必须分别配置成立/通过、不成立/拒绝两条路径`);
    } else if (n.kind === "parallel") {
      if (out.length < 2) errors.push(`${n.name}：至少连接两个会签分支`);
    } else if (!["end", "terminate"].includes(n.kind) && out.length !== 1)
      errors.push(`${n.name}：需要一条后续路径`);
    if (n.kind === "merge" && incoming.length < 2)
      errors.push(`${n.name}：至少汇聚两条路径`);
    if (
      n.kind !== "merge" &&
      incoming.length > 1 &&
      !["terminate", "end"].includes(n.kind)
    )
      errors.push(`${n.name}：多条路径请先使用汇聚节点`);
    if (n.kind === "condition") {
      if (!n.field || !n.operator || !n.value?.trim())
        errors.push(`${n.name}：请完整设置条件`);
      if (
        n.field === "amount" &&
        (!Number.isFinite(Number(n.value)) || Number(n.value) < 0)
      )
        errors.push(`${n.name}：金额必须为非负数`);
      if (n.field !== "amount" && n.operator !== "eq")
        errors.push(`${n.name}：优先级和交付阶段仅支持等于`);
    }
  });
  return [...new Set(errors)];
}
