import { useRef, useState } from "react";
import {
  ArrowLeft,
  Download,
  FileText,
  FolderKanban,
  Paperclip,
  Plus,
  Reply,
  Send,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "../lib/store";
import {
  rolePeople,
  type GroupAttachment,
  type GroupChat,
  type GroupMessage,
} from "../lib/types";
import {
  acceptsAttachment,
  appendGroupMessage,
  attachmentAccept,
  canViewGroup,
  createGroup,
  enterprisePeople,
} from "../lib/group-chat";
import { cn, uid } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Checkbox } from "../components/ui/checkbox";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
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
  FieldSet,
  FieldLegend,
} from "../components/ui/field";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "../components/ui/empty";
import {
  InputGroup,
  InputGroupTextarea,
  InputGroupAddon,
  InputGroupButton,
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
import {
  Attachment,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
  AttachmentActions,
  AttachmentAction,
} from "../components/ui/attachment";

function FileCard({
  file,
  remove,
}: {
  file: GroupAttachment;
  remove?: () => void;
}) {
  return (
    <Attachment state="done" className="max-w-full">
      <AttachmentMedia variant="icon">
        <FileText />
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle title={file.name}>{file.name}</AttachmentTitle>
        <AttachmentDescription>
          {(file.size / 1024).toFixed(1)} KB · 下载后查看
        </AttachmentDescription>
      </AttachmentContent>
      <AttachmentActions>
        {remove ? (
          <AttachmentAction aria-label={`移除 ${file.name}`} onClick={remove}>
            <X />
          </AttachmentAction>
        ) : (
          <AttachmentAction asChild>
            <a
              href={file.data}
              download={file.name}
              aria-label={`下载 ${file.name}`}
            >
              <Download />
            </a>
          </AttachmentAction>
        )}
      </AttachmentActions>
    </Attachment>
  );
}

export function GroupDetail({
  group,
  onBack,
  onProject,
}: {
  group: GroupChat;
  onBack: () => void;
  onProject: (id: string) => void;
}) {
  const { state, role, update } = useStore();
  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState<GroupAttachment[]>([]);
  const [replyToId, setReplyToId] = useState<string>();
  const [reading, setReading] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const me = rolePeople[role];
  const member = group.members.includes(me);
  const reply = group.messages.find((m) => m.id === replyToId);
  const summary = (message: GroupMessage) =>
    message.text ||
    message.attachments.map((a) => `[附件] ${a.name}`).join("、");
  async function selectFiles(selected: FileList | null) {
    if (!selected?.length) return;
    const pending = Array.from(selected);
    if (pending.some((file) => !acceptsAttachment(file.name))) {
      toast.error("请选择图片、Word、PDF、Excel、PowerPoint、TXT 或 CSV 文件");
      return;
    }
    // localStorage is used only for this offline demo; bound data URLs before reading.
    const storedBytes = state.groupChats
      .flatMap((g) => g.messages)
      .flatMap((m) => m.attachments)
      .reduce((sum, f) => sum + f.size, 0);
    if (
      storedBytes +
        files.reduce((sum, f) => sum + f.size, 0) +
        pending.reduce((sum, f) => sum + f.size, 0) >
      2 * 1024 * 1024
    ) {
      toast.error(
        "Demo 附件总量上限为 2 MB，请选择更小的文件；正式环境的容量另行配置",
      );
      return;
    }
    setReading(true);
    try {
      const added = await Promise.all(
        pending.map(
          (file) =>
            new Promise<GroupAttachment>((resolve, reject) => {
              const reader = new FileReader();
              reader.onerror = () => reject(new Error("文件读取失败"));
              reader.onload = () =>
                resolve({
                  id: uid(),
                  name: file.name,
                  size: file.size,
                  data: reader.result as string,
                });
              reader.readAsDataURL(file);
            }),
        ),
      );
      setFiles((old) => [...old, ...added]);
    } catch {
      toast.error("文件读取失败，请重新选择");
    } finally {
      setReading(false);
    }
  }
  function send() {
    const message = { text: draft, attachments: files, replyToId };
    if (!member || reading || (!draft.trim() && !files.length)) return;
    update(
      (s) => {
        appendGroupMessage(s, role, group.id, message);
      },
      "发送群聊消息",
      group.name,
    );
    setDraft("");
    setFiles([]);
    setReplyToId(undefined);
  }
  return (
    <section
      aria-label="聊天详情"
      className="flex min-h-0 min-w-0 flex-1 flex-col"
    >
      <header className="flex shrink-0 items-center gap-3 border-b p-4">
        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          aria-label="返回群聊列表"
          onClick={onBack}
        >
          <ArrowLeft />
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold">{group.name}</h2>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0"
            onClick={() => setShowMembers(true)}
          >
            {group.members.length} 位成员
          </Button>
        </div>
        {group.projectId && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onProject(group.projectId!)}
          >
            <FolderKanban data-icon="inline-start" />
            关联项目
          </Button>
        )}
        {!member && <Badge variant="secondary">管理员查看</Badge>}
      </header>
      <div className="min-h-0 flex-1">
        {group.messages.length ? (
          <MessageScrollerProvider autoScroll defaultScrollPosition="end">
            <MessageScroller>
              <MessageScrollerViewport>
                <MessageScrollerContent className="p-4 lg:p-6">
                  {group.messages.map((message) => {
                    const quoted = group.messages.find(
                      (m) => m.id === message.replyToId,
                    );
                    const mine = message.sender === me;
                    return (
                      <MessageScrollerItem
                        key={message.id}
                        messageId={message.id}
                      >
                        <Message align={mine ? "end" : "start"}>
                          <MessageAvatar>
                            <Avatar>
                              <AvatarFallback>
                                {message.sender.slice(0, 1)}
                              </AvatarFallback>
                            </Avatar>
                          </MessageAvatar>
                          <MessageContent>
                            <MessageHeader>{message.sender}</MessageHeader>
                            {quoted && (
                              <Bubble
                                variant="outline"
                                align={mine ? "end" : "start"}
                              >
                                <BubbleContent>
                                  <p className="text-xs text-muted-foreground">
                                    引用 {quoted.sender}
                                  </p>
                                  <p className="whitespace-pre-wrap break-all">
                                    {summary(quoted)}
                                  </p>
                                </BubbleContent>
                              </Bubble>
                            )}
                            {message.text && (
                              <Bubble
                                variant={mine ? "secondary" : "muted"}
                                align={mine ? "end" : "start"}
                              >
                                <BubbleContent>
                                  <p className="whitespace-pre-wrap break-all">
                                    {message.text}
                                  </p>
                                </BubbleContent>
                              </Bubble>
                            )}
                            {message.attachments.map((file) => (
                              <FileCard key={file.id} file={file} />
                            ))}
                            <MessageFooter className="gap-2">
                              <time dateTime={message.createdAt}>
                                {new Date(message.createdAt).toLocaleString(
                                  "zh-CN",
                                  {
                                    month: "2-digit",
                                    day: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )}
                              </time>
                              {member && (
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  aria-label={`引用 ${message.sender} 的消息`}
                                  onClick={() => setReplyToId(message.id)}
                                >
                                  <Reply />
                                </Button>
                              )}
                            </MessageFooter>
                          </MessageContent>
                        </Message>
                      </MessageScrollerItem>
                    );
                  })}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
          </MessageScrollerProvider>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users />
              </EmptyMedia>
              <EmptyTitle>开始这个群聊的第一条消息</EmptyTitle>
              <EmptyDescription>支持纯文本、附件和引用回复。</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
      {member ? (
        <div className="flex shrink-0 flex-col gap-3 border-t p-4">
          {reply && (
            <div className="flex min-w-0 items-center gap-2">
              <Reply className="size-4 shrink-0" />
              <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                回复 {reply.sender}：{summary(reply)}
              </p>
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label="取消引用"
                onClick={() => setReplyToId(undefined)}
              >
                <X />
              </Button>
            </div>
          )}
          {files.length > 0 && (
            <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto">
              {files.map((file) => (
                <FileCard
                  key={file.id}
                  file={file}
                  remove={() =>
                    setFiles((old) => old.filter((f) => f.id !== file.id))
                  }
                />
              ))}
            </div>
          )}
          <InputGroup>
            <InputGroupTextarea
              aria-label="群聊消息"
              placeholder="输入消息，Enter 发送，Shift + Enter 换行"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <InputGroupAddon align="block-end">
              <InputGroupButton
                variant="ghost"
                disabled={reading}
                onClick={() => input.current?.click()}
              >
                <Paperclip data-icon="inline-start" />
                {reading ? "读取附件中…" : "添加附件"}
              </InputGroupButton>
              <InputGroupButton
                className="ml-auto"
                variant="default"
                disabled={reading || (!draft.trim() && !files.length)}
                onClick={send}
              >
                <Send data-icon="inline-start" />
                发送
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <input
            ref={input}
            type="file"
            aria-label="群聊附件"
            hidden
            multiple
            accept={attachmentAccept}
            onChange={(e) => {
              void selectFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      ) : (
        <p className="border-t p-4 text-sm text-muted-foreground">
          你正在查看企业群聊，只有群成员可以发送消息。
        </p>
      )}
      <Dialog open={showMembers} onOpenChange={setShowMembers}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>群成员</DialogTitle>
            <DialogDescription>
              {group.name} · {group.members.length} 人
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {group.members.map((person) => (
              <Badge key={person} variant="secondary">
                {person}
              </Badge>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
