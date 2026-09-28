import { Empty } from "./shared";
import { projectDemoAttachments } from "../lib/project-demo-attachments";
import { useRef, useState } from "react";
import { Paperclip, Save, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "../lib/store";
import { rolePeople, type Project } from "../lib/types";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Field, FieldLabel } from "./ui/field";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "./ui/card";
import {
  Attachment,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
  AttachmentActions,
  AttachmentAction,
} from "./ui/attachment";
export type InfoSection = "requirement" | "document" | "data";
const config = {
  requirement: { title: "需求信息", owner: "销售", role: "sales" },
  document: { title: "方案信息", owner: "产品", role: "product" },
  data: { title: "交付信息", owner: "研发", role: "dev" },
} as const;
export function ProjectInfo({
  project,
  section,
}: {
  project: Project;
  section: InfoSection;
}) {
  const { role, update } = useStore();
  const info = config[section];
  const editable =
    role === "admin" ||
    (section === "data"
      ? (role === "product" || role === "dev") &&
        project.developers.includes(rolePeople[role])
      : role === info.role);
  const [text, setText] = useState(
    section === "requirement"
      ? project.description
      : section === "document"
        ? project.document
        : project.deliveryInfo || "",
  );
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const attachments =
    project.attachments?.[section] ?? projectDemoAttachments(project, section);
  function save() {
    update(
      (s) => {
        const p = s.projects.find((p) => p.id === project.id)!;
        if (section === "requirement") p.description = text;
        if (section === "document") {
          p.document = text;
          p.docAccepted = false;
        }
        if (section === "data") p.deliveryInfo = text;
        p.history.unshift({
          time: new Date().toLocaleString("sv-SE"),
          title: `更新${info.title}`,
          detail: `${info.owner}已更新内容。`,
          actor: rolePeople[role],
        });
      },
      `保存${info.title}`,
      project.id,
    );
    toast.success("已保存");
  }
  async function addFiles(files: File[]) {
    setBusy(true);
    try {
      for (const file of files) {
        if (file.size > 1024 * 1024) {
          toast.info("Demo 附件请控制在 1 MB 以内");
          continue;
        }
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        update(
          (s) => {
            const p = s.projects.find((p) => p.id === project.id)!;
            p.attachments ??= {};
            (p.attachments[section] ??= projectDemoAttachments(
              p,
              section,
            )).push({
              id: crypto.randomUUID(),
              name: file.name,
              size: file.size,
              data,
            });
          },
          `添加${info.title}附件`,
          project.id,
        );
      }
    } catch {
      toast.error("读取附件失败，请重试");
    } finally {
      setBusy(false);
    }
  }
  if (
    section === "data" &&
    !editable &&
    !["feedback", "delivered"].includes(project.stage)
  ) {
    return (
      <Empty
        title={
          project.stage === "development"
            ? "研发实施中"
            : project.stage === "solution"
              ? "待安排承接人"
              : project.stage === "declined"
                ? "项目未承接"
                : "尚未进入研发环节"
        }
        description={
          project.stage === "solution"
            ? "方案确认后，产品可自己承接或指派研发，随后填写交付信息。"
            : "交付完成后，将在这里展示交付说明和附件。"
        }
      />
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{info.title}</CardTitle>
        <CardDescription>
          {section === "data"
            ? `当前研发承接人：${project.developers.join("、") || "待指派"}`
            : `${info.owner}维护`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <Field>
          <FieldLabel htmlFor={`info-${section}`} className="sr-only">
            {info.title}
          </FieldLabel>
          <Textarea
            id={`info-${section}`}
            className="min-h-80"
            value={text}
            readOnly={!editable}
            onChange={(e) => setText(e.target.value)}
            placeholder={`填写${info.title}…`}
          />
        </Field>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">附件</span>
          {editable && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => fileInput.current?.click()}
              >
                <Paperclip data-icon="inline-start" />
                {busy ? "添加中…" : "添加附件"}
              </Button>
              <Button onClick={save}>
                <Save data-icon="inline-start" />
                保存
              </Button>
            </div>
          )}
        </div>
        <input
          type="file"
          multiple
          hidden
          ref={fileInput}
          onChange={(e) => {
            void addFiles(Array.from(e.target.files || []));
            e.target.value = "";
          }}
        />
        {!attachments.length && (
          <p className="text-sm text-muted-foreground">暂无附件</p>
        )}
        {attachments.map((file) => (
          <Attachment key={file.id} state="done">
            <AttachmentMedia>
              <Paperclip />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>{file.name}</AttachmentTitle>
              <AttachmentDescription>
                {(file.size / 1024).toFixed(1)} KB
              </AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction
                aria-label={`下载 ${file.name}`}
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = file.data;
                  link.download = file.name;
                  link.click();
                }}
              >
                <Download />
              </AttachmentAction>
              {editable && (
                <AttachmentAction
                  aria-label={`移除 ${file.name}`}
                  onClick={() =>
                    update((s) => {
                      const p = s.projects.find((p) => p.id === project.id)!;
                      p.attachments ??= {};
                      p.attachments[section] = (
                        p.attachments[section] ??
                        projectDemoAttachments(p, section)
                      ).filter((a) => a.id !== file.id);
                    })
                  }
                >
                  <Trash2 />
                </AttachmentAction>
              )}
            </AttachmentActions>
          </Attachment>
        ))}
      </CardContent>
    </Card>
  );
}
