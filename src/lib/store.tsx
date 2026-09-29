import { initializeGroups, syncProjectGroup } from "./group-chat";
import { manualWorkflow } from "./manual-workflow";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { initialState } from "./data";
import { migrateDemo } from "./migrate-demo";
import type { Customer, Project, Role, Session, State } from "./types";
import { rolePeople } from "./types";
import { now, uid } from "./utils";
const STORAGE_KEY = "zhenghui-workspace-v1";
function load(): State {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) {
      const parsed = JSON.parse(s);
      if (
        parsed.customers &&
        parsed.projects &&
        parsed.policies &&
        parsed.sessions
      )
        return initializeGroups(
          manualWorkflow(migrateDemo(parsed, initialState)),
        );
    }
  } catch {
    /* Recover from unavailable storage or an invalid demo snapshot. */
  }
  return initializeGroups(manualWorkflow(structuredClone(initialState)));
}
type Action =
  | "approve"
  | "decline"
  | "submit"
  | "accept"
  | "reject"
  | "selfAssign"
  | "handoff"
  | "assign"
  | "deliver"
  | "revise"
  | "sign";
interface Store {
  state: State;
  role: Role;
  setRole: (r: Role) => void;
  update: (fn: (s: State) => void, action?: string, resource?: string) => void;
  transition: (
    id: string,
    action: Action,
    people?: string[],
    note?: string,
  ) => boolean;
  addCustomer: (c: Omit<Customer, "id">) => void;
  addProject: (
    p: Pick<
      Project,
      "name" | "customerId" | "description" | "due" | "phase" | "priority"
    >,
  ) => string;
  addSession: (
    s: Omit<
      Session,
      "id" | "messages" | "preview" | "time" | "unread" | "members"
    >,
  ) => string;
  send: (id: string, text: string) => void;
  reset: () => void;
}
const Context = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(load);
  const [role, setRole] = useState<Role>("sales");
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      toast.error("浏览器存储不可用，本次操作仍保留在当前页面");
    }
  }, [state]);
  function update(
    fn: (s: State) => void,
    action?: string,
    resource = "工作台",
  ) {
    setState((prev) => {
      const s = structuredClone(prev);
      fn(s);
      if (action)
        s.audits.unshift({
          id: uid(),
          time: new Date().toLocaleString("sv-SE"),
          actor: rolePeople[role],
          action,
          resource,
          result: "成功",
          kind: "human",
        });
      return s;
    });
  }
  function transition(
    id: string,
    action: Action,
    people: string[] = [],
    note = "",
  ) {
    const p = state.projects.find((p) => p.id === id);
    if (!p) return false;
    const allowed =
      role === "admin" ||
      (!["approve", "decline"].includes(action) &&
        (["submit", "revise", "sign"].includes(action)
          ? role === "sales"
          : ["accept", "reject", "assign", "selfAssign", "handoff"].includes(
                action,
              )
            ? role === "product"
            : (role === "dev" || role === "product") &&
              p.developers.includes(rolePeople[role])));
    if (!allowed) {
      toast.error("请切换到对应角色处理此环节");
      return false;
    }
    const valid =
      action === "handoff"
        ? p.stage === "development" &&
          (role === "admin" || p.developers.includes(rolePeople[role]))
        : ["approve", "decline"].includes(action)
          ? p.stage === "approval"
          : action === "submit"
            ? p.stage === "demand"
            : ["accept", "reject", "assign", "selfAssign"].includes(action)
              ? p.stage === "solution"
              : action === "deliver"
                ? p.stage === "development"
                : p.stage === "feedback";
    if (!valid) {
      toast.error("当前项目状态已变化，请检查后重试");
      return false;
    }
    if (
      ["assign", "handoff", "selfAssign"].includes(action) &&
      (!p.docAccepted || (action !== "selfAssign" && !people.length))
    ) {
      toast.error("请先确认方案，并至少选择一位研发");
      return false;
    }
    if (action === "accept" && !p.document.trim()) {
      toast.error("请先填写并保存方案信息");
      return false;
    }
    if (action === "deliver" && !p.deliveryInfo?.trim()) {
      toast.error("请先填写并保存交付信息，再确认交付");
      return false;
    }
    const titles: Record<Action, string> = {
      submit: "需求已提交，等待管理员审批",
      approve: `${rolePeople[role]}审批通过，决定承接`,
      decline: "审批未通过，不承接项目",
      accept: "产品方案已确认",
      reject: "方案已退回，等待产品人工修改",
      assign: `${rolePeople[role]}将研发任务指派给${people.join("、")}`,
      selfAssign: `${rolePeople[role]}自己承接研发任务`,
      handoff: `${rolePeople[role]}将研发任务转交给${people.join("、")}`,
      deliver:
        p.phase === "sample" ? "样例已交付，等待客户反馈" : "正式数据已交付",
      revise: "客户反馈已记录，启动下一轮样例",
      sign: "已确认签单，启动正式交付流程",
    };
    update(
      (s) => {
        const project = s.projects.find((x) => x.id === id)!;
        let target: Role[] = [];
        let body = "";
        if (action === "submit") {
          project.stage = "approval";
          target = ["admin"];
          body = "销售已提交需求，请管理员审批是否承接。";
        }
        if (action === "decline") {
          project.stage = "declined";
          target = ["sales"];
          body = "管理员审批未通过，本项目不承接。";
        }
        if (action === "approve") {
          project.stage = "solution";
          project.members = Array.from(
            new Set([...project.members, project.product]),
          );
          target = ["product"];
          body = "管理员已审批承接，请产品填写方案信息。";
        }
        if (action === "accept") project.docAccepted = true;
        if (action === "reject") {
          project.docAccepted = false;
          body = "方案已退回，请产品人工修改后重新确认。";
        }
        if (["assign", "selfAssign", "handoff"].includes(action)) {
          const assignees =
            action === "selfAssign" ? [rolePeople[role]] : people;
          project.stage = "development";
          project.assignmentSteps ??= [];
          if (
            action === "handoff" &&
            !project.assignmentSteps.some(
              (step) => step.round === project.round,
            ) &&
            project.developers.length
          ) {
            project.assignmentSteps.push({
              role: project.developers.includes(project.product)
                ? "product"
                : "dev",
              names: [...project.developers],
              round: project.round,
            });
          }
          project.assignmentSteps.push({
            role: action === "selfAssign" ? "product" : "dev",
            names: [...assignees],
            round: project.round,
          });
          project.developers = assignees;
          project.members = Array.from(
            new Set([...project.members, ...assignees]),
          );
          project.qualityPassed = false;
          target = action === "selfAssign" ? ["product"] : ["dev"];
          body =
            note.trim() ||
            "由当前承接人处理任务、检查质量并维护交付信息，已有内容和附件保留。";
        }
        if (action === "deliver") {
          project.qualityPassed = true;
          project.stage = project.phase === "sample" ? "feedback" : "delivered";
          target = ["sales", "product"];
          body =
            project.phase === "sample"
              ? "本轮 50 条样例已审核交付，请将结果同步给客户并记录反馈。"
              : "本轮 50,000 条正式数据已通过审核并完成交付。";
        }
        if (action === "revise" || action === "sign") {
          project.versions = [
            ...(project.versions || []),
            {
              round: project.round,
              phase: project.phase,
              document: project.document,
              time: now(),
            },
          ];
          project.round++;
          project.phase = action === "sign" ? "full" : "sample";
          project.stage = "solution";
          project.docAccepted = false;
          project.qualityPassed = false;
          project.document = "";
          project.deliveryInfo = "";
          if (project.attachments) {
            project.attachments.document = [];
            project.attachments.data = [];
          }
          target = ["product"];
          body = `在原项目下启动第 ${project.round} 轮${action === "sign" ? "正式交付" : "样例迭代"}，历史消息与文档保留。`;
          if (action === "sign") {
            const c = s.customers.find((c) => c.id === project.customerId);
            if (c) c.status = "已成交";
          }
        }
        syncProjectGroup(s, project);
        project.history.unshift({
          time: `09-22 ${now()}`,
          title: titles[action],
          detail: body || `由${rolePeople[role]}操作`,
          actor: rolePeople[role],
        });
        if (target.length)
          s.notices.unshift({
            id: uid(),
            title: titles[action],
            body,
            time: `今天 ${now()}`,
            type: action === "deliver" ? "delivery" : "flow",
            roles: target,
            projectId: id,
            read: false,
          });
      },
      titles[action],
      id,
    );
    toast.success(titles[action]);
    return true;
  }
  function addCustomer(customer: Omit<Customer, "id">) {
    update(
      (s) => {
        s.customers.unshift({ ...customer, id: uid() });
      },
      "创建客户",
      customer.name,
    );
    toast.success("客户已添加");
  }
  function addProject(
    input: Pick<
      Project,
      "name" | "customerId" | "description" | "due" | "phase" | "priority"
    >,
  ) {
    const id = `ZH-2026-${String(state.projects.length + 922).padStart(4, "0")}`;
    update(
      (s) => {
        s.projects.unshift({
          ...input,
          id,
          stage: "demand",
          round: 1,
          amount: 0,
          owner: rolePeople[role],
          product: "陈思远",
          developers: [],
          document: "",
          docAccepted: false,
          qualityPassed: false,
          history: [
            {
              time: `09-22 ${now()}`,
              title: "创建客户需求",
              detail: input.description,
              actor: rolePeople[role],
            },
          ],
          members: [rolePeople[role]],
        });
      },
      "创建需求",
      id,
    );
    toast.success("需求已创建");
    return id;
  }
  function addSession(
    input: Omit<
      Session,
      "id" | "messages" | "preview" | "time" | "unread" | "members"
    >,
  ) {
    const id = uid();
    update(
      (s) => {
        s.sessions.unshift({
          ...input,
          id,
          preview: "新会话已就绪",
          time: now(),
          unread: 0,
          members: [],
          messages: [
            {
              id: uid(),
              sender: "AI 助手",
              kind: "agent",
              content: `你好，${rolePeople[role]}。会话已创建。\n\n运行时：${input.runtimeId}\nAgent：${input.provider} · ${input.model}\n\n告诉我你想完成的工作。当前为交互演示，将使用预置回复。`,
              time: now(),
            },
          ],
        });
      },
      "创建 Agent 会话",
      input.name,
    );
    return id;
  }
  function send(id: string, text: string) {
    const session = state.sessions.find((x) => x.id === id);
    if (!session || session.kind !== "agent" || !text.trim()) return;
    update(
      (s) => {
        const x = s.sessions.find((x) => x.id === id)!;
        x.messages.push({
          id: uid(),
          sender: rolePeople[role],
          kind: "user",
          content: text.trim(),
          time: now(),
        });
        x.preview = text.trim();
        x.time = now();
      },
      "发送会话消息",
      session.name,
    );
    if (session.kind === "agent") {
      const agent =
        session.role === "dev"
          ? "数据开发 Agent"
          : session.role === "product"
            ? "产品方案 Agent"
            : "销售助手";
      const agentPolicy = state.policies.find((p) => p.name === agent);
      const workerRole = agent.includes("数据开发")
        ? "dev"
        : agent.includes("产品方案")
          ? "product"
          : session.role;
      let reply =
        workerRole === "dev"
          ? "已根据你的补充检查当前字段映射与质量规则。\n\n演示结果：必填字段完整率 100%、信用代码唯一率 100%、地区格式一致率 100%、注册资本有效率 100%。\n建议下载样例并人工复核，确认后在项目中交付。"
          : workerRole === "product"
            ? "已整理你的方案补充。建议在产品文档中明确：\n1. 数据范围与筛选条件；\n2. 字段定义及转换规则；\n3. 交付数量和质量验收标准。\n\n你可以打开关联项目，直接编辑并确认方案。"
            : "根据当前示例客户资料与《数据服务交付规范》KB-002：\n\n1. 先确认字段清单、筛选范围和交付时间。\n2. 以 50 条样例验证需求，确认后进入正式交付。\n3. 联系方式的可用性需核实授权，不能提前承诺覆盖率。\n\n建议将这次沟通整理为需求，并关联到客户项目。";
      if (text.includes("生产") && agentPolicy && !agentPolicy.production)
        reply =
          "本次请求已被权限策略拦截：当前 Agent 无生产数据库读取权限。请由授权的研发 Agent 在项目范围内处理。";
      setTimeout(
        () =>
          update((s) => {
            const x = s.sessions.find((x) => x.id === id);
            if (!x) return;
            x.messages.push({
              id: uid(),
              sender: agent,
              kind: "agent",
              content: reply + "\n\n以上为 Demo 预置回复，未执行真实模型任务。",
              time: now(),
            });
            x.preview = reply.slice(0, 40);
            x.time = now();
            s.audits.unshift({
              id: uid(),
              time: new Date().toLocaleString("sv-SE"),
              actor: agent,
              action: reply.includes("拦截")
                ? "权限检查"
                : "Agent 回复（演示）",
              resource: session.name,
              result: reply.includes("拦截") ? "已拦截" : "成功",
              kind: "agent",
            });
          }),
        700,
      );
    }
  }
  return (
    <Context.Provider
      value={{
        state,
        role,
        setRole,
        update,
        transition,
        addCustomer,
        addProject,
        addSession,
        send,
        reset: () => {
          setState(
            initializeGroups(manualWorkflow(structuredClone(initialState))),
          );
          toast.success("演示数据已重置");
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useStore() {
  const c = useContext(Context);
  if (!c) throw new Error("Missing StoreProvider");
  return c;
}
