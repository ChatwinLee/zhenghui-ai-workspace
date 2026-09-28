import { DeliverySchedule } from "../components/DeliverySchedule";
import { ProjectInfo, type InfoSection } from "../components/ProjectInfo";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  FileText,
  Plus,
  RefreshCcw,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "../lib/store";
import { rolePeople, stageLabels, type Stage } from "../lib/types";
import { now } from "../lib/utils";
import { Button } from "../components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../components/ui/table";
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
  FieldSet,
  FieldLegend,
  FieldLabel,
} from "../components/ui/field";
import { Checkbox } from "../components/ui/checkbox";
import { Textarea } from "../components/ui/textarea";
import { Separator } from "../components/ui/separator";
import {
  Avatar,
  Badge,
  DocumentBody,
  Empty,
  PageHeader,
  SearchBox,
  Tabs,
} from "../components/shared";
const stages: Stage[] = [
  "demand",
  "approval",
  "solution",
  "development",
  "feedback",
  "delivered",
];
function progressLabel(stage: Stage, current: Stage, confirmed: boolean) {
  const completed: Partial<Record<Stage, string>> = {
    demand: "已创建",
    approval: "审批通过，决定承接",
    solution: "方案设计完成",
    development: "研发实施完成",
    feedback: "客户反馈已确认",
    delivered: "已交付",
  };
  const upcoming: Partial<Record<Stage, string>> = {
    approval: "待管理员审批",
    solution: "待方案设计",
    development: "待研发实施",
    feedback: "待客户反馈",
    delivered: "待交付",
  };
  if (current === "declined") {
    if (stage === "demand") return "已创建";
    if (stage === "approval") return "审批未通过，不承接";
    return "未启动";
  }
  if (stage === "solution" && current === "solution" && confirmed)
    return "方案设计完成";
  if (stages.indexOf(stage) < stages.indexOf(current)) return completed[stage];
  if (stage === current) return stageLabels[stage];
  return upcoming[stage];
}

export default function Projects({
  selectedId,
  onSelect,
  onNew,
}: {
  selectedId: string | null;
  onSelect: (v: string | null) => void;
  onNew: () => void;
  onSession: (id: string) => void;
}) {
  const { state, role, transition, update } = useStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [tab, setTab] = useState("requirement");
  const [modal, setModal] = useState<
    "assign" | "handoff" | "revise" | "sign" | "deliver" | null
  >(null);
  const [people, setPeople] = useState(["张晨"]);
  const [handoffNote, setHandoffNote] = useState("");
  const [feedback, setFeedback] = useState("");
  const [versionDoc, setVersionDoc] = useState<string | null>(null);
  const project = state.projects.find((p) => p.id === selectedId);
  const isProduct = role === "product" || role === "admin";
  const isDev =
    role === "admin" ||
    ((role === "product" || role === "dev") &&
      !!project?.developers.includes(rolePeople[role]));
  const isSales = role === "sales" || role === "admin";
  useEffect(() => {
    setTab(
      role === "dev" ? "data" : role === "product" ? "document" : "requirement",
    );
  }, [selectedId, role]);
  useEffect(() => {
    setQuery("");
    setFilter("all");
  }, [role]);
  const projects = state.projects.filter((p) =>
    role === "dev"
      ? p.developers.includes(rolePeople[role])
      : role === "product"
        ? !["demand", "approval", "declined"].includes(p.stage)
        : true,
  );
  const filtered = projects.filter(
    (p) =>
      (filter === "all" ||
        (filter === "active" &&
          (role === "sales"
            ? ["demand", "approval", "declined"].includes(p.stage) &&
              p.phase === "sample"
            : p.stage !== "delivered")) ||
        (filter === "sample" &&
          p.phase === "sample" &&
          (role !== "sales" ||
            !["demand", "approval", "declined"].includes(p.stage))) ||
        (filter === "delivered" &&
          (role === "sales" ? p.phase === "full" : p.stage === "delivered"))) &&
      `${p.name}${p.id}${state.customers.find((c) => c.id === p.customerId)?.name}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  function confirmModal() {
    if (!project || !modal) return;
    if (modal === "assign" || modal === "handoff") {
      if (transition(project.id, modal, people, handoffNote)) setModal(null);
      return;
    }
    if (modal === "revise") {
      if (!feedback.trim()) return;
      update(
        (s) => {
          const p = s.projects.find((p) => p.id === project.id)!;
          p.description += `\n客户第 ${p.round} 轮反馈：${feedback}`;
          p.history.unshift({
            time: `09-22 ${now()}`,
            title: "记录客户反馈",
            detail: feedback,
            actor: rolePeople[role],
          });
        },
        "记录客户反馈",
        project.id,
      );
    }
    if (transition(project.id, modal)) {
      setModal(null);
      setFeedback("");
    }
  }
  if (!project)
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto [&>*]:shrink-0 p-5 lg:p-7">
        <PageHeader
          title={role === "sales" ? "需求管理" : "项目管理"}
          description="同一项目贯穿需求、样例迭代、签单与正式交付。"
        >
          {isSales && (
            <Button onClick={onNew}>
              <Plus data-icon="inline-start" />
              新建需求
            </Button>
          )}
        </PageHeader>
        <div className="flex shrink-0 flex-col gap-4">
          <Tabs
            value={filter}
            onChange={setFilter}
            items={[
              { id: "all", label: role === "sales" ? "全部需求" : "全部项目" },
              { id: "active", label: role === "sales" ? "初步接触" : "进行中" },
              { id: "sample", label: "样例验证" },
              {
                id: "delivered",
                label: role === "sales" ? "已签约" : "已交付",
              },
            ]}
          />
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="搜索项目名称、编号或客户…"
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  {role === "sales" ? "需求名称" : "项目名称"}
                </TableHead>
                <TableHead>当前阶段</TableHead>
                <TableHead>交付类型</TableHead>
                <TableHead>协作成员</TableHead>
                <TableHead>期望交付</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Button
                      variant="ghost"
                      className="h-auto flex-col items-start gap-1 px-0 py-2"
                      onClick={() => onSelect(p.id)}
                    >
                      <span>{p.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {p.id} ·{" "}
                        {
                          state.customers.find((c) => c.id === p.customerId)
                            ?.name
                        }
                      </span>
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Badge tone={p.stage === "delivered" ? "green" : "neutral"}>
                      {stageLabels[p.stage]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {p.phase === "sample" ? "样例" : "正式"} · R{p.round}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {p.members
                        .filter((m) => !m.includes("Agent"))
                        .slice(0, 3)
                        .map((m) => (
                          <Avatar key={m} name={m} size="small" />
                        ))}
                    </div>
                  </TableCell>
                  <TableCell>{p.due.slice(5)}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSelect(p.id)}
                    >
                      查看详情
                      <ChevronRight data-icon="inline-end" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!filtered.length && <Empty />}
          <span className="text-xs text-muted-foreground">
            共 {filtered.length} 条{role === "sales" ? "需求" : "项目"}
          </span>
        </div>
      </div>
    );
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto [&>*]:shrink-0 p-5 lg:p-7">
      <Button variant="ghost" className="w-fit" onClick={() => onSelect(null)}>
        <ArrowLeft data-icon="inline-start" />
        返回{role === "sales" ? "需求" : "项目"}列表
      </Button>
      <section className="flex flex-col gap-5 rounded-xl border p-5 lg:p-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">
            {project.name}
          </h1>
          <div className="shrink-0 pt-1">
            <Badge>
              {project.stage === "solution" && project.docAccepted
                ? "待安排承接人"
                : stageLabels[project.stage]}
            </Badge>
          </div>
        </div>
        <div className="grid items-start gap-5 border-b pb-5 xl:grid-cols-2">
          <div
            className="flex flex-wrap items-center gap-x-5 gap-y-3"
            aria-label="参与人员"
          >
            <span className="w-full text-xs font-medium text-muted-foreground">
              参与人员
            </span>
            {[
              { name: project.owner, label: "销售" },
              { name: project.product, label: "产品" },
              ...project.developers.map((name) => ({ name, label: "研发" })),
            ]
              .filter(
                (person, index, people) =>
                  person.name &&
                  people.findIndex((other) => other.name === person.name) ===
                    index,
              )
              .map((person) => (
                <div
                  key={`${person.label}-${person.name}`}
                  className="flex items-center gap-2"
                >
                  <Avatar name={person.name} />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{person.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {person.label}
                    </span>
                  </div>
                </div>
              ))}
          </div>
          <div className="xl:border-l xl:pl-6">
            <DeliverySchedule key={project.id} project={project} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {stages
            .flatMap((stage) => {
              const assignments =
                project.assignmentSteps?.filter(
                  (step) => step.round === project.round,
                ) || [];
              if (stage === "development" && assignments.length) {
                return assignments.map((step, index) => ({
                  stage,
                  label: `${stages.indexOf(project.stage) > stages.indexOf("development") ? "研发实施完成" : index < assignments.length - 1 ? "已转交" : "研发实施中"}，${step.role === "product" ? "产品承接" : "研发承接"}`,
                }));
              }
              return [
                {
                  stage,
                  label:
                    stage === "development" && project.developers.length
                      ? `${progressLabel(stage, project.stage, project.docAccepted)}，${project.developers.includes(project.product) ? "产品承接" : "研发承接"}`
                      : progressLabel(
                          stage,
                          project.stage,
                          project.docAccepted,
                        ),
                },
              ];
            })
            .map((step, i, steps) => (
              <div
                key={`${step.stage}-${i}`}
                className="flex items-center gap-2"
              >
                <Badge
                  tone={
                    stages.indexOf(project.stage) >= stages.indexOf(step.stage)
                      ? "green"
                      : "neutral"
                  }
                >
                  {i + 1}. {step.label}
                </Badge>
                {i < steps.length - 1 && (
                  <ChevronRight className="size-3 text-muted-foreground" />
                )}
              </div>
            ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t pt-4 empty:hidden">
          {project.stage === "approval" && role === "admin" && (
            <>
              <Button
                size="sm"
                onClick={() => transition(project.id, "approve")}
              >
                通过并承接
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => transition(project.id, "decline")}
              >
                拒绝承接
              </Button>
            </>
          )}
          {project.stage === "demand" && isSales && (
            <Button size="sm" onClick={() => transition(project.id, "submit")}>
              提交审批
              <ArrowRight data-icon="inline-end" />
            </Button>
          )}
          {project.stage === "solution" && isProduct && (
            <>
              <Button
                size="sm"
                disabled={!project.docAccepted}
                onClick={() => transition(project.id, "selfAssign")}
              >
                自己承接
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setHandoffNote("");
                  setModal("assign");
                }}
                disabled={!project.docAccepted}
              >
                <Users data-icon="inline-start" />
                指派研发
              </Button>
              {!project.docAccepted && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>确认方案后，可自己承接或指派研发</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setTab("document")}
                  >
                    去确认方案
                  </Button>
                </div>
              )}
            </>
          )}
          {project.stage === "development" && (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-muted-foreground">当前研发承接人</span>
              {project.developers.map((name) => (
                <span key={name} className="flex items-center gap-2">
                  <Avatar name={name} />
                  {name}
                </span>
              ))}
              {isProduct && isDev && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setHandoffNote("");
                    setModal("handoff");
                  }}
                >
                  转交研发
                </Button>
              )}
            </div>
          )}
          {project.stage === "feedback" && isSales && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setModal("revise")}
              >
                <RefreshCcw data-icon="inline-start" />
                反馈修改
              </Button>
              <Button size="sm" onClick={() => setModal("sign")}>
                确认签单
                <ArrowRight data-icon="inline-end" />
              </Button>
            </>
          )}
        </div>
      </section>
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "requirement", label: "需求信息" },
          { id: "document", label: "方案信息" },
          { id: "data", label: "交付信息" },
          { id: "history", label: "流转记录", count: project.history.length },
        ]}
      />
      {["requirement", "document", "data"].includes(tab) && (
        <ProjectInfo
          key={`${project.id}-${tab}-${role}`}
          project={project}
          section={tab as InfoSection}
        />
      )}
      {tab === "data" && project.stage === "development" && isDev && (
        <div className="flex justify-end">
          <Button onClick={() => setModal("deliver")}>
            <CheckCircle2 data-icon="inline-start" />
            确认交付
          </Button>
        </div>
      )}
      {tab === "document" && isProduct && project.stage === "solution" && (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => transition(project.id, "reject")}
          >
            退回重写
          </Button>
          <Button
            disabled={project.docAccepted}
            onClick={() => transition(project.id, "accept")}
          >
            <Check data-icon="inline-start" />
            {project.docAccepted ? "方案已确认" : "确认方案"}
          </Button>
        </div>
      )}
      {tab === "history" && (
        <Card>
          <CardHeader>
            <CardTitle>完整流转记录</CardTitle>
            <CardDescription>
              {project.id} · 历史消息、成员与方案持续保留
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex flex-wrap gap-2">
              {project.versions?.map((v) => (
                <Button
                  key={v.round}
                  size="sm"
                  variant="outline"
                  onClick={() => setVersionDoc(v.document)}
                >
                  <FileText data-icon="inline-start" />R{v.round} ·{" "}
                  {v.phase === "sample" ? "样例" : "正式"}方案归档
                </Button>
              ))}
            </div>
            {project.history.map((h, i) => (
              <div className="flex gap-3" key={i}>
                <CheckCircle2 className="mt-1 size-4 shrink-0 text-muted-foreground" />
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex flex-wrap justify-between gap-2">
                    <h3 className="text-sm font-medium">{h.title}</h3>
                    <time className="text-xs text-muted-foreground">
                      {h.time}
                    </time>
                  </div>
                  <p className="text-sm text-muted-foreground">{h.detail}</p>
                  <span className="text-xs text-muted-foreground">
                    {h.actor}
                  </span>
                  {i < project.history.length - 1 && (
                    <Separator className="mt-2" />
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      <Dialog
        open={!!versionDoc}
        onOpenChange={(v) => {
          if (!v) setVersionDoc(null);
        }}
      >
        <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>历史方案快照</DialogTitle>
            <DialogDescription>历史轮次的方案已完整归档。</DialogDescription>
          </DialogHeader>
          {versionDoc && <DocumentBody text={versionDoc} />}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!modal}
        onOpenChange={(v) => {
          if (!v) setModal(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modal === "assign" || modal === "handoff"
                ? modal === "handoff"
                  ? "转交研发任务"
                  : "指派项目研发"
                : modal === "revise"
                  ? "记录客户反馈，发起下一轮修改"
                  : modal === "sign"
                    ? "确认签单，启动正式交付"
                    : "审核并交付数据"}
            </DialogTitle>
            <DialogDescription>
              {modal === "assign" || modal === "handoff"
                ? "支持多选，所选研发负责人工处理并维护交付信息。"
                : modal === "revise"
                  ? "原项目进入下一轮产品方案，保留全部历史。"
                  : modal === "sign"
                    ? "在当前项目中进入正式方案设计，再指派研发。"
                    : "请确认已人工核对交付说明、附件和质量，确认后通知销售和产品。"}
            </DialogDescription>
          </DialogHeader>
          {(modal === "assign" || modal === "handoff") && (
            <FieldSet>
              <FieldLegend>研发协作者</FieldLegend>
              <FieldGroup>
                {["张晨", "李浩", "王磊"].map((name) => (
                  <Field key={name} orientation="horizontal">
                    <Checkbox
                      id={`developer-${name}`}
                      checked={people.includes(name)}
                      onCheckedChange={(v) =>
                        setPeople(
                          v === true
                            ? [...people, name]
                            : people.filter((x) => x !== name),
                        )
                      }
                    />
                    <FieldLabel htmlFor={`developer-${name}`}>
                      <Avatar name={name} />
                      {name}
                    </FieldLabel>
                  </Field>
                ))}
              </FieldGroup>
            </FieldSet>
          )}
          {modal === "handoff" && (
            <Field>
              <FieldLabel>交接说明（选填）</FieldLabel>
              <Textarea
                value={handoffNote}
                onChange={(e) => setHandoffNote(e.target.value)}
                placeholder="说明已完成的工作与后续注意事项，已有内容和附件将保留。"
              />
            </Field>
          )}
          {modal === "revise" && (
            <Field>
              <FieldLabel htmlFor="feedback">客户反馈</FieldLabel>
              <Textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="例如：请补充经营异常记录时间，并调整地区口径…"
                rows={5}
              />
            </Field>
          )}
          {(modal === "sign" || modal === "deliver") && (
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <dt className="text-muted-foreground">项目编号</dt>
              <dd>{project.id}</dd>
              <dt className="text-muted-foreground">当前轮次</dt>
              <dd>R{project.round}</dd>
              <dt className="text-muted-foreground">
                {modal === "sign" ? "下一阶段" : "交付内容"}
              </dt>
              <dd>
                {modal === "sign"
                  ? "正式方案 → 研发 → 交付"
                  : project.phase === "sample"
                    ? "50 条样例数据"
                    : "50,000 条正式数据"}
              </dd>
            </dl>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(null)}>
              取消
            </Button>
            <Button
              onClick={confirmModal}
              disabled={
                modal === "assign" || modal === "handoff"
                  ? !people.length
                  : modal === "revise"
                    ? !feedback.trim()
                    : false
              }
            >
              {modal === "assign" || modal === "handoff"
                ? modal === "handoff"
                  ? "确认转交"
                  : "确认指派"
                : modal === "revise"
                  ? "提交反馈并流转"
                  : modal === "sign"
                    ? "确认签单"
                    : "确认审核并交付"}
              <ArrowRight data-icon="inline-end" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
