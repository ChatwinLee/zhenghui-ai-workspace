import { useEffect, useState } from "react";
import { Mic, Square } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Field, FieldLabel, FieldGroup } from "./ui/field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Choice } from "./shared";
import type { Customer, Visit } from "../lib/types";

export function NewRecording({
  customer,
  onSave,
}: {
  customer: Customer;
  onSave: (visit: Visit) => void;
}) {
  const [open, setOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Visit["category"]>("销售拜访");
  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [recording]);
  const duration = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  function save() {
    onSave({
      id: `recording-${crypto.randomUUID()}`,
      customerId: customer.id,
      title: title.trim() || `${category} · ${customer.name}`,
      category,
      organizer: customer.owner,
      participants: [
        `${customer.owner} · 销售`,
        ...(category === "客户会议" ? ["陈思远 · 产品", "张晨 · 研发"] : []),
        `${customer.contact} · 客户`,
      ],
      date: new Date().toLocaleString("sv-SE").slice(0, 16),
      duration,
      person: `${customer.owner} · ${customer.contact}`,
      transcript: [
        {
          time: "00:00",
          speaker: "演示提示",
          text: "本条记录由录音交互演示创建，未采集真实音频，也未进行自动转写。",
        },
      ],
    });
    setRecording(false);
    setOpen(false);
  }
  return (
    <>
      <Button
        className="w-fit"
        onClick={() => {
          setTitle("");
          setSeconds(0);
          setOpen(true);
        }}
      >
        <Mic data-icon="inline-start" />
        新建录音
      </Button>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setRecording(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {recording ? "正在录音（演示）" : "新建录音"}
            </DialogTitle>
            <DialogDescription>
              {customer.name} · 当前为交互演示，不采集麦克风音频。
            </DialogDescription>
          </DialogHeader>
          {recording ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <Mic className="size-8 text-destructive" />
              <span className="text-4xl font-medium tabular-nums">
                {duration}
              </span>
              <span className="text-sm text-muted-foreground">
                {category} · {title || "未命名录音"}
              </span>
            </div>
          ) : (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="recording-title">录音名称</FieldLabel>
                <Input
                  id="recording-title"
                  placeholder="例如：样例方案沟通会"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>沟通类型</FieldLabel>
                <Choice
                  label="沟通类型"
                  value={category}
                  onChange={(v) => setCategory(v as Visit["category"])}
                  options={["销售拜访", "客户会议"]}
                />
              </Field>
              <p className="text-sm text-muted-foreground">
                销售牵头：{customer.owner} ·{" "}
                {category === "客户会议"
                  ? "销售、产品、研发与客户参会"
                  : "销售与客户沟通"}
              </p>
            </FieldGroup>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRecording(false);
                setOpen(false);
              }}
            >
              {recording ? "取消录音" : "取消"}
            </Button>
            {recording ? (
              <Button onClick={save}>
                <Square data-icon="inline-start" />
                结束并保存
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setSeconds(0);
                  setRecording(true);
                }}
              >
                <Mic data-icon="inline-start" />
                开始录音
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
