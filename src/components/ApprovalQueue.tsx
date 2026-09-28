import { useStore } from "../lib/store";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
export function ApprovalQueue({
  onProject,
}: {
  onProject: (id: string) => void;
}) {
  const { state, role, transition } = useStore();
  if (role !== "admin") return null;
  const pending = state.projects.filter((p) => p.stage === "approval");
  return (
    <Card>
      <CardHeader>
        <CardTitle>待承接审批 · {pending.length}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!pending.length && (
          <p className="text-sm text-muted-foreground">暂无待审批需求</p>
        )}
        {pending.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-3">
            <Button variant="ghost" onClick={() => onProject(p.id)}>
              {p.name}
            </Button>
            <span className="mr-auto text-sm text-muted-foreground">
              销售：{p.owner}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => transition(p.id, "decline")}
            >
              拒绝承接
            </Button>
            <Button size="sm" onClick={() => transition(p.id, "approve")}>
              通过并承接
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
