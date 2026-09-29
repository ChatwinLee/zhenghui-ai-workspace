import type { GroupChat, GroupMessage, Project, Role, State } from "./types";
import { rolePeople } from "./types";
import { uid } from "./utils";

export function enterprisePeople(state: State): string[] {
  return [
    ...new Set([
      ...Object.values(rolePeople),
      "李浩",
      "王磊",
      ...state.policies.filter((p) => p.type === "human").map((p) => p.name),
      ...state.projects.flatMap((p) => [
        p.owner,
        p.product,
        ...p.developers,
        ...p.members,
      ]),
    ]),
  ].filter((name) => name && !name.includes("Agent"));
}

export function canViewGroup(group: GroupChat, role: Role) {
  return role === "admin" || group.members.includes(rolePeople[role]);
}

// Called in the same state transaction as project transitions. One group per project,
// including later handoffs and rounds; earlier participants and messages are retained.
export function syncProjectGroup(state: State, project: Project) {
  if (["demand", "approval", "declined"].includes(project.stage)) return;
  const members = [
    ...new Set([project.owner, project.product, ...project.developers]),
  ].filter(Boolean);
  state.groupChats ??= [];
  const group = state.groupChats.find((g) => g.projectId === project.id);
  if (group) {
    group.members = [...new Set([...group.members, ...members])];
    return;
  }
  state.groupChats.push({
    id: `group-${project.id}`,
    name: `${project.name} · 项目群`,
    projectId: project.id,
    members,
    createdBy: project.owner,
    messages: [],
    createdAt: new Date().toISOString(),
  });
}

export function initializeGroups(state: State): State {
  state.groupChats ??= [];
  state.projects.forEach((p) => syncProjectGroup(state, p));
  return state;
}

export function createGroup(
  state: State,
  role: Role,
  name: string,
  members: string[],
): GroupChat | null {
  const directory = enterprisePeople(state);
  const selected = [...new Set(members)].filter((m) => directory.includes(m));
  if (!name.trim() || !selected.some((m) => m !== rolePeople[role]))
    return null;
  const group: GroupChat = {
    id: uid(),
    name: name.trim(),
    createdBy: rolePeople[role],
    members: [...new Set([rolePeople[role], ...selected])],
    messages: [],
    createdAt: new Date().toISOString(),
  };
  state.groupChats.unshift(group);
  return group;
}

export function appendGroupMessage(
  state: State,
  role: Role,
  groupId: string,
  input: Pick<GroupMessage, "text" | "attachments" | "replyToId">,
): boolean {
  const group = state.groupChats.find((g) => g.id === groupId);
  // Administrators can inspect all groups but only send in groups they belong to.
  if (!group?.members.includes(rolePeople[role])) return false;
  if (!input.text.trim() && !input.attachments.length) return false;
  if (input.replyToId && !group.messages.some((m) => m.id === input.replyToId))
    return false;
  group.messages.push({
    ...input,
    id: uid(),
    sender: rolePeople[role],
    createdAt: new Date().toISOString(),
  });
  return true;
}

export const attachmentAccept =
  ".png,.jpg,.jpeg,.gif,.webp,.bmp,.heic,.doc,.docx,.pdf,.xls,.xlsx,.ppt,.pptx,.txt,.csv";
export function acceptsAttachment(name: string) {
  return attachmentAccept
    .split(",")
    .includes(`.${name.split(".").pop()?.toLowerCase()}`);
}
