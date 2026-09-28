import { roleContent } from "./agent-role-content";
import type { Session, Role } from "./types";
export function dataDemo(role: Role): Session {
  return {
    id: `data-demo-${role}`,
    name: "企业数据整理与测试库清洗",
    kind: "agent",
    role,
    provider: "Codex",
    model: "GPT-6",
    runtimeId: "cloud-02",
    pinned: true,
    members: [],
    unread: 0,
    time: "10:36",
    preview: "数据清洗完成",
    messages: [
      {
        id: "demo-user",
        kind: "user",
        sender: "我",
        time: "10:30",
        content:
          "连接云端数据库，读取线上企业数据，整理字段后在测试库完成数据清洗。先给我 50 条样例，并检查质量。",
      },
      {
        id: "demo-plan",
        kind: "agent",
        sender: "Codex",
        time: "10:30",
        content:
          "我会先检查源表结构，以只读方式提取线上数据，再把清洗操作放在测试库中完成。\n\n1. 读取企业基础信息与经营状态\n2. 统一字段名称、日期和地区编码\n3. 根据统一社会信用代码去重\n4. 写入测试库并生成质量报告",
      },
      {
        id: "demo-tools",
        kind: "system",
        sender: "系统",
        time: "10:32",
        content:
          "✓ 连接云端生产库 · 只读\n✓ 读取 enterprise_profile · 50,000 条\n✓ 创建测试表 workspace.enterprise_clean\n✓ 完成去重、空值处理与字段标准化",
      },
      {
        id: "demo-result",
        kind: "agent",
        sender: "Codex",
        time: "10:36",
        content:
          "数据整理与清洗已完成。\n\n从 50,000 条源数据中移除了 128 条重复记录，测试库保留 49,872 条有效数据。修复了 316 处日期格式，统一了地区编码与注册资本单位。\n\n质量检查\n• 信用代码唯一率：100%\n• 必填字段完整率：100%\n• 日期格式一致率：100%\n• 地区编码有效率：100%\n\n已准备 50 条样例，可继续调整清洗规则，或生成交付说明。\n\n以上为演示数据，未实际连接数据库。",
      },
    ],
  };
}

export function demoSessions(role: Role): Session[] {
  const content = roleContent[role];
  const titles = content.titles;
  const agents = [
    { provider: "Codex", model: "GPT-6" },
    { provider: "Claude Code", model: "Claude Sonnet" },
    { provider: "DeepSeek Harness", model: "DeepSeek" },
  ];
  return titles.map((name, index) => {
    const base = dataDemo(role);
    const agent = agents[index % agents.length];
    return {
      ...base,
      ...agent,
      id: index === 0 ? base.id : `data-demo-${role}-${index + 1}`,
      name,
      pinned: index < 3,
      preview: content.result,
      messages: [
        {
          id: "demo-user",
          kind: "user",
          sender: "我",
          time: "10:30",
          content: `关于「${name}」，${content.request}`,
        },
        {
          id: "demo-plan",
          kind: "agent",
          sender: agent.provider,
          time: "10:30",
          content: content.plan,
        },
        {
          id: "demo-tools",
          kind: "system",
          sender: "系统",
          time: "10:32",
          content: content.steps,
        },
        {
          id: "demo-result",
          kind: "agent",
          sender: agent.provider,
          time: "10:36",
          content: `「${name}」\n\n${content.result}\n\n以上为演示内容，未执行真实任务。`,
        },
      ],
    };
  });
}
