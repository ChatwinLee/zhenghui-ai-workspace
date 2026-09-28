import { useState } from "react";
import { toast } from "sonner";
import { useStore } from "../lib/store";
import { rolePeople, type ExportRequest } from "../lib/types";
import { Badge, Choice, Empty, PageHeader } from "../components/shared";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "../components/ui/card";
import { Field, FieldLabel } from "../components/ui/field";

export default function ExportCenter({ review = false }: { review?: boolean }) {
  const { state, role, update } = useStore();
  const [projectId, setProjectId] = useState(state.projects[0]?.id || "");
  const [reason, setReason] = useState("");
  const person = rolePeople[role];
  const allowed =
    (role === "product" || role === "dev") &&
    !!state.policies.find((p) => p.type === "human" && p.name === person)
      ?.export;
  const requests = (state.exportRequests || []).filter((r) =>
    review ? true : r.applicant === person,
  );
  const labels = {
    pending: "待审批",
    approved: "已通过，待导出",
    rejected: "已拒绝",
    downloaded: "已导出",
  };
  if (review ? role !== "admin" : role !== "product" && role !== "dev")
    return null;
  function decide(id: string, approved: boolean) {
    if (role !== "admin") return;
    update(
      (s) => {
        const request = s.exportRequests?.find((r) => r.id === id);
        if (!request || request.status !== "pending") return;
        request.status = approved ? "approved" : "rejected";
        request.reviewer = person;
        s.notices.unshift({
          id: crypto.randomUUID(),
          title: approved ? "数据导出申请已通过" : "数据导出申请已拒绝",
          body: approved
            ? "请到平台的数据导出页面下载。本次批准仅可导出一次。"
            : "管理员已拒绝本次导出，可调整用途后重新申请。",
          time: new Date().toLocaleString(),
          type: "flow",
          roles: [request.role],
          read: false,
        });
      },
      approved ? "批准数据导出" : "拒绝数据导出",
      id,
    );
  }
  function download(request: ExportRequest) {
    if (
      !allowed ||
      request.applicant !== person ||
      request.status !== "approved"
    )
      return;
    const url = URL.createObjectURL(
      new Blob(
        [
          "\uFEFF企业名称,地区,数据说明\n示例制造企业,上海,Demo样例数据\n示例科技企业,江苏,Demo样例数据\n",
        ],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = request.projectId + "-演示数据.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    update(
      (s) => {
        const r = s.exportRequests?.find((r) => r.id === request.id);
        if (r?.status === "approved") r.status = "downloaded";
      },
      "平台数据导出",
      request.id,
    );
    toast.success("已导出；再次导出需要重新申请");
  }
  return (
    <div
      className={
        review
          ? "flex flex-col gap-4"
          : "flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-5 lg:p-7"
      }
    >
      {!review && (
        <>
          <PageHeader
            title="数据导出"
            description="每次导出均需管理员审批，通过后在此下载；每次批准仅可导出一次。"
          />
          <Card>
            <CardHeader>
              <CardTitle>申请数据导出</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field>
                <FieldLabel>所属项目</FieldLabel>
                <Choice
                  label="所属项目"
                  value={projectId}
                  onChange={setProjectId}
                  options={state.projects.map((p) => ({
                    value: p.id,
                    label: p.name,
                  }))}
                />
              </Field>
              <Field>
                <FieldLabel>导出用途</FieldLabel>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="说明需要导出的数据及用途"
                />
              </Field>
              <p className="text-sm text-muted-foreground">
                演示导出内容：预置 CSV 样例数据。
              </p>
              {!allowed && (
                <p className="text-sm text-muted-foreground">
                  你的数据导出权限尚未开启，请联系管理员。
                </p>
              )}
            </CardContent>
            <CardFooter>
              <Button
                disabled={!allowed || !projectId || !reason.trim()}
                onClick={() => {
                  if (!allowed || (role !== "product" && role !== "dev"))
                    return;
                  update(
                    (s) => {
                      s.exportRequests ??= [];
                      s.exportRequests.unshift({
                        id: crypto.randomUUID(),
                        projectId,
                        applicant: person,
                        role,
                        reason: reason.trim(),
                        status: "pending",
                        time: new Date().toLocaleString(),
                      });
                      s.notices.unshift({
                        id: crypto.randomUUID(),
                        title: "待审批：数据导出申请",
                        body:
                          person + "提交了数据导出申请，请前往审批页面处理。",
                        time: new Date().toLocaleString(),
                        type: "flow",
                        roles: ["admin"],
                        read: false,
                      });
                    },
                    "申请数据导出",
                    projectId,
                  );
                  setReason("");
                  toast.success("已提交管理员审批");
                }}
              >
                提交导出申请
              </Button>
            </CardFooter>
          </Card>
        </>
      )}
      {requests.map((r) => (
        <Card key={r.id}>
          <CardHeader>
            <div className="flex justify-between gap-4">
              <CardTitle>
                {state.projects.find((p) => p.id === r.projectId)?.name ||
                  r.projectId}
              </CardTitle>
              <Badge>{labels[r.status]}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{r.reason}</p>
            <p className="text-muted-foreground">
              {r.applicant} · {r.time}
              {r.reviewer ? " · 审批人：" + r.reviewer : ""}
            </p>
          </CardContent>
          <CardFooter className="gap-2">
            {review && r.status === "pending" && (
              <>
                <Button variant="outline" onClick={() => decide(r.id, false)}>
                  拒绝导出
                </Button>
                <Button onClick={() => decide(r.id, true)}>批准本次导出</Button>
              </>
            )}
            {!review && r.status === "approved" && (
              <Button disabled={!allowed} onClick={() => download(r)}>
                下载数据
              </Button>
            )}
            {!review && r.status === "downloaded" && (
              <span className="text-sm text-muted-foreground">
                本次批准已使用，再次导出请重新申请。
              </span>
            )}
          </CardFooter>
        </Card>
      ))}
      {!requests.length && <Empty title="暂无数据导出申请" />}
    </div>
  );
}
