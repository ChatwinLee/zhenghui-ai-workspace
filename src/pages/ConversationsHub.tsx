import { SessionAgentIcon } from "../components/SessionAgentIcon";
import { useEffect, useState } from "react";
import { ArrowLeft, MessageCircle, Plus, Users } from "lucide-react";
import { useStore } from "../lib/store";
import { canViewGroup, createGroup, enterprisePeople } from "../lib/group-chat";
import { rolePeople } from "../lib/types";
import { cn } from "../lib/utils";
import AgentWorkspace from "./AgentWorkspace";
import { GroupDetail } from "./GroupChats";
import { Button } from "../components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { SidebarTrigger } from "../components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "../components/ui/field";
import { Input } from "../components/ui/input";
import { Checkbox } from "../components/ui/checkbox";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "../components/ui/empty";

type Selection = { kind: "agent" | "group"; id: string };
export default function ConversationsHub({
  sessionId,
  onSession,
  onProject,
}: {
  sessionId: string;
  onSession: (id: string) => void;
  onProject: (id: string) => void;
}) {
  const { state, role, update } = useStore();
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Selection>({
    kind: "agent",
    id: sessionId,
  });
  const [mobileDetail, setMobileDetail] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  useEffect(() => {
    setSelected({ kind: "agent", id: sessionId });
  }, [sessionId]);
  const agents = state.sessions.filter(
    (s) =>
      s.kind === "agent" &&
      !s.archived &&
      (role === "admin" || s.role === role),
  );
  const groups = state.groupChats.filter((g) => canViewGroup(g, role));
  const rows = [
    ...agents.map((s) => ({
      id: s.id,
      kind: "agent" as const,
      provider: s.provider || "Codex",
      name: s.name,
      preview: s.preview,
    })),
    ...groups.map((g) => ({
      id: g.id,
      kind: "group" as const,
      provider: "",
      name: g.name,
      preview:
        g.messages.at(-1)?.text ||
        (g.messages.at(-1)?.attachments.length ? "[附件]" : "暂无消息"),
    })),
  ].filter((r) => filter === "all" || r.kind === filter);
  const group =
    selected.kind === "group"
      ? groups.find((g) => g.id === selected.id)
      : undefined;
  const visibleDetail = filter === "all" || selected.kind === filter;
  function openAgent(id: string) {
    setSelected({ kind: "agent", id });
    onSession(id);
    setMobileDetail(true);
  }
  function addGroup() {
    const group = createGroup(structuredClone(state), role, name, members);
    if (!group) return;
    update(
      (s) => {
        s.groupChats.unshift(group);
      },
      "创建群聊",
      group.name,
    );
    setSelected({ kind: "group", id: group.id });
    setFilter("all");
    setMobileDetail(true);
    setCreating(false);
    setName("");
    setMembers([]);
  }
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
        <SidebarTrigger />
        <span className="font-medium">会话</span>
        <Tabs
          value={filter}
          onValueChange={(value) => {
            setFilter(value);
            setMobileDetail(false);
          }}
        >
          <TabsList aria-label="会话筛选">
            <TabsTrigger value="all">全部</TabsTrigger>
            <TabsTrigger value="agent">Agent 会话</TabsTrigger>
            <TabsTrigger value="group">群聊</TabsTrigger>
          </TabsList>
        </Tabs>
      </header>
      <div className="flex min-h-0 min-w-0 flex-1">
        <section
          aria-label="会话列表"
          className={cn(
            "flex min-h-0 w-full shrink-0 flex-col border-r md:w-72",
            mobileDetail && "hidden md:flex",
          )}
        >
          <div className="flex flex-wrap gap-2 p-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setFilter("all");
                openAgent("");
              }}
            >
              <Plus data-icon="inline-start" />
              Agent 会话
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCreating(true)}
            >
              <Plus data-icon="inline-start" />
              创建群聊
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
            {rows.map((row) => (
              <Button
                key={`${row.kind}-${row.id}`}
                variant={
                  selected.kind === row.kind && selected.id === row.id
                    ? "secondary"
                    : "ghost"
                }
                className="mb-1 h-auto w-full justify-start gap-3 py-3"
                onClick={() => {
                  if (row.kind === "agent") openAgent(row.id);
                  else {
                    setSelected(row);
                    setMobileDetail(true);
                  }
                }}
              >
                <Avatar>
                  <AvatarFallback>
                    {row.kind === "agent" ? (
                      <SessionAgentIcon runtime={row.provider} />
                    ) : (
                      <Users />
                    )}
                  </AvatarFallback>
                </Avatar>
                <span className="flex min-w-0 flex-1 flex-col gap-1 text-left">
                  <span className="truncate">{row.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {row.preview}
                  </span>
                </span>
                <Badge variant="outline">
                  {row.kind === "agent" ? "Agent" : "群聊"}
                </Badge>
              </Button>
            ))}
            {!rows.length && (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>暂无会话</EmptyTitle>
                  <EmptyDescription>创建会话或选择其他筛选。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>
        </section>
        <div
          className={cn(
            "min-h-0 min-w-0 flex-1 flex-col",
            mobileDetail ? "flex" : "hidden md:flex",
          )}
        >
          <Button
            variant="ghost"
            className="self-start md:hidden"
            onClick={() => setMobileDetail(false)}
          >
            <ArrowLeft data-icon="inline-start" />
            返回会话列表
          </Button>
          {visibleDetail && selected.kind === "agent" ? (
            <AgentWorkspace
              hideList
              sessionId={selected.id}
              onSession={openAgent}
            />
          ) : visibleDetail && group ? (
            <GroupDetail
              key={group.id}
              group={group}
              onBack={() => setMobileDetail(false)}
              onProject={onProject}
            />
          ) : (
            <Empty>
              <EmptyHeader>
                <MessageCircle />
                <EmptyTitle>选择一个会话</EmptyTitle>
                <EmptyDescription>
                  在同一列表中查看 Agent 会话与群聊。
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      </div>
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-h-[85svh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>创建群聊</DialogTitle>
            <DialogDescription>
              选择企业成员，创建人自动加入。
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="new-group-name">群聊名称</FieldLabel>
              <Input
                id="new-group-name"
                value={name}
                maxLength={80}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <FieldSet>
              <FieldLegend>选择成员</FieldLegend>
              <FieldGroup>
                {enterprisePeople(state).map((person, i) => (
                  <Field key={person} orientation="horizontal">
                    <Checkbox
                      id={`member-${i}`}
                      disabled={person === rolePeople[role]}
                      checked={
                        person === rolePeople[role] || members.includes(person)
                      }
                      onCheckedChange={(v) =>
                        setMembers((old) =>
                          v === true
                            ? [...old, person]
                            : old.filter((p) => p !== person),
                        )
                      }
                    />
                    <FieldLabel htmlFor={`member-${i}`}>
                      {person}
                      {person === rolePeople[role] ? "（我）" : ""}
                    </FieldLabel>
                  </Field>
                ))}
              </FieldGroup>
            </FieldSet>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>
              取消
            </Button>
            <Button
              disabled={!name.trim() || !members.length}
              onClick={addGroup}
            >
              确认创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
