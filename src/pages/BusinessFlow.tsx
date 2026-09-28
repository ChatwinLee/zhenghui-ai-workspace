import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { useTheme } from "next-themes";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  MarkerType,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  FileText,
  GitBranch,
  LockKeyhole,
  MessageCircle,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";
import "@xyflow/react/dist/style.css";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from "../components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "../components/ui/toggle-group";
import { Alert, AlertTitle, AlertDescription } from "../components/ui/alert";
import { Separator } from "../components/ui/separator";
interface Step {
  id: string;
  title: string;
  owner: string;
  caption: string;
  input: string;
  work: string;
  output: string;
  notify: string;
  group: string;
  position: { x: number; y: number };
}
const steps: Step[] = [
  {
    id: "demand",
    title: "收集客户需求",
    owner: "销售",
    caption: "拜访录音 → 转写 → 需求",
    input: "江南银行公司金融部的拜访录音、普惠金融客群筛选要求。",
    work: "销售通过手机记录拜访，AI 基于企业知识库点评，提炼数据范围、字段、数量和格式。",
    output: "建立唯一项目编号，先提交 50 条长三角制造业企业样例需求。",
    notify: "提交给产品，通知产品负责人。",
    group: "此时关联项目上下文，生成 AI 方案会话。",
    position: { x: 0, y: 100 },
  },
  {
    id: "draft",
    title: "自动生成方案",
    owner: "产品 Agent",
    caption: "按产品 Skill 产出初稿",
    input: "销售提交的需求、客户资料与沟通上下文。",
    work: "云端运行时自动创建会话，按照需求拆解、字段定义与方案编写 Skill 生成产品文档。",
    output: "产品方案初稿，包含字段口径、交付范围和验收规则。",
    notify: "系统提醒产品人员确认初稿。",
    group: "方案生成会话关联当前项目。",
    position: { x: 285, y: 100 },
  },
  {
    id: "product",
    title: "确认方案并指派",
    owner: "产品",
    caption: "编辑 / 接受 → 指派研发",
    input: "Agent 生成的产品方案初稿。",
    work: "产品可接受、退回或在线编辑方案；确认后选择一位或多位研发。未确认方案不能进入研发。",
    output: "已确认的产品方案、字段定义和研发负责人。",
    notify: "通知被指派的研发，触发数据开发 Agent。",
    group: "研发可查看项目历史和关联 AI 会话。",
    position: { x: 570, y: 100 },
  },
  {
    id: "data",
    title: "自动数据开发",
    owner: "研发 Agent",
    caption: "MCP 读取 → 转换 → 质检",
    input: "产品确认的字段、筛选范围、数量和验收标准。",
    work: "只读查询生产数据库，在测试 Workspace 中编写代码、转换字段并清洗数据，按 Skill 制定并执行质量规则。",
    output: "50 条样例、字段映射、执行记录与质量报告。",
    notify: "通过质量检查后，通知研发进行人工审核。",
    group: "自动创建研发 Agent 会话，可在会话中继续修改。",
    position: { x: 855, y: 100 },
  },
  {
    id: "review",
    title: "审核样例并交付",
    owner: "研发",
    caption: "人工 Review → 交付结果",
    input: "Agent 生成的样例与质量报告。",
    work: "研发检查数据、代码和质量指标；有问题继续原 Agent 会话修改，确认后交付。",
    output: "已审核的样例文件与本轮交付记录。",
    notify: "同时通知销售与产品，准备给客户验证。",
    group: "项目记录同步结果，保留完整上下文。",
    position: { x: 1140, y: 100 },
  },
  {
    id: "feedback",
    title: "收集客户反馈",
    owner: "销售 + 产品",
    caption: "样例不满意 → 原项目迭代",
    input: "客户对 50 条样例的反馈。",
    work: "销售和产品把样例交给客户。如果需要修改，记录反馈并在原项目启动 R2、R3…，重新经过产品与研发。",
    output: "修改意见，或客户认可样例并准备签单。",
    notify: "需要修改时通知产品；认可后进入签约确认。",
    group: "每轮 AI 会话与文件归档在同一个项目编号下。",
    position: { x: 1140, y: 430 },
  },
  {
    id: "contract",
    title: "确认签单",
    owner: "销售",
    caption: "样例通过 → 确认正式范围",
    input: "客户认可样例，确认合作与完整数据需求。",
    work: "销售确认签约与正式需求；同一项目从样例验证转为正式交付，增加轮次。",
    output: "完整需求，例如 50,000 条企业数据、Excel 交付。",
    notify: "通知产品启动正式方案，不能直接跳过人工确认。",
    group: "沿用原项目，保留历史 AI 会话。",
    position: { x: 855, y: 430 },
  },
  {
    id: "full-product",
    title: "确认正式方案",
    owner: "产品 + Agent",
    caption: "新一轮方案 → 再次确认",
    input: "签单后的完整范围和所有样例验证结论。",
    work: "云端 Agent 生成正式方案；产品检查、编辑和确认，再次指派研发。样例阶段的方案保留为历史版本。",
    output: "正式产品文档、完整字段口径和交付数量。",
    notify: "正式方案确认后再次通知研发。",
    group: "复用已有成员，也可以补充新的研发与 Agent。",
    position: { x: 570, y: 430 },
  },
  {
    id: "full-delivery",
    title: "正式开发与交付",
    owner: "研发 + Agent",
    caption: "完整数据 → 质检 → 人工审核",
    input: "正式方案与 50,000 条数据交付要求。",
    work: "Agent 重新执行完整范围的数据开发与检验。研发 Review 通过后，交付正式文件；有问题继续原会话修正。",
    output: "正式交付文件、质量报告与审核记录。",
    notify: "通知销售、产品正式交付完成。",
    group: "正式结果与此前每一轮样例、反馈均可追溯。",
    position: { x: 285, y: 430 },
  },
  {
    id: "done",
    title: "完成与归档",
    owner: "全体协作者",
    caption: "同一项目 · 全历史保留",
    input: "正式数据、方案、交付结果和所有审批。",
    work: "项目归档需求、方案版本、Agent 会话、样例修改、质量报告和审计记录，管理者可查看整体进展。",
    output: "一个项目的完整业务档案。",
    notify: "管理看板同步完成状态与交付数据。",
    group: "项目结束后仍可追溯从首次客户沟通到最终交付的全部记录。",
    position: { x: 0, y: 430 },
  },
];
type FlowData = {
  step: Step;
  current: boolean;
  visited: boolean;
  onSelect: (id: string) => void;
};
function StepNode({ data }: NodeProps<Node<FlowData, "step">>) {
  return (
    <>
      <Handle type="target" position={Position.Left} id="in-left" />
      <Handle type="source" position={Position.Right} id="out-right" />
      <Handle type="target" position={Position.Right} id="in-right" />
      <Handle type="source" position={Position.Left} id="out-left" />
      <Handle type="target" position={Position.Top} id="in-top" />
      <Handle type="source" position={Position.Top} id="out-top" />
      <Handle type="target" position={Position.Bottom} id="in-bottom" />
      <Handle type="source" position={Position.Bottom} id="out-bottom" />
      <Card className="w-60" size="sm">
        <CardHeader>
          <CardDescription>{data.step.owner}</CardDescription>
          <CardTitle>
            <Button
              variant="link"
              className="h-auto p-0"
              onClick={() => data.onSelect(data.step.id)}
            >
              {data.step.title}
            </Button>
          </CardTitle>
          <CardAction>
            {data.current ? (
              <Badge>当前</Badge>
            ) : data.visited ? (
              <Badge variant="secondary">
                <Check />
              </Badge>
            ) : (
              <Badge variant="outline">
                {String(
                  steps.findIndex((s) => s.id === data.step.id) + 1,
                ).padStart(2, "0")}
              </Badge>
            )}
          </CardAction>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">{data.step.caption}</p>
        </CardContent>
      </Card>
    </>
  );
}
const nodeTypes = { step: StepNode };
const paths = {
  all: steps.map((s) => s.id),
  revision: ["feedback", "draft", "product", "data", "review", "feedback"],
  formal: ["feedback", "contract", "full-product", "full-delivery", "done"],
};
type Scenario = keyof typeof paths;
export default function BusinessFlow() {
  const { resolvedTheme } = useTheme();
  const [scenario, setScenario] = useState<Scenario>("all");
  const [cursor, setCursor] = useState(0);
  const [selected, setSelected] = useState("demand");
  const [playing, setPlaying] = useState(false);
  const path = paths[scenario];
  const current = steps.find((s) => s.id === selected)!;
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(
      () =>
        setCursor((c) => {
          if (c >= path.length - 1) {
            setPlaying(false);
            return c;
          }
          setSelected(path[c + 1]);
          return c + 1;
        }),
      3200,
    );
    return () => clearInterval(timer);
  }, [playing, path]);
  const select = useCallback(
    (id: string) => {
      setPlaying(false);
      setSelected(id);
      const i = path.indexOf(id);
      if (i >= 0) setCursor(i);
    },
    [path],
  );
  const nodes = useMemo(
    () =>
      steps.map((step) => ({
        id: step.id,
        type: "step" as const,
        position: step.position,
        data: {
          step,
          current: selected === step.id,
          visited: path.slice(0, cursor).includes(step.id),
          onSelect: select,
        },
        draggable: false,
      })),
    [selected, path, cursor, select],
  );
  const edges = useMemo(() => {
    const links: {
      from: string;
      to: string;
      label?: string;
      back?: boolean;
    }[] = [
      ...steps
        .slice(0, -1)
        .map((s, i) => ({ from: s.id, to: steps[i + 1].id })),
      {
        from: "feedback",
        to: "draft",
        label: "需要修改：原项目进入下一轮",
        back: true,
      },
      { from: "product", to: "draft", label: "不接受，修改方案", back: true },
      { from: "review", to: "data", label: "未通过，继续会话", back: true },
    ];
    return links.map((l) => {
      const a = steps.findIndex((s) => s.id === l.from);
      const b = steps.findIndex((s) => s.id === l.to);
      const active = path[cursor - 1] === l.from && path[cursor] === l.to;
      const returning = l.back;
      return {
        id: `${l.from}-${l.to}`,
        source: l.from,
        target: l.to,
        sourceHandle: returning
          ? "out-top"
          : a < 4
            ? "out-right"
            : a === 4
              ? "out-bottom"
              : "out-left",
        targetHandle: returning
          ? l.from === "feedback"
            ? "in-bottom"
            : "in-top"
          : b <= 4
            ? "in-left"
            : b === 5
              ? "in-top"
              : "in-right",
        type: "smoothstep",
        label:
          l.label ||
          (l.from === "feedback" && l.to === "contract"
            ? "样例通过"
            : undefined),
        animated: active,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: {
          stroke: active ? "var(--foreground)" : "var(--muted-foreground)",
          strokeWidth: active ? 2.5 : 1.25,
          strokeDasharray: returning ? "6 4" : undefined,
          opacity: returning && scenario !== "revision" ? 0.55 : 1,
        },
        labelStyle: { fill: "var(--foreground)", fontSize: 12 },
        labelBgStyle: { fill: "var(--background)" },
        labelBgPadding: [8, 5] as [number, number],
      } satisfies Edge;
    });
  }, [cursor, path, scenario]);
  function changeScenario(v: string) {
    if (!v) return;
    const next = v as Scenario;
    setPlaying(false);
    setScenario(next);
    setCursor(0);
    setSelected(paths[next][0]);
  }
  function next(delta: number) {
    setPlaying(false);
    const c = Math.max(0, Math.min(path.length - 1, cursor + delta));
    setCursor(c);
    setSelected(path[c]);
  }
  return (
    <div className="min-h-svh bg-background">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 lg:px-8">
        <div className="flex items-center gap-3">
          <Workflow className="size-5" />
          <strong>正惠 · 业务流程讲解</strong>
          <Badge variant="outline">客户演示</Badge>
        </div>
        <Button variant="outline" asChild>
          <a href="/" target="_blank" rel="noreferrer">
            打开工作台
            <ExternalLink data-icon="inline-end" />
          </a>
        </Button>
      </header>
      <main className="mx-auto flex max-w-[1600px] flex-col gap-6 px-5 py-7 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex max-w-3xl flex-col gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">
              一个项目，从第一次需求到最终交付
            </h1>
            <p className="text-sm leading-7 text-muted-foreground">
              以银行普惠金融企业名单筛选为例：销售发起，产品确认，研发交付。Agent
              自动预处理，人在关键节点做决策。样例可以反复修改，签单后再走一遍正式方案与开发，整个过程始终属于同一个项目。
            </p>
          </div>
          <Badge variant="secondary">
            <GitBranch />
            示例项目 ZH-2026-0921
          </Badge>
        </div>
        <Alert>
          <ShieldCheck />
          <AlertTitle>项目编号不变，信息从头到尾贯通</AlertTitle>
          <AlertDescription>
            需求、每轮方案、Agent
            会话、质量报告与交付记录全部关联同一个项目；通过 R1、R2、R3…
            区分轮次。
          </AlertDescription>
        </Alert>
        <Card>
          <CardHeader>
            <CardTitle>业务全流程</CardTitle>
            <CardDescription>
              点击节点查看说明；可缩放、平移，也可按路径逐步讲解。
            </CardDescription>
            <CardAction>
              <Badge variant="outline">
                {cursor + 1} / {path.length}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <ToggleGroup
                type="single"
                value={scenario}
                onValueChange={changeScenario}
                variant="outline"
              >
                <ToggleGroupItem value="all">完整流程</ToggleGroupItem>
                <ToggleGroupItem value="revision">样例修改</ToggleGroupItem>
                <ToggleGroupItem value="formal">签单后交付</ToggleGroupItem>
              </ToggleGroup>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPlaying(false);
                    setCursor(0);
                    setSelected(path[0]);
                  }}
                >
                  <RotateCcw data-icon="inline-start" />
                  重新开始
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={cursor === 0}
                  onClick={() => next(-1)}
                >
                  <ArrowLeft data-icon="inline-start" />
                  上一步
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={cursor === path.length - 1}
                  onClick={() => next(1)}
                >
                  下一步
                  <ArrowRight data-icon="inline-end" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (cursor === path.length - 1) {
                      setCursor(0);
                      setSelected(path[0]);
                    }
                    setPlaying((v) => !v);
                  }}
                >
                  {playing ? (
                    <Pause data-icon="inline-start" />
                  ) : (
                    <Play data-icon="inline-start" />
                  )}
                  {playing ? "暂停讲解" : "自动演示"}
                </Button>
              </div>
            </div>
            <div
              className="h-[480px] min-h-80 overflow-hidden rounded-lg border lg:h-[530px]"
              style={
                {
                  "--xy-background-color": "var(--background)",
                  "--xy-controls-button-background-color": "var(--card)",
                  "--xy-controls-button-color": "var(--foreground)",
                  "--xy-controls-button-border-color": "var(--border)",
                  "--xy-edge-stroke": "var(--muted-foreground)",
                } as CSSProperties
              }
            >
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                nodesConnectable={false}
                nodesDraggable={false}
                elementsSelectable={false}
                onNodeClick={(_, node) => select(node.id)}
                fitView
                fitViewOptions={{ padding: 0.12 }}
                minZoom={0.3}
                maxZoom={1.5}
                colorMode={resolvedTheme === "dark" ? "dark" : "light"}
                proOptions={{ hideAttribution: true }}
              >
                <Background gap={24} color="var(--border)" />
                <Controls showInteractive={false} />
              </ReactFlow>
            </div>
          </CardContent>
          <CardFooter className="flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <ArrowRight className="size-3" />
              实线：正常业务流转
            </span>
            <span className="flex items-center gap-1">
              <RefreshIcon />
              虚线：修改与退回
            </span>
            <span>节点说明与播放只用于讲解，不会修改工作台数据。</span>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{current.title}</CardTitle>
            <CardDescription>当前讲解 · {current.owner}</CardDescription>
            <CardAction>
              <Badge>
                {current.id === "feedback" ? "可反复迭代" : "同一项目"}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <Explanation label="输入" text={current.input} />
            <Explanation label="具体工作" text={current.work} />
            <Explanation label="产出" text={current.output} />
            <Explanation label="通知与下一步" text={current.notify} />
          </CardContent>
          <CardFooter className="gap-2">
            <MessageCircle className="size-4 shrink-0" />
            <p className="text-sm text-muted-foreground">{current.group}</p>
          </CardFooter>
        </Card>
        <div className="grid gap-5 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-4" />
                AI 会话贯穿全程
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-7 text-muted-foreground">
                提交给产品时自动建群，指派研发时自动加入。新成员可看全部历史，也可以邀请其他同事、运行时或
                Agent，使用 @Agent 协作。
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-4" />
                角色与 Agent 分工
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-7 text-muted-foreground">
                销售用沟通与需求 Skill，产品用方案 Skill，研发用数据开发与质量
                Skill。支持 Codex、Claude Code、DeepSeek Harness
                的本地或云端运行时。
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LockKeyhole className="size-4" />
                数据边界与审计
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-7 text-muted-foreground">
                生产数据库仅可读，测试 Workspace 按权限读写。人和 Agent
                独立授权，审批、访问与状态流转均留痕，管理者可查看全公司项目进展。
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
function Explanation({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">{label}</h3>
      <p className="text-sm leading-7 text-muted-foreground">{text}</p>
    </div>
  );
}
function RefreshIcon() {
  return <RotateCcw className="size-3" />;
}
