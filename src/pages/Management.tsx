import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";
import { SessionAgentIcon } from "../components/SessionAgentIcon";
import { ApprovalQueue } from "../components/ApprovalQueue";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownToLine,
  ArrowRight,
  Bot,
  Check,
  Cloud,
  Database,
  FileText,
  LockKeyhole,
  Monitor,
  Plus,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "../lib/store";
import {
  assignedCloudRuntimes,
  canSeeRuntime,
  runtimeList,
  stageLabels,
  type Policy,
} from "../lib/types";
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
  FieldLabel,
  FieldDescription,
} from "../components/ui/field";
import { Switch } from "../components/ui/switch";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "../components/ui/chart";
import {
  AINote,
  Avatar,
  Badge,
  Choice,
  Empty,
  PageHeader,
  SearchBox,
  StatCard,
  Tabs,
} from "../components/shared";
const chartConfig = {
  agent: { label: "Agent 任务", color: "var(--chart-2)" },
  human: { label: "人工协作", color: "var(--chart-4)" },
  count: { label: "项目数量", color: "var(--chart-3)" },
} satisfies ChartConfig;
export default function Management({
  page,
  onProject,
  onCustomer,
  onSession,
  onNew,
}: {
  page: string;
  onProject: (id: string) => void;
  onCustomer: (id: string) => void;
  onSession: (id: string) => void;
  onNew: () => void;
}) {
  const { state, role, update } = useStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [permissionScope, setPermissionScope] = useState("human");
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [newLocalOpen, setNewLocalOpen] = useState(false);
  const [localName, setLocalName] = useState("");
  const [localAgents, setLocalAgents] = useState<typeof runtimeList>(() => {
    try {
      return JSON.parse(localStorage.getItem("zhenghui-local-agents") || "[]");
    } catch {
      return [];
    }
  });
  const [agentScope, setAgentScope] = useState("all");
  const [range, setRange] = useState("本周");
  const auditRows = state.audits.filter(
    (a) =>
      (filter === "all" ||
        a.kind === filter ||
        (filter === "blocked" && a.result === "已拦截")) &&
      `${a.actor}${a.action}${a.resource}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const layout =
    "flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto [&>*]:shrink-0 p-5 lg:p-7";
  if (page === "runtimes")
    return (
      <div className={layout}>
        <PageHeader
          title="Agent管理"
          description="管理公司云端与本地的 Agent 运行时。数据开发仅处理公开数据，不提供模型本地部署服务。"
        >
          <Button
            onClick={() => {
              setLocalName("");
              setNewLocalOpen(true);
            }}
          >
            <Plus data-icon="inline-start" />
            新建本地运行时
          </Button>
        </PageHeader>
        <Tabs
          value={agentScope}
          onChange={setAgentScope}
          items={[
            { id: "all", label: "全部" },
            { id: "local", label: "我的本地" },
          ]}
        />
        <div className="grid gap-5 xl:grid-cols-2">
          {[...runtimeList, ...localAgents]
            .filter(
              (r) =>
                canSeeRuntime(role, r, state.policies) &&
                (agentScope === "all" || r.local),
            )
            .map((r) => (
              <Card key={r.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {r.local ? (
                      <Monitor className="size-5" />
                    ) : (
                      <Cloud className="size-5" />
                    )}
                    {r.name}
                  </CardTitle>
                  <CardDescription className="flex flex-wrap items-center gap-3 pt-2">
                    {r.agents.map((agent) => (
                      <span key={agent} className="flex items-center gap-1.5">
                        <span className="size-4 shrink-0">
                          <SessionAgentIcon runtime={agent} />
                        </span>
                        {agent}
                      </span>
                    ))}
                  </CardDescription>
                  <CardAction>
                    <Badge tone={r.online ? "green" : "neutral"}>
                      {r.online ? "在线" : "离线"}
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardFooter className="justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!r.online}
                    onClick={onNew}
                  >
                    开启会话
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
        </div>
        <Dialog open={newLocalOpen} onOpenChange={setNewLocalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建本地运行时</DialogTitle>
              <DialogDescription>
                添加本地设备卡片，Demo 暂不连接真实设备。
              </DialogDescription>
            </DialogHeader>
            <Field>
              <FieldLabel htmlFor="local-agent-name">名称</FieldLabel>
              <Input
                id="local-agent-name"
                placeholder="例如：我的 MacBook"
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
              />
            </Field>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewLocalOpen(false)}>
                取消
              </Button>
              <Button
                disabled={!localName.trim()}
                onClick={() => {
                  const next = [
                    ...localAgents,
                    {
                      id: `local-${crypto.randomUUID()}`,
                      name: `本地 · ${localName.trim()}`,
                      device: "本地设备",
                      agents: ["Codex", "Claude Code", "DeepSeek Harness"],
                      online: false,
                      local: true,
                    },
                  ];
                  try {
                    localStorage.setItem(
                      "zhenghui-local-agents",
                      JSON.stringify(next),
                    );
                    setLocalAgents(next);
                    setAgentScope("local");
                    setNewLocalOpen(false);
                    toast.success("已添加本地设备");
                  } catch {
                    toast.error("保存失败，请重试");
                  }
                }}
              >
                创建
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  if (page === "security")
    return (
      <div className={layout}>
        <PageHeader
          title="权限与安全"
          description="分别管理人员业务权限与 Agent 数据库权限。"
        />
        <Tabs
          value={permissionScope}
          onChange={setPermissionScope}
          items={[
            { id: "human", label: "人员权限" },
            { id: "agent", label: "Agent 权限" },
          ]}
        />
        <Card>
          <CardHeader>
            <CardTitle>
              {permissionScope === "human"
                ? "人员业务权限"
                : "Agent 数据库权限"}
            </CardTitle>
            <CardDescription>
              {state.policies.filter((p) => p.type === permissionScope).length}{" "}
              个权限主体
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  {(permissionScope === "agent"
                    ? ["Agent", "角色", "生产库访问", "测试库读写", ""]
                    : [
                        "人员",
                        "角色",
                        "客户管理",
                        "项目基本信息",
                        "项目指派",
                        "审批处理",
                        "云端运行时管理",
                        "可使用的云端运行时",
                        "",
                      ]
                  ).map((h, i) => (
                    <TableHead key={i}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.policies
                  .filter((p) => p.type === permissionScope)
                  .map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {p.type === "agent" ? (
                            <Bot className="size-4" />
                          ) : (
                            <Avatar name={p.name} size="small" />
                          )}
                          {p.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge>{p.role}</Badge>
                      </TableCell>
                      {p.type === "agent" ? (
                        <>
                          <TableCell>
                            <Badge>
                              {p.productionWrite
                                ? "读写"
                                : p.production
                                  ? "只读"
                                  : "禁止访问"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Permission allowed={p.workspace} />
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>
                            <Badge>
                              {(p.customerAccess ??
                                (p.role === "销售" ? "edit" : "read")) ===
                              "edit"
                                ? "可编辑"
                                : "只读"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge>
                              {(p.projectAccess ??
                                (p.role === "销售" ? "edit" : "read")) ===
                              "edit"
                                ? "可编辑"
                                : "只读"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Permission
                              allowed={p.role === "产品" && (p.assign ?? true)}
                            />
                          </TableCell>
                          <TableCell>
                            <Permission
                              allowed={p.approval ?? p.role === "管理"}
                            />
                          </TableCell>
                          <TableCell>
                            <Permission
                              allowed={p.cloudManage ?? p.role === "管理"}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex max-w-64 flex-wrap gap-1">
                              {assignedCloudRuntimes(p).map((id) => (
                                <Badge key={id}>
                                  {runtimeList
                                    .find((r) => r.id === id)
                                    ?.name.replace("云端 · ", "") || id}
                                </Badge>
                              ))}
                              {!assignedCloudRuntimes(p).length && (
                                <span className="text-muted-foreground">
                                  未分配
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </>
                      )}
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setPolicy({ ...p })}
                          disabled={role !== "admin"}
                        >
                          编辑
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Dialog
          open={!!policy}
          onOpenChange={(v) => {
            if (!v) setPolicy(null);
          }}
        >
          <DialogContent className="max-h-[85svh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>编辑权限 · {policy?.name}</DialogTitle>
              <DialogDescription>
                分别配置当前主体的权限，保存后记录到审计日志。
              </DialogDescription>
            </DialogHeader>
            {policy && (
              <FieldGroup>
                {policy.type === "agent" && (
                  <Field>
                    <FieldLabel>生产库访问</FieldLabel>
                    <Choice
                      label="生产库访问"
                      value={
                        policy.productionWrite
                          ? "write"
                          : policy.production
                            ? "read"
                            : "none"
                      }
                      options={[
                        { value: "none", label: "禁止访问" },
                        { value: "read", label: "只读生产库" },
                        { value: "write", label: "读写生产库" },
                      ]}
                      onChange={(value) =>
                        setPolicy({
                          ...policy,
                          production: value !== "none",
                          productionWrite: value === "write",
                        })
                      }
                    />
                  </Field>
                )}
                {policy.type === "human" &&
                  (
                    [
                      { key: "customerAccess", label: "客户管理" },
                      { key: "projectAccess", label: "项目基本信息" },
                    ] as const
                  ).map((item) => (
                    <Field key={item.key}>
                      <FieldLabel>{item.label}</FieldLabel>
                      <Choice
                        label={item.label}
                        value={
                          policy[item.key] ??
                          (policy.role === "销售" ? "edit" : "read")
                        }
                        options={[
                          { value: "read", label: "只读" },
                          { value: "edit", label: "可编辑" },
                        ]}
                        onChange={(value) =>
                          setPolicy({
                            ...policy,
                            [item.key]: value as "read" | "edit",
                          })
                        }
                      />
                      {item.key === "projectAccess" && (
                        <FieldDescription>
                          仅控制项目基本信息，不包含方案、交付和指派操作。
                        </FieldDescription>
                      )}
                    </Field>
                  ))}
                {policy.type === "human" && (
                  <Field>
                    <FieldLabel>可使用的云端运行时</FieldLabel>
                    <FieldDescription>
                      可多选；未勾选的云端运行时将不出现在该人员的运行时与新建会话列表中。
                    </FieldDescription>
                    <div className="flex flex-col gap-3">
                      {runtimeList
                        .filter((r) => !r.local)
                        .map((r) => (
                          <label
                            key={r.id}
                            className="flex items-center gap-2 text-sm"
                          >
                            <Checkbox
                              checked={assignedCloudRuntimes(policy).includes(
                                r.id,
                              )}
                              onCheckedChange={(checked) => {
                                const ids = assignedCloudRuntimes(policy);
                                setPolicy({
                                  ...policy,
                                  cloudRuntimeIds:
                                    checked === true
                                      ? [...new Set([...ids, r.id])]
                                      : ids.filter((id) => id !== r.id),
                                });
                              }}
                            />
                            {r.name}
                          </label>
                        ))}
                    </div>
                  </Field>
                )}
                {(policy.type === "agent"
                  ? [{ key: "workspace", label: "测试库读写", fallback: false }]
                  : [
                      ...(policy.role === "产品"
                        ? [{ key: "assign", label: "项目指派", fallback: true }]
                        : []),
                      {
                        key: "cloudManage",
                        label: "云端运行时管理",
                        fallback: policy.role === "管理",
                      },
                      {
                        key: "approval",
                        label: "审批处理",
                        fallback: policy.role === "管理",
                      },
                    ]
                ).map((item) => (
                  <Field key={item.key} orientation="horizontal">
                    <FieldLabel
                      className="flex-1"
                      htmlFor={`permission-${item.key}`}
                    >
                      {item.label}
                    </FieldLabel>
                    <Switch
                      id={`permission-${item.key}`}
                      checked={
                        (policy[item.key as keyof Policy] as
                          boolean | undefined) ?? item.fallback
                      }
                      onCheckedChange={(value) =>
                        setPolicy({ ...policy, [item.key]: value })
                      }
                    />
                  </Field>
                ))}
              </FieldGroup>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setPolicy(null)}>
                取消
              </Button>
              <Button
                onClick={() => {
                  if (!policy) return;
                  update(
                    (s) => {
                      s.policies = s.policies.map((p) =>
                        p.id === policy.id ? policy : p,
                      );
                    },
                    "修改访问权限",
                    policy.name,
                  );
                  setPolicy(null);
                  toast.success("权限策略已保存");
                }}
              >
                保存权限
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  if (page === "audit")
    return (
      <div className={layout}>
        <PageHeader
          title="审计日志"
          description="查看人员操作、Agent 执行与权限检查记录。"
        >
          <Button
            variant="outline"
            onClick={() => {
              downloadText(
                "正惠审计日志.json",
                JSON.stringify(auditRows, null, 2),
              );
              update(() => {}, "导出审计日志", `${auditRows.length} 条记录`);
              toast.success("日志已导出");
            }}
          >
            <ArrowDownToLine data-icon="inline-start" />
            导出日志
          </Button>
        </PageHeader>
        <Card>
          <CardHeader>
            <CardTitle>操作记录</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Tabs
              value={filter}
              onChange={setFilter}
              items={[
                { id: "all", label: "全部操作" },
                { id: "human", label: "人员操作" },
                { id: "agent", label: "Agent 操作" },
                { id: "blocked", label: "已拦截" },
              ]}
            />
            <SearchBox
              value={query}
              onChange={setQuery}
              placeholder="搜索操作者、动作或资源…"
            />
            <Table>
              <TableHeader>
                <TableRow>
                  {["操作时间", "操作者", "操作", "目标资源", "结果"].map(
                    (h) => (
                      <TableHead key={h}>{h}</TableHead>
                    ),
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditRows.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.time}</TableCell>
                    <TableCell>{a.actor}</TableCell>
                    <TableCell>{a.action}</TableCell>
                    <TableCell className="max-w-64 truncate text-muted-foreground">
                      {a.resource}
                    </TableCell>
                    <TableCell>
                      <Badge>{a.result}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!auditRows.length && <Empty />}
          </CardContent>
        </Card>
      </div>
    );
  if (page === "team")
    return (
      <div className={layout}>
        <PageHeader
          title="团队效能"
          description="结合客户沟通、项目进度和 Agent 会话查看团队工作。"
        />
        <Card>
          <CardHeader>
            <CardTitle>客户拜访与跟进</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {state.customers.slice(0, 3).map((c) => (
              <Button
                variant="ghost"
                className="h-auto justify-start gap-3 py-3"
                key={c.id}
                onClick={() => onCustomer(c.id)}
              >
                <Avatar name={c.short} />
                <span className="flex flex-1 flex-col items-start gap-1">
                  <span>{c.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {c.owner} · {c.lastContact}
                  </span>
                </span>
                <ArrowRight data-icon="inline-end" />
              </Button>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Agent 工作会话</CardTitle>
            <CardDescription>
              查看完整历史，理解执行过程与交付质量。
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {state.sessions
              .filter((s) => s.kind === "agent")
              .map((s) => (
                <Button
                  variant="ghost"
                  className="h-auto justify-start gap-3 py-3"
                  key={s.id}
                  onClick={() => onSession(s.id)}
                >
                  <Sparkles data-icon="inline-start" />
                  <span className="flex flex-1 flex-col items-start gap-1">
                    <span>{s.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {s.provider} · {s.runtimeId} · {s.messages.length} 条消息
                    </span>
                  </span>
                  <ArrowRight data-icon="inline-end" />
                </Button>
              ))}
          </CardContent>
        </Card>
      </div>
    );
  const active = state.projects.filter((p) => p.stage !== "delivered");
  const attention = state.projects.filter(
    (p) => p.stage === "feedback" || p.stage === "solution",
  );
  const stages = Object.entries(stageLabels).map(([key, label]) => ({
    stage: label,
    count: state.projects.filter((p) => p.stage === key).length,
  }));
  const trend = (
    range === "本周"
      ? ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
      : ["第1周", "第2周", "第3周", "第4周"]
  ).map((date, i) => ({
    date,
    agent: [8, 13, 11, 19, 26, 24, 32][i],
    human: [5, 7, 8, 12, 15, 13, 18][i],
  }));
  return (
    <div className={layout}>
      <ApprovalQueue onProject={onProject} />
      <PageHeader
        title="经营概览"
        description="公司项目进展、协作效率与需要关注的事项。"
      >
        <div className="w-28">
          <Choice
            label="看板时间范围"
            value={range}
            onChange={setRange}
            options={["本周", "本月"]}
          />
        </div>
      </PageHeader>
      <div className="grid grid-cols-2 gap-4 2xl:grid-cols-4">
        <StatCard label="在途项目" value={active.length} unit="个">
          正在协作处理
        </StatCard>
        <StatCard
          label="预计业务金额"
          value={active.reduce((n, p) => n + p.amount, 0) / 10000}
          unit="万"
        >
          当前项目意向
        </StatCard>
        <StatCard
          label="Agent 参与项目"
          value={
            new Set(
              state.sessions
                .filter((s) => s.kind === "agent" && s.projectId)
                .map((s) => s.projectId),
            ).size
          }
          unit="个"
        >
          自动任务预处理
        </StatCard>
        <StatCard label="待关注事项" value={attention.length} unit="项">
          确认方案或跟进客户
        </StatCard>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>项目阶段分布</CardTitle>
            <CardDescription>根据当前项目状态实时统计</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-56 w-full">
              <BarChart
                data={stages}
                layout="vertical"
                margin={{ left: 10, right: 15 }}
              >
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="stage"
                  width={86}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>人机协作趋势</CardTitle>
            <CardDescription>{range}任务数量 · 预置示例趋势</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-56 w-full">
              <AreaChart data={trend} margin={{ left: 5, right: 5, top: 10 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="agent"
                  stroke="var(--color-agent)"
                  fill="var(--color-agent)"
                  fillOpacity={0.15}
                />
                <Area
                  type="monotone"
                  dataKey="human"
                  stroke="var(--color-human)"
                  fill="var(--color-human)"
                  fillOpacity={0.1}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>需要关注</CardTitle>
          <CardDescription>
            {attention.length} 个项目等待下一步行动
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {attention.map((p) => (
            <Button
              key={p.id}
              variant="ghost"
              className="h-auto justify-start gap-3 py-3"
              onClick={() => onProject(p.id)}
            >
              <FileText data-icon="inline-start" />
              <span className="flex flex-1 flex-col items-start gap-1">
                <span>{p.name}</span>
                <span className="text-xs text-muted-foreground">
                  {p.stage === "feedback"
                    ? "样例已交付，请跟进客户反馈"
                    : "请产品人工编写并确认方案"}
                </span>
              </span>
              <Badge>{stageLabels[p.stage]}</Badge>
              <ArrowRight data-icon="inline-end" />
            </Button>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>全部项目进展</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {["项目名称", "客户", "阶段", "轮次", "交付日期"].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.projects.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Button
                      variant="link"
                      className="px-0"
                      onClick={() => onProject(p.id)}
                    >
                      {p.name}
                    </Button>
                  </TableCell>
                  <TableCell>
                    {state.customers.find((c) => c.id === p.customerId)?.name}
                  </TableCell>
                  <TableCell>
                    <Badge>{stageLabels[p.stage]}</Badge>
                  </TableCell>
                  <TableCell>
                    R{p.round} · {p.phase === "sample" ? "样例" : "正式"}
                  </TableCell>
                  <TableCell>{p.due.slice(5)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
function Permission({ allowed }: { allowed: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      {allowed ? (
        <Check className="size-3.5" />
      ) : (
        <LockKeyhole className="size-3.5" />
      )}
      {allowed ? "允许" : "禁止"}
    </span>
  );
}
