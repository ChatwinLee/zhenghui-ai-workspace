import { useState } from "react";
import { toast } from "sonner";
import type { Project } from "../lib/types";
import { useStore } from "../lib/store";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Field, FieldLabel } from "./ui/field";
import { Choice } from "./shared";
export function DeliverySchedule({ project }: { project: Project }) {
  const { update, role } = useStore();
  const canEdit = role === "sales" || role === "admin";
  const [mode, setMode] = useState(project.deliveryMode || "once");
  const [due, setDue] = useState(project.due);
  const [next, setNext] = useState(project.nextDelivery || "");
  if (!canEdit) {
    return (
      <div className="flex flex-wrap gap-8 text-sm">
        <div><p className="mb-2 text-muted-foreground">交付方式</p><p>{project.deliveryMode === "batch" ? "分批交付" : "一次性交付"}</p></div>
        <div><p className="mb-2 text-muted-foreground">{project.deliveryMode === "batch" ? "下次交付日期" : "交付日期"}</p><p>{(project.deliveryMode === "batch" ? project.nextDelivery : project.due) || "待填写"}</p></div>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Field className="w-40">
        <FieldLabel>交付方式</FieldLabel>
        <Choice
          label="交付方式"
          value={mode}
          onChange={(v) => setMode(v as "once" | "batch")}
          options={[
            { value: "once", label: "一次性交付" },
            { value: "batch", label: "分批交付" },
          ]}
        />
      </Field>
      <Field className="w-48">
        <FieldLabel htmlFor="delivery-date">
          {mode === "batch" ? "下次交付日期" : "交付日期"}
        </FieldLabel>
        <Input
          id="delivery-date"
          type="date"
          value={mode === "batch" ? next : due}
          onChange={(e) =>
            mode === "batch" ? setNext(e.target.value) : setDue(e.target.value)
          }
        />
      </Field>
      <Button
        variant="outline"
        disabled={!(mode === "batch" ? next : due)}
        onClick={() => {
          update(
            (s) => {
              const p = s.projects.find((p) => p.id === project.id)!;
              p.deliveryMode = mode;
              p.nextDelivery = next;
              p.due = mode === "batch" ? next : due;
            },
            "更新交付安排",
            project.id,
          );
          toast.success("交付安排已保存");
        }}
      >
        保存交付安排
      </Button>
    </div>
  );
}
