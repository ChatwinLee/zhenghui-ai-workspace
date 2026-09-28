import { useState } from "react";
import { useStore } from "../lib/store";
import { Badge, Empty, PageHeader, Tabs, Avatar } from "../components/shared";
import { Button } from "../components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../components/ui/card";

export default function Approvals({
  onProject,
}: {
  onProject: (id: string) => void;
}) {
  const { state, role, transition } = useStore();
  const [tab, setTab] = useState("pending");
  if (role !== "admin") return null;
  const pending = state.projects.filter((p) => p.stage === "approval");
  const processed = state.projects.filter(
    (p) => !["demand", "approval"].includes(p.stage),
  );
  const projects = tab === "pending" ? pending : processed;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-5 lg:p-7 [&>*]:shrink-0">
      <PageHeader
        title="审批"
        description="审批销售提交的需求，决定是否承接。"
      />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "pending", label: "需求待审批", count: pending.length },
          { id: "processed", label: "已审批", count: processed.length },
        ]}
      />
      <div className="flex flex-col gap-4">
        {projects.map((p) => (
          <Card key={p.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <CardTitle>{p.name}</CardTitle>
                  <CardDescription>
                    {state.customers.find((c) => c.id === p.customerId)?.name} ·{" "}
                    {p.id}
                  </CardDescription>
                </div>
                <Badge>
                  {p.stage === "approval"
                    ? "待管理员审批"
                    : p.stage === "declined"
                      ? "未通过，不承接"
                      : "审批通过，决定承接"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="whitespace-pre-wrap text-sm leading-7">
                {p.description}
              </p>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Avatar name={p.owner} size="small" />
                  提交销售：{p.owner}
                </span>
                <span>
                  {p.deliveryMode === "batch" ? "下次交付日期" : "交付日期"}：
                  {p.nextDelivery || p.due}
                </span>
                <span>{p.phase === "sample" ? "样例验证" : "正式交付"}</span>
              </div>
            </CardContent>
            <CardFooter className="flex flex-wrap justify-end gap-2 border-t pt-4">
              <Button variant="ghost" onClick={() => onProject(p.id)}>
                查看需求详情
              </Button>
              {p.stage === "approval" && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => transition(p.id, "decline")}
                  >
                    拒绝承接
                  </Button>
                  <Button onClick={() => transition(p.id, "approve")}>
                    审批通过，决定承接
                  </Button>
                </>
              )}
            </CardFooter>
          </Card>
        ))}
        {!projects.length && (
          <Empty
            title={tab === "pending" ? "暂无待审批需求" : "暂无审批记录"}
            description="销售提交需求后，会出现在待审批列表中。"
          />
        )}
      </div>
    </div>
  );
}
