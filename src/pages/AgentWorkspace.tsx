import { AgentWelcome } from "../components/AgentWelcome";
import { roleContent } from "../lib/agent-role-content";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Plus,
  Pin,
  PinOff,
  Archive,
  ChevronDown,
  Copy,
  Paperclip,
  Folder,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "../lib/store";
import { runtimeList, canSeeRuntime, type Session } from "../lib/types";
import { demoSessions } from "../lib/agent-demo";
import { SessionAgentIcon } from "../components/SessionAgentIcon";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { ScrollArea } from "../components/ui/scroll-area";
import { SidebarTrigger } from "../components/ui/sidebar";
import { Choice } from "../components/shared";
import {
  InputGroup,
  InputGroupTextarea,
  InputGroupAddon,
  InputGroupButton,
} from "../components/ui/input-group";
import { Message, MessageContent } from "../components/ui/message";
import { Bubble, BubbleContent } from "../components/ui/bubble";
import { Marker, MarkerContent } from "../components/ui/marker";
import {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
} from "../components/ui/message-scroller";

export default function AgentWorkspace({
  sessionId,
  onSession,
}: {
  sessionId: string;
  onSession: (id: string) => void;
}) {
  const { state, role, update, addSession } = useStore();
  const [draft, setDraft] = useState("");
  const [provider, setProvider] = useState("Codex");
  const [model, setModel] = useState("GPT-6");
  const [permission, setPermission] = useState("请求批准");
  const [runtime, setRuntime] = useState("cloud-02");
  const availableRuntimes = runtimeList.filter(
    (r) => r.online && canSeeRuntime(role, r, state.policies),
  );
  const selectedRuntime = availableRuntimes.some((r) => r.id === runtime)
    ? runtime
    : availableRuntimes[0].id;
  const [mobileList, setMobileList] = useState(false);
  const [listCollapsed, setListCollapsed] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [attachment, setAttachment] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    update((s) => {
      for (const demo of demoSessions(role)) {
        const existing = s.sessions.find((session) => session.id === demo.id);
        if (!existing) {
          s.sessions.push(demo);
          continue;
        }
        existing.name = demo.name;
        existing.preview = demo.preview;
        const followups = existing.messages.filter(
          (message) => !message.id.startsWith("demo-"),
        );
        existing.messages = [...demo.messages, ...followups];
      }
    });
  }, [role]);
  useEffect(() => {
    setDraft("");
    setAttachment("");
  }, [sessionId]);
  const sessions = state.sessions.filter(
    (s) =>
      s.kind === "agent" &&
      !s.archived &&
      (role === "admin" || s.role === role),
  );
  const session = sessions.find((s) => s.id === sessionId);
  function open(id: string) {
    onSession(id);
    setMobileList(false);
  }
  function togglePin(item: Session) {
    update((s) => {
      const x = s.sessions.find((x) => x.id === item.id);
      if (x) x.pinned = !x.pinned;
    });
  }
  function archive(item: Session) {
    update((s) => {
      const x = s.sessions.find((x) => x.id === item.id);
      if (x) x.archived = true;
    });
    if (sessionId === item.id) open("");
    toast("会话已归档", {
      action: {
        label: "撤销",
        onClick: () =>
          update((s) => {
            const x = s.sessions.find((x) => x.id === item.id);
            if (x) x.archived = false;
          }),
      },
    });
  }
  function submit() {
    if (!draft.trim()) return;
    const text =
      draft.trim() +
      (attachment ? `\n[附件：${attachment} · 仅演示文件信息]` : "");
    const id =
      session?.id ??
      addSession({
        name: draft.trim().slice(0, 28),
        kind: "agent",
        role,
        provider,
        model,
        runtimeId: selectedRuntime,
      });
    update((s) => {
      const x = s.sessions.find((x) => x.id === id);
      if (!x) return;
      if (!session) x.messages = [];
      const time = new Date().toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      x.messages.push({
        id: crypto.randomUUID(),
        kind: "user",
        sender: "我",
        content: text,
        time,
      });
      const reply =
        roleContent[x.role].followup +
        "\n\n此为 Demo 预置回复，未执行真实任务。";
      x.messages.push({
        id: crypto.randomUUID(),
        kind: "agent",
        sender: x.provider || "Agent",
        content: reply,
        time,
      });
      x.preview = reply;
      x.time = time;
    });
    setDraft("");
    setAttachment("");
    open(id);
  }
  const composer = (
    <div className="w-full">
      <InputGroup className="rounded-3xl">
        <InputGroupTextarea
          aria-label="描述任务"
          placeholder={session ? "继续这项任务…" : "描述任务…"}
          className="min-h-28 px-5 pt-5"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <InputGroupAddon
          align="block-end"
          className="flex-wrap gap-2 px-4 pb-4 text-foreground"
        >
          <InputGroupButton
            size="icon-sm"
            aria-label="添加附件"
            onClick={() => fileInput.current?.click()}
          >
            <Paperclip />
          </InputGroupButton>
          {!session && (
            <div className="w-32">
              <Choice
                label="运行时"
                value={selectedRuntime}
                onChange={setRuntime}
                options={availableRuntimes.map((r) => ({
                  value: r.id,
                  label: r.name,
                }))}
              />
            </div>
          )}
          <div className="w-32">
            {session ? (
              <Badge variant="outline" className="h-8 gap-2 px-3">
                <SessionAgentIcon runtime={session.provider || "Codex"} />
                {session.provider || "Agent"}
              </Badge>
            ) : (
              <Choice
                label="Agent"
                value={session?.provider || provider}
                onChange={(v) => {
                  setProvider(v);
                  setModel(
                    v === "Codex"
                      ? "GPT-6"
                      : v === "Claude Code"
                        ? "Claude Sonnet"
                        : "DeepSeek",
                  );
                }}
                options={["Codex", "Claude Code", "DeepSeek Harness"]}
              />
            )}
          </div>
          <div className="hidden w-28 sm:block">
            <Choice
              label="权限模式"
              value={permission}
              onChange={setPermission}
              options={["请求批准", "只读模式", "自动批准"]}
            />
          </div>
          <div className="hidden w-36 lg:block">
            {session ? (
              <Badge variant="outline" className="h-8 px-3">
                {session.model || "默认模型"}
              </Badge>
            ) : (
              <Choice
                label="模型"
                value={session?.model || model}
                onChange={setModel}
                options={
                  session
                    ? [session.model || "默认模型"]
                    : provider === "Codex"
                      ? ["GPT-6", "GPT-5.5"]
                      : provider === "Claude Code"
                        ? ["Claude Sonnet", "Claude Opus"]
                        : ["DeepSeek"]
                }
              />
            )}
          </div>
          <InputGroupButton
            size="icon-sm"
            variant="default"
            className="ml-auto rounded-full"
            aria-label="发送任务"
            disabled={!draft.trim()}
            onClick={submit}
          >
            <ArrowUp />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <input
        ref={fileInput}
        hidden
        type="file"
        onChange={(e) => {
          setAttachment(e.target.files?.[0]?.name || "");
          e.target.value = "";
        }}
      />
      {attachment && (
        <Button variant="ghost" size="sm" onClick={() => setAttachment("")}>
          <Paperclip />
          {attachment}
          <X />
        </Button>
      )}
    </div>
  );
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1">
      <aside
        id="agent-session-list"
        aria-label="会话列表"
        className={`${mobileList ? "flex" : listCollapsed ? "hidden" : "hidden md:flex"} w-64 shrink-0 flex-col bg-sidebar p-3 lg:w-72`}
      >
        <div className="mb-4 flex h-10 items-center gap-2 px-1">
          <SidebarTrigger />
          <span className="font-semibold">Agent对话</span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto md:hidden"
            onClick={() => setMobileList(false)}
            aria-label="关闭会话列表"
          >
            <X />
          </Button>
        </div>
        <Button
          variant="secondary"
          className="mb-6 w-full justify-start rounded-full"
          onClick={() => open("")}
        >
          <Plus data-icon="inline-start" />
          新会话
        </Button>
        <ScrollArea className="min-h-0 flex-1 [&_[data-slot=scroll-area-viewport]>div]:!block">
          {(["置顶会话", "会话"] as const).map((label, i) => {
            const items = sessions.filter((s) => !!s.pinned === (i === 0));
            return (
              <section key={label} className="mb-5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="mb-1 justify-start"
                  onClick={() =>
                    setCollapsed((v) => ({ ...v, [label]: !v[label] }))
                  }
                  aria-expanded={!collapsed[label]}
                >
                  {label}
                  <ChevronDown
                    className={collapsed[label] ? "-rotate-90" : ""}
                  />
                </Button>
                {!collapsed[label] &&
                  items.map((item) => (
                    <div
                      key={item.id}
                      className="group relative flex items-center"
                    >
                      <Button
                        variant={item.id === sessionId ? "secondary" : "ghost"}
                        className="h-10 w-full min-w-0 justify-start gap-2 rounded-full pr-16"
                        onClick={() => open(item.id)}
                        title={item.name}
                      >
                        <SessionAgentIcon runtime={item.provider || "Codex"} />
                        <span className="truncate">{item.name}</span>
                      </Button>
                      <div className="absolute right-1 flex opacity-0 focus-within:opacity-100 group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          aria-label={
                            item.pinned
                              ? `取消置顶 ${item.name}`
                              : `置顶 ${item.name}`
                          }
                          onClick={() => togglePin(item)}
                        >
                          {item.pinned ? <PinOff /> : <Pin />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          aria-label={`归档 ${item.name}`}
                          onClick={() => archive(item)}
                        >
                          <Archive />
                        </Button>
                      </div>
                    </div>
                  ))}
                {!collapsed[label] && !items.length && (
                  <p className="px-3 py-2 text-xs text-muted-foreground">
                    {i === 0 ? "暂无置顶会话" : "暂无会话"}
                  </p>
                )}
              </section>
            );
          })}
        </ScrollArea>
      </aside>
      <div
        className={`${mobileList ? "hidden md:flex" : "flex"} min-h-0 min-w-0 flex-1 flex-col`}
      >
        <header className="flex h-14 shrink-0 items-center gap-3 px-5">
          <Button
            variant="ghost"
            size="icon"
            className="hidden shrink-0 md:inline-flex"
            aria-label={
              listCollapsed ? "展开 Agent 会话侧边栏" : "折叠 Agent 会话侧边栏"
            }
            aria-expanded={!listCollapsed}
            aria-controls="agent-session-list"
            onClick={() => setListCollapsed((value) => !value)}
          >
            {listCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="打开会话列表"
            onClick={() => setMobileList(true)}
          >
            <Menu />
          </Button>
          {session && (
            <>
              <span className="truncate font-medium">{session.name}</span>
              <Badge
                variant="secondary"
                className="hidden shrink-0 sm:inline-flex"
              >
                {session.runtimeId?.includes("local") ? "本地" : "云端"} /{" "}
                {session.provider}
              </Badge>
            </>
          )}
        </header>
        {!session ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 pb-20">
            <div className="w-full max-w-3xl">
              <AgentWelcome key={role} role={role} />
              {composer}
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Folder className="size-4" />
                {roleContent[role].workspace}{" "}
                <span className="font-mono text-xs">/workspace/{role}</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1">
              <MessageScrollerProvider
                key={session.id}
                autoScroll
                defaultScrollPosition="end"
              >
                <MessageScroller>
                  <MessageScrollerViewport>
                    <MessageScrollerContent className="mx-auto max-w-4xl gap-8 px-6 py-8">
                      {session.messages.map((m) => (
                        <MessageScrollerItem key={m.id} messageId={m.id}>
                          {m.kind === "system" ? (
                            <Marker>
                              <MarkerContent className="whitespace-pre-line">
                                {m.content}
                              </MarkerContent>
                            </Marker>
                          ) : (
                            <Message
                              align={m.kind === "user" ? "end" : "start"}
                            >
                              <MessageContent>
                                <Bubble
                                  variant={
                                    m.kind === "user" ? "secondary" : "ghost"
                                  }
                                  align={m.kind === "user" ? "end" : "start"}
                                >
                                  <BubbleContent>
                                    <p className="whitespace-pre-wrap">
                                      {m.content}
                                    </p>
                                  </BubbleContent>
                                </Bubble>
                                {m.kind !== "user" && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label="复制回复"
                                    onClick={() => {
                                      navigator.clipboard
                                        .writeText(m.content)
                                        .then(() => toast.success("已复制"))
                                        .catch(() => toast.error("复制失败"));
                                    }}
                                  >
                                    <Copy />
                                  </Button>
                                )}
                              </MessageContent>
                            </Message>
                          )}
                        </MessageScrollerItem>
                      ))}
                    </MessageScrollerContent>
                  </MessageScrollerViewport>
                  <MessageScrollerButton aria-label="跳到最新消息" />
                </MessageScroller>
              </MessageScrollerProvider>
            </div>
            <div className="mx-auto w-full max-w-4xl shrink-0 px-6 pb-4 pt-3">
              {composer}
              <p className="mt-2 text-center text-xs text-muted-foreground">
                演示会话 · 未连接真实数据库或模型
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
