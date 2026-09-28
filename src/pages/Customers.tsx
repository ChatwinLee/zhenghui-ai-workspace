import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  AudioLines,
  Check,
  ChevronRight,
  Mail,
  Pause,
  Phone,
  Play,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "../lib/store";
import { visits } from "../lib/data";
import { NewRecording } from "../components/NewRecording";
import { type Visit, stageLabels } from "../lib/types";
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
import { Checkbox } from "../components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "../components/ui/toggle-group";
import { Separator } from "../components/ui/separator";
import {
  AINote,
  Avatar,
  Badge,
  Choice,
  Empty,
  PageHeader,
  SearchBox,
  Tabs,
} from "../components/shared";
export default function Customers({
  customerId,
  onSelect,
  onProject,
  onNew,
  onNewProject,
}: {
  customerId: string | null;
  onSelect: (id: string | null) => void;
  onProject: (id: string) => void;
  onNew: () => void;
  onNewProject: () => void;
}) {
  const { state, role, update } = useStore();
  const [recordings, setRecordings] = useState<Visit[]>(() => {
    try {
      return JSON.parse(
        localStorage.getItem("zhenghui-demo-recordings") || "[]",
      );
    } catch {
      return [];
    }
  });
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [tab, setTab] = useState("visits");
  const [visitId, setVisitId] = useState("v1");
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const customer = state.customers.find((c) => c.id === customerId);
  const records = [...recordings, ...visits].filter(
    (v) => v.customerId === customerId,
  );
  const visit = records.find((v) => v.id === visitId) || records[0];
  const filtered = state.customers.filter(
    (c) =>
      `${c.name}${c.contact}${c.industry}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "all" ||
        (filter === "focus" && ["待跟进", "需求沟通"].includes(c.status)) ||
        (filter === "sample" && c.status === "样例验证") ||
        (filter === "won" && c.status === "已成交")),
  );
  useEffect(() => {
    window.speechSynthesis?.cancel();
    setPlaying(false);
  }, [customerId, visitId]);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  async function exportCustomers() {
    const XLSX = await import("xlsx");
    const items = selected.length
      ? state.customers.filter((c) => selected.includes(c.id))
      : filtered;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        items.map((c) => ({
          客户名称: c.name,
          行业: c.industry,
          联系人: c.contact,
          状态: c.status,
          意向金额: c.amount,
          负责人: c.owner,
        })),
      ),
      "客户列表",
    );
    XLSX.writeFile(wb, "正惠客户列表.xlsx");
    update(() => {}, "导出客户列表", `${items.length} 位客户`);
    toast.success(`已导出 ${items.length} 位客户`);
  }
  function play() {
    if (playing) {
      speechSynthesis.cancel();
      setPlaying(false);
      return;
    }
    if (!window.speechSynthesis) {
      toast.info("当前浏览器不支持朗读");
      return;
    }
    const u = new SpeechSynthesisUtterance(
      visit.transcript.map((t) => `${t.speaker}说：${t.text}`).join("。"),
    );
    u.lang = "zh-CN";
    u.onend = () => setPlaying(false);
    u.onerror = () => setPlaying(false);
    speechSynthesis.speak(u);
    setPlaying(true);
  }
  if (customer)
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto [&>*]:shrink-0 p-5 lg:p-7">
        <Button
          variant="ghost"
          className="w-fit"
          onClick={() => onSelect(null)}
        >
          <ArrowLeft data-icon="inline-start" />
          返回客户列表
        </Button>
        <PageHeader title={customer.name}>
          <Badge>{customer.status}</Badge>
          <Button onClick={onNewProject}>
            <Plus data-icon="inline-start" />
            创建需求
          </Button>
        </PageHeader>
        <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <Users className="size-4" />
            {customer.contact} · {customer.position}
          </span>
          <span className="flex items-center gap-2">
            <Phone className="size-4" />
            {customer.phone || "未填写"}
          </span>
          <span className="flex items-center gap-2">
            <Mail className="size-4" />
            {customer.email || "未填写"}
          </span>
        </div>
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { id: "visits", label: "客户沟通", count: records.length },
            {
              id: "projects",
              label: "关联项目",
              count: state.projects.filter((p) => p.customerId === customer.id)
                .length,
            },
            { id: "info", label: "客户信息" },
          ]}
        />
        {tab === "visits" && (
          <NewRecording
            key={customer.id}
            customer={customer}
            onSave={(record) => {
              const next = [record, ...recordings];
              setRecordings(next);
              setVisitId(record.id);
              try {
                localStorage.setItem(
                  "zhenghui-demo-recordings",
                  JSON.stringify(next),
                );
              } catch {
                toast.info("记录已保留在当前页面");
              }
              toast.success("录音演示记录已保存");
            }}
          />
        )}
        {tab === "visits" &&
          (visit ? (
            <div className="grid items-start gap-6 xl:grid-cols-[210px_1fr]">
              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-medium">沟通记录</h3>
                <ToggleGroup
                  type="single"
                  orientation="vertical"
                  value={visit.id}
                  onValueChange={(v) => {
                    if (v) setVisitId(v);
                  }}
                  variant="outline"
                  spacing={2}
                  className="flex-col items-stretch"
                >
                  {records.map((v) => (
                    <ToggleGroupItem
                      key={v.id}
                      value={v.id}
                      className="h-auto flex-col items-start gap-2 whitespace-normal p-3"
                    >
                      <Badge
                        tone={v.category === "客户会议" ? "green" : "neutral"}
                      >
                        {v.category === "客户会议" ? <Users /> : <AudioLines />}
                        {v.category}
                      </Badge>
                      <span className="text-left">{v.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {v.date} · {v.duration}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <Badge>
                          {v.id.startsWith("recording-")
                            ? "演示记录"
                            : "已转写"}
                        </Badge>
                      </div>
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
              <div className="flex min-w-0 flex-col gap-5">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex flex-wrap items-center gap-2">
                      <Badge
                        tone={
                          visit.category === "客户会议" ? "green" : "neutral"
                        }
                      >
                        {visit.category === "客户会议" ? (
                          <Users />
                        ) : (
                          <AudioLines />
                        )}
                        {visit.category}
                      </Badge>
                      {visit.title}
                    </CardTitle>
                    <CardDescription>
                      {visit.date} · 销售牵头：{visit.organizer}
                    </CardDescription>
                    <CardAction>
                      <div className="flex gap-2">
                        <Badge>录音示例</Badge>
                      </div>
                    </CardAction>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span>参与人员</span>
                      {visit.participants.map((person) => (
                        <Badge key={person}>{person}</Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-4">
                      <Button
                        size="icon"
                        onClick={play}
                        aria-label={playing ? "暂停朗读" : "播放转写演示"}
                      >
                        {playing ? <Pause /> : <Play />}
                      </Button>
                      <div className="flex flex-1 items-center gap-3">
                        <AudioLines className="size-8 text-muted-foreground" />
                        <span className="text-sm">
                          {playing
                            ? "正在朗读转写文本…"
                            : visit.category + "录音 · " + visit.duration}
                        </span>
                      </div>
                      <Badge>
                        {visit.id.startsWith("recording-")
                          ? "未采集音频"
                          : "已完成转写"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
                {!visit.id.startsWith("recording-") && (
                  <AINote title="AI 总结">
                    <p>
                      {visit.id === "v1"
                        ? "沟通要点：先验证 50 条企业样例，符合预期后采购 5 万条数据，预算约 28 万元。联系方式授权仍需确认。"
                        : visit.id === "v2"
                          ? "沟通要点：客户需要长三角制造业企业名单，用于普惠金融获客与贷前尽调，数量和预算尚未明确。"
                          : "沟通要点：客户认可当前样例，需要补充经营异常记录时间。"}
                    </p>
                    <p>
                      {visit.id === "v1"
                        ? "下一步：产品确认字段与验收口径，研发准备样例，销售同步交付时间。"
                        : visit.id === "v2"
                          ? "下一步：销售携带字段样例再次沟通，确认数据范围、数量与预算。"
                          : "下一步：产品明确时间格式，研发更新样例，销售跟进客户验收。"}
                    </p>
                  </AINote>
                )}
                <Card>
                  <CardHeader>
                    <CardTitle>完整文字转写</CardTitle>
                    <CardDescription>
                      逐条保留客户、销售、产品与研发的沟通内容。
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-5">
                    {visit.transcript.map((t, i) => (
                      <div key={i} className="flex items-start gap-4">
                        <time className="text-xs text-muted-foreground">
                          {t.time}
                        </time>
                        <div className="flex flex-col gap-2">
                          <strong className="text-sm font-medium">
                            {t.speaker}
                          </strong>
                          <p className="text-sm leading-7 text-muted-foreground">
                            {t.text}
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Empty
              title="还没有客户沟通记录"
              description="手机端完成录音后，转写和知识库点评将在这里展示。"
            />
          ))}
        {tab === "projects" && (
          <div className="flex flex-col gap-3">
            {state.projects
              .filter((p) => p.customerId === customer.id)
              .map((p) => (
                <Card key={p.id}>
                  <CardHeader>
                    <CardTitle>{p.name}</CardTitle>
                    <CardDescription>
                      {p.id} · 第 {p.round} 轮 ·{" "}
                      {p.phase === "sample" ? "样例验证" : "正式交付"}
                    </CardDescription>
                    <CardAction>
                      <Button variant="outline" onClick={() => onProject(p.id)}>
                        查看项目
                        <ArrowRight data-icon="inline-end" />
                      </Button>
                    </CardAction>
                  </CardHeader>
                  <CardContent>
                    <Badge>{stageLabels[p.stage]}</Badge>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
        {tab === "info" && (
          <Card>
            <CardHeader>
              <CardTitle>客户基本信息</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <dl className="grid grid-cols-2 gap-6 text-sm">
                {[
                  ["客户名称", customer.name],
                  ["所属行业", customer.industry],
                  ["联系人", customer.contact],
                  ["负责人", customer.owner],
                  ["意向金额", `¥ ${customer.amount.toLocaleString()}`],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="mb-2 text-muted-foreground">{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
                <div>
                  <dt className="mb-2 text-muted-foreground">客户状态</dt>
                  <dd>
                    <Choice
                      label="客户状态"
                      value={customer.status}
                      options={[
                        "合作中",
                        "样例验证",
                        "需求沟通",
                        "待跟进",
                        "已成交",
                      ]}
                      onChange={(value) =>
                        update(
                          (s) => {
                            s.customers.find(
                              (c) => c.id === customer.id,
                            )!.status = value;
                          },
                          "更新客户状态",
                          customer.name,
                        )
                      }
                    />
                  </dd>
                </div>
              </dl>
              <Separator />
              <p className="text-sm leading-7 text-muted-foreground">
                {customer.description || "暂未填写客户简介"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto [&>*]:shrink-0 p-5 lg:p-7">
      <PageHeader
        title="客户管理"
        description="维护客户资料、沟通记录与项目进展。"
      >
        <Button variant="outline" onClick={exportCustomers}>
          <ArrowDownToLine data-icon="inline-start" />
          导出
        </Button>
        <Button onClick={onNew}>
          <Plus data-icon="inline-start" />
          新建客户
        </Button>
      </PageHeader>
      <div className="flex shrink-0 flex-col gap-4">
        <Tabs
          value={filter}
          onChange={setFilter}
          items={[
            { id: "all", label: "全部客户" },
            { id: "focus", label: "重点跟进" },
            { id: "sample", label: "样例验证" },
            { id: "won", label: "已成交" },
          ]}
        />
        <div className="flex flex-wrap gap-3">
          <div className="min-w-40 flex-1">
            <SearchBox
              value={query}
              onChange={setQuery}
              placeholder="搜索客户名称、联系人…"
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Checkbox
                  aria-label="选择全部客户"
                  checked={
                    filtered.length > 0 &&
                    filtered.every((c) => selected.includes(c.id))
                  }
                  onCheckedChange={(v) =>
                    setSelected(v === true ? filtered.map((c) => c.id) : [])
                  }
                />
              </TableHead>
              <TableHead>客户名称</TableHead>
              <TableHead>联系人</TableHead>
              <TableHead>客户状态</TableHead>
              <TableHead>意向金额</TableHead>
              <TableHead>最近联系</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Checkbox
                    aria-label={`选择${c.name}`}
                    checked={selected.includes(c.id)}
                    onCheckedChange={(v) =>
                      setSelected(
                        v === true
                          ? [...selected, c.id]
                          : selected.filter((x) => x !== c.id),
                      )
                    }
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    className="h-auto justify-start gap-3 px-0 py-2"
                    onClick={() => onSelect(c.id)}
                  >
                    <Avatar name={c.short} />
                    <span className="flex flex-col items-start gap-1">
                      <span>{c.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {c.industry}
                      </span>
                    </span>
                  </Button>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span>{c.contact}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.position}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge tone={c.status === "已成交" ? "green" : "neutral"}>
                    {c.status}
                  </Badge>
                </TableCell>
                <TableCell>¥ {(c.amount / 10000).toFixed(0)} 万</TableCell>
                <TableCell className="text-muted-foreground">
                  {c.lastContact}
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={`查看${c.name}详情`}
                    onClick={() => onSelect(c.id)}
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
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            共 {filtered.length} 位客户
          </span>
          {selected.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
              清除选择
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
