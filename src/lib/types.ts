export type Role = "sales" | "product" | "dev" | "admin";
export type Page =
  | "customers"
  | "projects"
  | "chat"
  | "groups"
  | "notifications"
  | "approvals"
  | "audit"
  | "security"
  | "runtimes"
  | "skills";
export type Stage =
  | "demand"
  | "approval"
  | "declined"
  | "solution"
  | "development"
  | "feedback"
  | "delivered";
export interface Customer {
  id: string;
  name: string;
  short: string;
  industry: string;
  contact: string;
  position: string;
  phone: string;
  email: string;
  owner: string;
  status: string;
  amount: number;
  color: string;
  lastContact: string;
  description: string;
}
export interface Visit {
  category: "销售拜访" | "客户会议";
  organizer: string;
  participants: string[];
  id: string;
  customerId: string;
  title: string;
  date: string;
  duration: string;
  person: string;
  transcript: { time: string; speaker: string; text: string }[];
}
export interface Project {
  assignmentSteps?: {
    role: "product" | "dev";
    names: string[];
    round: number;
  }[];
  deliveryMode?: "once" | "batch";
  nextDelivery?: string;
  deliveryInfo?: string;
  attachments?: Partial<
    Record<
      "requirement" | "document" | "data",
      { id: string; name: string; size: number; data: string }[]
    >
  >;
  id: string;
  name: string;
  customerId: string;
  stage: Stage;
  phase: "sample" | "full";
  round: number;
  priority: string;
  due: string;
  amount: number;
  owner: string;
  product: string;
  developers: string[];
  description: string;
  document: string;
  docAccepted: boolean;
  qualityPassed: boolean;
  history: { time: string; title: string; detail: string; actor: string }[];
  members: string[];
  versions?: {
    round: number;
    phase: "sample" | "full";
    document: string;
    time: string;
  }[];
}
export interface Message {
  id: string;
  sender: string;
  content: string;
  time: string;
  kind?: "system" | "agent" | "user";
}
export interface Session {
  pinned?: boolean;
  archived?: boolean;
  id: string;
  name: string;
  kind: "agent" | "group";
  role: Role;
  projectId?: string;
  runtimeId?: string;
  provider?: string;
  model?: string;
  preview: string;
  time: string;
  unread: number;
  messages: Message[];
  members: string[];
  round?: number;
}
export interface Notice {
  id: string;
  title: string;
  body: string;
  time: string;
  type: "flow" | "approval" | "delivery";
  roles: Role[];
  projectId?: string;
  read: boolean;
  approved?: boolean;
}
export interface Audit {
  id: string;
  time: string;
  actor: string;
  action: string;
  resource: string;
  result: string;
  kind: "human" | "agent";
}
export interface Policy {
  cloudRuntimeIds?: string[];
  customerAccess?: "read" | "edit";
  projectAccess?: "read" | "edit";
  assign?: boolean;
  cloudManage?: boolean;
  productionWrite?: boolean;
  customers?: boolean;
  projects?: boolean;
  approval?: boolean;
  id: string;
  name: string;
  type: "human" | "agent";
  role: string;
  production: boolean;
  workspace: boolean;
}
export interface GroupAttachment {
  id: string;
  name: string;
  size: number;
  data: string;
}
export interface GroupMessage {
  id: string;
  sender: string;
  text: string;
  attachments: GroupAttachment[];
  replyToId?: string;
  createdAt: string;
}
export interface GroupChat {
  id: string;
  name: string;
  projectId?: string;
  members: string[];
  createdBy: string;
  createdAt: string;
  messages: GroupMessage[];
}
export interface State {
  groupChats: GroupChat[];
  customers: Customer[];
  projects: Project[];
  sessions: Session[];
  notices: Notice[];
  audits: Audit[];
  policies: Policy[];
}
export const roleLabels: Record<Role, string> = {
  sales: "销售视角",
  product: "产品视角",
  dev: "研发视角",
  admin: "管理视角",
};
export const rolePeople: Record<Role, string> = {
  sales: "林晓",
  product: "陈思远",
  dev: "张晨",
  admin: "王博升",
};
export const stageLabels: Record<Stage, string> = {
  demand: "已创建",
  approval: "待管理员审批",
  declined: "不承接",
  solution: "方案设计中",
  development: "研发实施中",
  feedback: "待客户反馈",
  delivered: "已交付",
};
export const runtimeList = [
  {
    id: "local-office-windows",
    name: "本地 · 办公室的Windows",
    device: "办公室 · Windows",
    agents: ["Codex", "Claude Code", "DeepSeek Harness"],
    online: false,
    local: true,
  },
  {
    id: "cloud-product",
    name: "云端 · 产品设计助手",
    device: "公司云端",
    agents: ["Codex", "Claude Code", "DeepSeek Harness"],
    online: true,
    local: false,
  },
  {
    id: "cloud-01",
    name: "云端 · 通用助手",
    device: "公司云端沙箱",
    agents: ["Codex", "Claude Code", "DeepSeek Harness"],
    online: true,
    local: false,
  },
  {
    id: "cloud-02",
    name: "云端 · 数据开发",
    device: "公司云端沙箱",
    agents: ["Codex", "Claude Code", "DeepSeek Harness"],
    online: true,
    local: false,
  },
  {
    id: "local-01",
    name: "本地 · 我的 MacBook Pro",
    device: "当前工作设备",
    agents: ["Codex", "Claude Code", "DeepSeek Harness"],
    online: true,
    local: true,
  },
  {
    id: "local-02",
    name: "本地 · 家里的Macmini",
    device: "家里 · macOS",
    agents: ["Codex", "Claude Code", "DeepSeek Harness"],
    online: false,
    local: true,
  },
];
export const providerModels: Record<string, string[]> = {
  Codex: ["默认模型", "高推理配置"],
  "Claude Code": ["默认模型", "快速配置"],
  "DeepSeek Harness": ["默认模型", "推理配置"],
};
export const roleSkills: Record<Role, string[]> = {
  sales: ["客户洞察", "拜访复盘", "需求提炼"],
  product: ["需求拆解", "方案编写", "字段定义"],
  dev: ["数据开发", "数据治理", "质量检验"],
  admin: ["经营分析", "风险识别", "资源调度"],
};

export function canSeeRuntime(
  role: Role,
  runtime: { id: string; local: boolean },
  policies?: Policy[],
) {
  if (runtime.local) return true;
  const policy = policies?.find(
    (p) => p.type === "human" && p.name === rolePeople[role],
  );
  if (policy?.cloudRuntimeIds !== undefined)
    return policy.cloudRuntimeIds.includes(runtime.id);
  if (role === "admin") return true;
  return role === "sales"
    ? runtime.id === "cloud-01"
    : ["cloud-product", "cloud-02"].includes(runtime.id);
}

export function assignedCloudRuntimes(policy: Policy): string[] {
  if (policy.cloudRuntimeIds !== undefined) return policy.cloudRuntimeIds;
  return runtimeList
    .filter(
      (r) =>
        !r.local &&
        (policy.role === "管理" ||
          policy.role === "管理员" ||
          (policy.role === "销售"
            ? r.id === "cloud-01"
            : ["cloud-product", "cloud-02"].includes(r.id))),
    )
    .map((r) => r.id);
}
