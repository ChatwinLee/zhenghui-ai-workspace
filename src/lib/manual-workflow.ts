import { rolePeople, type State } from "./types";
// Normalize older demo snapshots without changing independent Agent conversations.
export function manualWorkflow(state: State): State {
  delete (state as State & { exportRequests?: unknown }).exportRequests;
  state.notices = state.notices.filter((n) => !/导出/.test(n.title + n.body));
  state.audits = state.audits.filter((a) => !/导出/.test(a.action));
  state.policies.forEach((p) => {
    delete (p as typeof p & { export?: boolean }).export;
  });
  const clean = (text: string) =>
    text
      .replace(/云端 Agent 已生成方案初稿。?/g, "产品负责人工编写方案。")
      .replace(
        /自动创建项目群，销售与产品已加入。?/g,
        "销售已提交需求，管理员确认承接后交给产品处理。",
      )
      .replace(/指派研发 · Agent 完成预处理/g, "指派研发 · 人工处理")
      .replace(
        /读取生产数据，在测试 Workspace 清洗并完成质量检验。/g,
        "研发人工整理数据、完成质量检查并填写交付信息。",
      )
      .replace(/需求已提交，方案初稿已生成/g, "需求已提交")
      .replace(/已指派研发，Agent 预处理完成/g, "已指派研发，等待人工处理")
      .replace(
        /演示 Agent 已完成字段映射、测试库清洗和质量校验，等待研发人工审核。/g,
        "研发负责人工整理数据、检查质量并维护交付信息。",
      )
      .replace(
        /云端 Agent 已依据产品 Skill 生成方案，等待产品确认。/g,
        "产品负责人工编写并确认方案。",
      )
      .replace(
        /方案已退回，Agent 已重新生成初稿/g,
        "方案已退回，等待产品人工修改",
      )
      .replace(
        /产品退回了初稿，云端 Agent 已重新生成待确认版本。/g,
        "产品正在人工修改方案。",
      );
  const demoState = state as State & { assignmentDemoVersion?: number };
  if (demoState.assignmentDemoVersion !== 1) {
    const demo = state.projects.find((p) => p.id === "ZH-2026-0921");
    if (demo) {
      demo.stage = "solution";
      demo.docAccepted = true;
      demo.developers = [];
      demo.qualityPassed = false;
      demo.history = demo.history.filter(
        (h) => !/自己承接研发任务|将研发任务|指派研发|交付结果/.test(h.title),
      );
      if (!demo.history.some((h) => h.title === "方案设计完成，待安排承接人")) {
        demo.history.push({
          time: "09-22 09:00",
          title: "方案设计完成，待安排承接人",
          detail: "方案已确认，产品可选择自己承接或指派一位、多位研发人员。",
          actor: demo.product,
        });
      }
      state.notices = state.notices.filter(
        (n) =>
          n.projectId !== demo.id ||
          !/自己承接研发任务|将研发任务|指派研发/.test(n.title),
      );
    }
    demoState.assignmentDemoVersion = 1;
  }
  state.projects.forEach((p) => {
    p.members = p.members.filter((m) => !m.includes("Agent"));
    p.history = p.history.map((h) => ({
      ...h,
      title:
        h.title === "需求流转至产品" || h.title === "审批通过，承接项目"
          ? `${h.title === "需求流转至产品" ? rolePeople.admin : h.actor}审批通过，决定承接`
          : clean(h.title),
      detail:
        h.title === "需求流转至产品"
          ? "管理员审批通过，决定承接项目，交由产品人工编写方案。"
          : clean(h.detail),
      actor:
        h.title === "需求流转至产品"
          ? rolePeople.admin
          : h.actor.includes("Agent")
            ? p.product || p.owner
            : h.actor,
    }));
  });
  state.sessions = state.sessions.filter(
    (s) => !(s.projectId && s.round !== undefined),
  );
  state.notices = state.notices.filter(
    (n) => !(n.projectId && n.type === "approval"),
  );
  state.notices.forEach((n) => {
    if (!n.projectId) return;
    n.title = clean(n.title);
    n.body = clean(n.body).replace(
      "的产品方案已由云端 Agent 生成，请确认字段与验收标准。",
      "的方案信息待产品人工整理，请确认字段与验收标准。",
    );
  });
  state.audits = state.audits.filter(
    (a) =>
      !(a.kind === "agent" && state.projects.some((p) => p.id === a.resource)),
  );
  return state;
}
