import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  Bell,
  Check,
  CheckCheck,
  FileText,
  FolderKanban,
  Paperclip,
  Plus,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "../lib/store";
import { rolePeople, roleSkills, runtimeList, type Notice } from "../lib/types";
import { downloadText } from "../lib/utils";
import { Button } from "../components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../components/ui/dialog";
import { Avatar as UIAvatar, AvatarFallback } from "../components/ui/avatar";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
  InputGroupButton,
  InputGroupText,
} from "../components/ui/input-group";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageHeader,
  MessageFooter,
} from "../components/ui/message";
import { Bubble, BubbleContent } from "../components/ui/bubble";
import {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
} from "../components/ui/message-scroller";
import { Marker, MarkerContent, MarkerIcon } from "../components/ui/marker";
import {
  Attachment,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
  AttachmentActions,
  AttachmentAction,
  AttachmentGroup,
} from "../components/ui/attachment";
import { Badge, Empty, PageHeader, Tabs } from "../components/shared";
export default function Conversations({
  page,
  sessionId,
  onProject,
  onNew,
}: {
  page: string;
  sessionId: string;
  onProject: (id: string) => void;
  onNew: () => void;
}) {
  const { state, role, update, send } = useStore();
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState("all");
  const [chatTab, setChatTab] = useState("messages");
  const [approval, setApproval] = useState<Notice | null>(null);
  const [typing, setTyping] = useState(false);
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const session = state.sessions.find(
    (s) =>
      s.id === sessionId &&
      s.kind === "agent" &&
      (role === "admin" || s.role === role),
  );
  const project = state.projects.find((p) => p.id === session?.projectId);
  const notices = state.notices.filter(
    (n) => role === "admin" || n.roles.includes(role),
  );
  const pendingProjects = state.projects.filter(
    (p) =>
      (role === "admin" && p.stage === "approval") ||
      (role === "product" && p.stage === "solution") ||
      ((role === "product" || role === "dev") &&
        p.stage === "development" &&
        p.developers.includes(rolePeople[role])) ||
      (role === "sales" && ["demand", "feedback"].includes(p.stage)),
  );
  const pendingLabel = (stage: string) =>
    stage === "approval"
      ? "审批是否承接"
      : stage === "solution"
        ? "完善方案并安排承接人"
        : stage === "development"
          ? "处理任务并提交交付"
          : stage === "feedback"
            ? "跟进客户反馈"
            : "完善需求并提交审批";
  const visible = notices.filter(
    (n) =>
      filter === "all" ||
      (filter === "unread" && !n.read) ||
      (filter === "approval" &&
        n.type === "approval" &&
        n.approved === undefined),
  );
  useEffect(() => {
    setDraft("");
    setTyping(false);
    setFile(null);
    setChatTab("messages");
  }, [sessionId]);
  function submit() {
    if (!session || (!draft.trim() && !file)) return;
    const content = [
      draft.trim(),
      file
        ? `[附件演示：${file.name} · ${(file.size / 1024).toFixed(1)} KB]`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
    send(session.id, content);
    if (session.kind === "agent") {
      setTyping(true);
      setTimeout(() => setTyping(false), 900);
    }
    setDraft("");
    setFile(null);
  }
  function decide(approved: boolean) {
    if (!approval) return;
    update(
      (s) => {
        const n = s.notices.find((n) => n.id === approval.id)!;
        n.approved = approved;
        n.read = true;
      },
      approved ? "批准 Agent 数据导出" : "拒绝 Agent 数据导出",
      approval.projectId,
    );
    toast.success(approved ? "已批准本次导出请求" : "已拒绝本次请求");
    setApproval(null);
  }
  if (page === "notifications")
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto [&>*]:shrink-0 p-5 lg:p-7">
        <PageHeader
          title="系统通知"
          description="查看项目状态流转，以及需要你处理的事项。"
        >
          <Button
            variant="outline"
            onClick={() => {
              update((s) => {
                s.notices.forEach((n) => {
                  if (n.roles.includes(role) || role === "admin") n.read = true;
                });
              }, "标记通知已读");
              toast.success("已全部标为已读");
            }}
          >
            <CheckCheck data-icon="inline-start" />
            全部已读
          </Button>
        </PageHeader>
        <Tabs
          value={filter}
          onChange={setFilter}
          items={[
            { id: "all", label: "全部通知", count: notices.length },
            {
              id: "unread",
              label: "未读",
              count: notices.filter((n) => !n.read).length,
            },
            { id: "pending", label: "待我处理", count: pendingProjects.length },
          ]}
        />
        <div className="flex flex-col gap-4">
          {(filter === "all" || filter === "pending") &&
            pendingProjects.map((p) => (
              <Card key={`pending-${p.id}`}>
                <CardHeader>
                  <CardTitle>{pendingLabel(p.stage)}</CardTitle>
                  <CardDescription>{p.name}</CardDescription>
                  <CardAction>
                    <Badge>待我处理</Badge>
                  </CardAction>
                </CardHeader>
                <CardFooter>
                  <Button size="sm" onClick={() => onProject(p.id)}>
                    去处理
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          {visible.map((n) => (
            <Card key={n.id}>
              <CardHeader>
                <CardTitle>{n.title}</CardTitle>
                <CardDescription>{n.time}</CardDescription>
                <CardAction>
                  <Badge>{n.read ? "已读" : "未读"}</Badge>
                </CardAction>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-7 text-muted-foreground">
                  {n.body}
                </p>
              </CardContent>
              <CardFooter className="gap-2">
                {n.projectId && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      update((s) => {
                        s.notices.find((x) => x.id === n.id)!.read = true;
                      });
                      onProject(n.projectId!);
                    }}
                  >
                    查看项目
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                )}
                {n.type === "approval" &&
                  (n.approved === undefined ? (
                    <Button size="sm" onClick={() => setApproval(n)}>
                      处理审批
                    </Button>
                  ) : (
                    <Badge tone={n.approved ? "green" : "neutral"}>
                      {n.approved ? "已批准" : "已拒绝"}
                    </Badge>
                  ))}
              </CardFooter>
            </Card>
          ))}
          {!visible.length &&
            !(
              (filter === "all" || filter === "pending") &&
              pendingProjects.length
            ) && (
              <Empty
                title="没有待处理通知"
                description="项目流转或任务需要审批时，会在这里通知你。"
              />
            )}
        </div>
        <Dialog
          open={!!approval}
          onOpenChange={(v) => {
            if (!v) setApproval(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agent 操作审批</DialogTitle>
              <DialogDescription>
                仅授权本次请求，结果将写入审计日志。
              </DialogDescription>
            </DialogHeader>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <dt className="text-muted-foreground">申请者</dt>
              <dd>数据开发 Agent</dd>
              <dt className="text-muted-foreground">操作</dt>
              <dd>导出 50 条样例为 Excel</dd>
              <dt className="text-muted-foreground">资源范围</dt>
              <dd>{approval?.projectId} / 测试库</dd>
              <dt className="text-muted-foreground">生产数据库</dt>
              <dd>只读，禁止写入</dd>
            </dl>
            <DialogFooter>
              <Button variant="outline" onClick={() => decide(false)}>
                拒绝请求
              </Button>
              <Button onClick={() => decide(true)}>
                <Check data-icon="inline-start" />
                批准本次操作
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  if (!session)
    return (
      <Empty
        title="选择一个会话"
        description="从左侧选择 AI 会话，或开启新的 AI 对话。"
      >
        <Button onClick={onNew}>
          <Plus data-icon="inline-start" />
          新建 AI 会话
        </Button>
      </Empty>
    );
  const runtimeName = runtimeList.find((r) => r.id === session.runtimeId)?.name;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="chat-heading flex shrink-0 flex-wrap items-center gap-3 px-5 py-4">
        <UIAvatar size="lg">
          <AvatarFallback>
            <Sparkles />
          </AvatarFallback>
        </UIAvatar>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            <span className="truncate">{session.name}</span>
            <Badge>AI Agent</Badge>
          </h1>
          <p className="truncate text-xs text-muted-foreground">
            {`${runtimeName} · ${session.provider} · ${session.model}`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {project && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onProject(project.id)}
            >
              <FolderKanban data-icon="inline-start" />
              项目详情
            </Button>
          )}
        </div>
      </header>
      <div className="border-b px-5 pb-2">
        <Tabs
          value={chatTab}
          onChange={setChatTab}
          items={[
            { id: "messages", label: "对话" },
            { id: "files", label: "文件" },
            { id: "documents", label: "云文档" },
          ]}
        />
      </div>
      {chatTab === "messages" ? (
        <>
          <div className="flex shrink-0 flex-wrap items-center gap-2 px-5 py-3 text-xs text-muted-foreground">
            <Sparkles className="size-3.5" />
            已加载 Skills
            {roleSkills[session.role].map((s) => (
              <Badge key={s}>{s}</Badge>
            ))}
          </div>
          <div className="min-h-0 flex-1">
            <MessageScrollerProvider
              key={session.id}
              autoScroll
              defaultScrollPosition="end"
            >
              <MessageScroller>
                <MessageScrollerViewport>
                  <MessageScrollerContent className="px-5 py-5 lg:px-7">
                    <MessageScrollerItem messageId="date">
                      <Marker variant="separator">
                        <MarkerContent>2026 年 9 月 22 日</MarkerContent>
                      </Marker>
                    </MessageScrollerItem>
                    {session.messages.map((m) => {
                      const own = m.sender === rolePeople[role];
                      return (
                        <MessageScrollerItem
                          key={m.id}
                          messageId={m.id}
                          scrollAnchor={own}
                        >
                          {m.kind === "system" ? (
                            <Marker className="justify-center">
                              <MarkerIcon>
                                <Users />
                              </MarkerIcon>
                              <MarkerContent>{m.content}</MarkerContent>
                            </Marker>
                          ) : (
                            <Message align={own ? "end" : "start"}>
                              <MessageAvatar>
                                <UIAvatar>
                                  <AvatarFallback>
                                    {m.kind === "agent" ? (
                                      <Sparkles className="size-4" />
                                    ) : (
                                      m.sender.slice(0, 1)
                                    )}
                                  </AvatarFallback>
                                </UIAvatar>
                              </MessageAvatar>
                              <MessageContent>
                                <MessageHeader className="gap-2">
                                  {m.sender}
                                  {m.kind === "agent" && <Badge>Agent</Badge>}
                                </MessageHeader>
                                <Bubble
                                  variant={own ? "default" : "secondary"}
                                  align={own ? "end" : "start"}
                                >
                                  <BubbleContent>
                                    <p className="whitespace-pre-wrap">
                                      {m.content.replace(
                                        /\n?\[附件演示：.*?\]/g,
                                        "",
                                      )}
                                    </p>
                                  </BubbleContent>
                                </Bubble>
                                {m.content.includes("[附件演示：") && (
                                  <Attachment state="done">
                                    <AttachmentMedia>
                                      <FileText />
                                    </AttachmentMedia>
                                    <AttachmentContent>
                                      <AttachmentTitle>
                                        {
                                          m.content.match(
                                            /\[附件演示：(.*?)\]/,
                                          )?.[1]
                                        }
                                      </AttachmentTitle>
                                      <AttachmentDescription>
                                        仅文件信息演示，未上传内容
                                      </AttachmentDescription>
                                    </AttachmentContent>
                                  </Attachment>
                                )}
                                <MessageFooter>
                                  {m.time}
                                  {m.kind === "agent" &&
                                    " · 企业上下文 / 演示回复"}
                                </MessageFooter>
                              </MessageContent>
                            </Message>
                          )}
                        </MessageScrollerItem>
                      );
                    })}
                    {typing && (
                      <MessageScrollerItem messageId="typing">
                        <Marker>
                          <MarkerIcon>
                            <Sparkles />
                          </MarkerIcon>
                          <MarkerContent>
                            <span className="shimmer">Agent 正在整理回复…</span>
                          </MarkerContent>
                        </Marker>
                      </MessageScrollerItem>
                    )}
                  </MessageScrollerContent>
                </MessageScrollerViewport>
                <MessageScrollerButton aria-label="跳到最新消息" />
              </MessageScroller>
            </MessageScrollerProvider>
          </div>
          <div className="flex shrink-0 flex-col gap-2 p-4 lg:px-6">
            {file && (
              <Attachment size="sm" state="done">
                <AttachmentMedia>
                  <FileText />
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle>{file.name}</AttachmentTitle>
                  <AttachmentDescription>
                    {(file.size / 1024).toFixed(1)} KB · 演示附件
                  </AttachmentDescription>
                </AttachmentContent>
                <AttachmentActions>
                  <AttachmentAction
                    aria-label="移除附件"
                    onClick={() => setFile(null)}
                  >
                    ×
                  </AttachmentAction>
                </AttachmentActions>
              </Attachment>
            )}
            <InputGroup>
              <InputGroupTextarea
                aria-label="输入消息"
                placeholder="描述你想完成的工作…"
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
                className="min-h-20"
              />
              <InputGroupAddon align="block-end">
                <InputGroupButton
                  size="icon-sm"
                  aria-label="添加演示附件"
                  onClick={() => fileInput.current?.click()}
                >
                  <Paperclip />
                </InputGroupButton>
                <InputGroupText className="hidden sm:inline">
                  {`${session.provider} · ${session.runtimeId?.includes("local") ? "本地" : "云端"}`}
                </InputGroupText>
                <InputGroupText className="ml-auto hidden lg:inline">
                  Enter 发送 · Shift + Enter 换行
                </InputGroupText>
                <InputGroupButton
                  className="ml-auto lg:ml-2"
                  variant="default"
                  size="icon-sm"
                  aria-label="发送消息"
                  disabled={!draft.trim() && !file}
                  onClick={submit}
                >
                  <Send />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            <input
              type="file"
              hidden
              ref={fileInput}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setFile({ name: f.name, size: f.size });
                  toast.info("当前只记录附件名称和大小，未上传内容");
                }
                e.target.value = "";
              }}
            />
            <p className="text-center text-xs text-muted-foreground">
              演示会话 · AI 回复为预置内容，重要结果请人工核实
            </p>
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto p-6">
          {chatTab === "documents" && project?.document ? (
            <AttachmentGroup>
              <Attachment state="done">
                <AttachmentMedia>
                  <FileText />
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle>
                    {project.name} · 方案 v{project.round}.0
                  </AttachmentTitle>
                  <AttachmentDescription>
                    项目云文档 · {project.docAccepted ? "已确认" : "待产品确认"}
                  </AttachmentDescription>
                </AttachmentContent>
                <AttachmentActions>
                  <AttachmentAction
                    aria-label="下载方案"
                    onClick={() =>
                      downloadText(`${project.id}-方案.md`, project.document)
                    }
                  >
                    <ArrowDownToLine />
                  </AttachmentAction>
                  <AttachmentAction
                    aria-label="打开项目方案"
                    onClick={() => onProject(project.id)}
                  >
                    <ArrowRight />
                  </AttachmentAction>
                </AttachmentActions>
              </Attachment>
            </AttachmentGroup>
          ) : chatTab === "files" && project?.qualityPassed ? (
            <Attachment state="done">
              <AttachmentMedia>
                <DatabaseIcon />
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>
                  {project.name} · R{project.round} 数据成果
                </AttachmentTitle>
                <AttachmentDescription>
                  {project.phase === "sample" ? "50" : "50,000"} 条数据 ·
                  在项目内预览和下载 Excel
                </AttachmentDescription>
              </AttachmentContent>
              <AttachmentActions>
                <AttachmentAction
                  aria-label="查看数据成果"
                  onClick={() => onProject(project.id)}
                >
                  <ArrowRight />
                </AttachmentAction>
              </AttachmentActions>
            </Attachment>
          ) : (
            <Empty
              title={chatTab === "files" ? "暂无项目文件" : "暂无方案文档"}
              description="关联项目的方案和交付成果会展示在这里。"
            />
          )}
        </div>
      )}
    </div>
  );
}
function DatabaseIcon() {
  return <FileText />;
}
