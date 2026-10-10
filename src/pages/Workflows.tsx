import { useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  applyNodeChanges,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Copy,
  GitBranch,
  Maximize2,
  Plus,
  Save,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "../lib/store";
import {
  bindings,
  nodeKinds,
  inFlight,
  validateWorkflow,
  type Binding,
  type NodeKind,
  type WorkflowDefinition,
  type WorkflowNode,
  type WorkflowVersion,
} from "../lib/workflow";
import { uid, cn } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "../components/ui/field";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "../components/ui/select";
import { Input } from "../components/ui/input";
import { Checkbox } from "../components/ui/checkbox";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../components/ui/dialog";
import { Alert, AlertTitle, AlertDescription } from "../components/ui/alert";
import { Textarea } from "../components/ui/textarea";

function Choice({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger aria-label={label} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map(([v, text]) => (
              <SelectItem key={v} value={v}>
                {text}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}
type CanvasNode = Node<{ node: WorkflowNode }, "workflow">;
function FlowNode({ data, selected }: NodeProps<CanvasNode>) {
  const { node } = data;
  const branching = node.kind === "approval" || node.kind === "condition";
  return (
    <>
      {node.kind !== "start" && (
        <Handle type="target" position={Position.Top} />
      )}
      <Card
        size="sm"
        className={cn("w-56", selected && "outline-2 outline-primary")}
      >
        <CardHeader>
          <CardDescription>{nodeKinds[node.kind]}</CardDescription>
          <CardTitle>{node.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">
            {bindings[node.binding]}
          </span>
        </CardContent>
      </Card>
      {branching ? (
        <>
          <Handle
            type="source"
            id="yes"
            position={Position.Bottom}
            style={{ left: "30%" }}
          />
          <Handle
            type="source"
            id="no"
            position={Position.Bottom}
            style={{ left: "70%" }}
          />
        </>
      ) : (
        !["end", "terminate"].includes(node.kind) && (
          <Handle type="source" id="out" position={Position.Bottom} />
        )
      )}
    </>
  );
}
const nodeTypes = { workflow: FlowNode };
const kindOptions = Object.entries(nodeKinds) as [NodeKind, string][];
const bindingOptions = Object.entries(bindings) as [Binding, string][];

export default function Workflows() {
  const { state, role, update } = useStore();
  const config = state.workflow!;
  const [draft, setDraft] = useState<WorkflowDefinition>(() =>
    structuredClone(config.draft),
  );
  const [selectedId, setSelectedId] = useState("intake");
  const [editing, setEditing] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenTab, setFullscreenTab] = useState("dsl");
  const [addKind, setAddKind] = useState<NodeKind>("approval");
  const [confirm, setConfirm] = useState<"edit" | "publish" | null>(null);
  const [note, setNote] = useState("");
  const selected = draft.nodes.find((n) => n.id === selectedId);
  const inflight = inFlight(state.projects);
  const errors = validateWorkflow(draft);
  const dirty = JSON.stringify(draft) !== JSON.stringify(config.draft);
  const dsl = JSON.stringify(
    { schema: "zhenghui.workflow/v1", nodes: draft.nodes, edges: draft.edges },
    null,
    2,
  );
  const nodes: CanvasNode[] = draft.nodes.map((node) => ({
    id: node.id,
    type: "workflow",
    position: node.position,
    selected: node.id === selectedId,
    data: { node },
  }));
  const edges = draft.edges.map((e) => ({
    ...e,
    sourceHandle: ["approval", "condition"].includes(
      draft.nodes.find((n) => n.id === e.source)?.kind || "",
    )
      ? e.branch
      : "out",
    type: "smoothstep",
    label:
      e.branch === "yes"
        ? "成立 / 通过"
        : e.branch === "no"
          ? "不成立 / 拒绝"
          : undefined,
  }));
  function openFullscreen(view: string) {
    setFullscreenTab(view);
    setFullscreen(true);
  }
  function change(fn: (d: WorkflowDefinition) => void) {
    if (!editing || role !== "admin") return;
    setDraft((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
  }
  function patch(p: Partial<WorkflowNode>) {
    change((d) => {
      const node = d.nodes.find((n) => n.id === selectedId);
      if (node) Object.assign(node, p);
    });
  }
  function connect(source: string, target: string, branch?: "yes" | "no") {
    change((d) => {
      if (!target || target === "none") {
        d.edges = d.edges.filter(
          (e) => !(e.source === source && e.branch === branch),
        );
        return;
      }
      const node = d.nodes.find((n) => n.id === source);
      if (
        !node ||
        ["end", "terminate"].includes(node.kind) ||
        source === target
      )
        return;
      if (node.kind !== "parallel")
        d.edges = d.edges.filter(
          (e) => !(e.source === source && e.branch === branch),
        );
      if (
        !d.edges.some(
          (e) =>
            e.source === source && e.target === target && e.branch === branch,
        )
      )
        d.edges.push({ id: uid(), source, target, branch });
    });
  }
  function saveDraft() {
    update(
      (s) => {
        s.workflow!.draft = structuredClone(draft);
      },
      "保存流程草稿",
      "业务流程",
    );
    toast.success("草稿已保存，尚未生效");
  }
  function publish() {
    if (role !== "admin") return;
    if (confirm === "edit") {
      setEditing(true);
      setConfirm(null);
      return;
    }
    const definition = draft;
    const validation = validateWorkflow(definition);
    if (validation.length) {
      toast.error(validation[0]);
      setConfirm(null);
      return;
    }
    update(
      (s) => {
        const c = s.workflow!;
        const number = Math.max(...c.versions.map((v) => v.number)) + 1;
        const version: WorkflowVersion = {
          id: uid(),
          number,
          definition: structuredClone(definition),
          createdAt: new Date().toLocaleString("sv-SE"),
          note: note.trim() || "更新业务流程",
        };
        c.versions = [version];
        c.activeId = version.id;
        c.draft = structuredClone(definition);
      },
      "发布流程配置",
      "业务流程",
    );
    setDraft(structuredClone(definition));
    setEditing(false);
    setConfirm(null);
    setNote("");
    toast.success("流程配置已发布，仅供后续发起的项目使用");
  }
  const targetOptions: [string, string][] = [
    ["none", "未连接"],
    ...draft.nodes
      .filter((n) => n.id !== selectedId && n.kind !== "start")
      .map((n) => [n.id, n.name] as [string, string]),
  ];
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-auto p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">自定义流程</h1>
            <Badge variant="secondary">已发布</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            按角色编排业务，让每一步都清晰可见。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => openFullscreen("dsl")}>
            <Maximize2 data-icon="inline-start" />
            全屏查看 DSL
          </Button>
          <Button variant="outline" disabled={!editing} onClick={saveDraft}>
            <Save data-icon="inline-start" />
            保存草稿{dirty ? " · 未保存" : ""}
          </Button>
          <Button
            disabled={!editing || errors.length > 0}
            onClick={() => setConfirm("publish")}
          >
            发布配置
          </Button>
        </div>
      </div>
      <Alert>
        <ShieldCheck />
        <AlertTitle>配置更新只影响后续发起的项目</AlertTitle>
        <AlertDescription>
          当前有 {inflight.length}{" "}
          个在途项目，均保留发起时的规则。处理人按岗位或项目关系自动解析；管理员仅参与需求承接审批。
        </AlertDescription>
      </Alert>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            点击节点配置规则，拖动节点排列；拖动连接点或选择后续节点来连线。
          </p>
          {!editing ? (
            <Button variant="outline" onClick={() => setConfirm("edit")}>
              修改流程
            </Button>
          ) : (
            <Badge variant="outline">编辑草稿 · 尚未生效</Badge>
          )}
        </div>
        {editing && errors.length > 0 && (
          <Alert variant="destructive">
            <AlertTitle>发布前请完善配置</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        <div className="grid items-start gap-4 xl:grid-cols-[190px_minmax(0,1fr)_300px]">
          <Card>
            <CardHeader>
              <CardTitle>节点工具箱</CardTitle>
              <CardDescription>无需编写代码</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Choice
                  label="节点类型"
                  value={addKind}
                  options={kindOptions}
                  onChange={(v) => setAddKind(v as NodeKind)}
                  disabled={!editing}
                />
                <Button
                  variant="outline"
                  disabled={!editing}
                  onClick={() => {
                    const id = uid();
                    change((d) =>
                      d.nodes.push({
                        id,
                        kind: addKind,
                        name: nodeKinds[addKind],
                        binding: "product",
                        position: { x: 580, y: d.nodes.length * 90 },
                        ...(addKind === "condition"
                          ? {
                              field: "amount" as const,
                              operator: "gte" as const,
                              value: "100000",
                            }
                          : {}),
                      }),
                    );
                    setSelectedId(id);
                  }}
                >
                  <Plus data-icon="inline-start" />
                  添加节点
                </Button>
              </FieldGroup>
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-2">
              <Badge variant="outline">
                <GitBranch />
                条件分流
              </Badge>
              <Badge variant="outline">全员会签后汇聚</Badge>
              <p className="text-xs text-muted-foreground">
                审批和条件节点的左下连接点表示通过 / 成立，右下表示拒绝 /
                不成立。点击连线按 Delete 可移除。
              </p>
            </CardFooter>
          </Card>
          <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border bg-muted/20">
            <div className="flex items-center justify-between border-b bg-background px-3 py-2">
              <span className="text-sm text-muted-foreground">流程画布</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => openFullscreen("graph")}
              >
                <Maximize2 data-icon="inline-start" />
                全屏流程图
              </Button>
            </div>
            <div className="h-[660px]" aria-label="流程设计画布">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                fitView
                minZoom={0.2}
                maxZoom={1.5}
                nodesDraggable={editing}
                nodesConnectable={editing}
                deleteKeyCode={editing ? ["Backspace", "Delete"] : null}
                onNodeClick={(_, node) => setSelectedId(node.id)}
                onNodesChange={(changes) => {
                  const positions = applyNodeChanges(
                    changes.filter((c) => c.type === "position"),
                    nodes,
                  );
                  if (changes.some((c) => c.type === "position"))
                    change((d) => {
                      d.nodes.forEach((n) => {
                        const pos = positions.find((p) => p.id === n.id);
                        if (pos) n.position = pos.position;
                      });
                    });
                }}
                onEdgesDelete={(deleted) =>
                  change((d) => {
                    d.edges = d.edges.filter(
                      (e) => !deleted.some((x) => x.id === e.id),
                    );
                  })
                }
                onConnect={(c) =>
                  connect(
                    c.source,
                    c.target,
                    c.sourceHandle === "yes"
                      ? "yes"
                      : c.sourceHandle === "no"
                        ? "no"
                        : undefined,
                  )
                }
              >
                <Background />
                <Controls showInteractive={false} />
              </ReactFlow>
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>节点配置</CardTitle>
              <CardDescription>
                {selected ? nodeKinds[selected.kind] : "选择画布中的节点"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selected && (
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="node-name">节点名称</FieldLabel>
                    <Input
                      id="node-name"
                      value={selected.name}
                      disabled={!editing || selected.binding === "intake"}
                      onChange={(e) => patch({ name: e.target.value })}
                    />
                  </Field>
                  <Choice
                    label="处理人绑定"
                    value={selected.binding}
                    options={bindingOptions.filter(
                      ([b]) => b !== "intake" || selected.kind === "approval",
                    )}
                    disabled={!editing}
                    onChange={(v) =>
                      patch({
                        binding: v as Binding,
                        ...(v === "intake" ? { name: "需求承接审批" } : {}),
                      })
                    }
                  />
                  <FieldDescription>
                    只保存角色或项目关系，不保存固定人员姓名。审批节点的全部处理人均需通过。
                  </FieldDescription>
                  {selected.kind === "condition" && (
                    <>
                      <Choice
                        label="条件字段"
                        value={selected.field || "amount"}
                        options={[
                          ["amount", "项目金额（元）"],
                          ["priority", "优先级"],
                          ["phase", "交付阶段"],
                        ]}
                        disabled={!editing}
                        onChange={(v) =>
                          patch({
                            field: v as WorkflowNode["field"],
                            operator: v === "amount" ? "gte" : "eq",
                            value:
                              v === "amount"
                                ? "100000"
                                : v === "phase"
                                  ? "sample"
                                  : "高",
                          })
                        }
                      />
                      <Choice
                        label="判断方式"
                        value={selected.operator || "gte"}
                        options={
                          selected.field === "amount"
                            ? [
                                ["gte", "大于等于"],
                                ["eq", "等于"],
                              ]
                            : [["eq", "等于"]]
                        }
                        disabled={!editing}
                        onChange={(v) => patch({ operator: v as "gte" | "eq" })}
                      />
                      {selected.field === "amount" ? (
                        <Field>
                          <FieldLabel htmlFor="condition-value">
                            条件值
                          </FieldLabel>
                          <Input
                            id="condition-value"
                            type="number"
                            min="0"
                            value={selected.value || ""}
                            disabled={!editing}
                            onChange={(e) => patch({ value: e.target.value })}
                          />
                        </Field>
                      ) : (
                        <Choice
                          label="条件值"
                          value={selected.value || ""}
                          options={
                            selected.field === "phase"
                              ? [
                                  ["sample", "样例交付"],
                                  ["full", "正式交付"],
                                ]
                              : [
                                  ["高", "高"],
                                  ["中", "中"],
                                  ["低", "低"],
                                ]
                          }
                          disabled={!editing}
                          onChange={(v) => patch({ value: v })}
                        />
                      )}
                    </>
                  )}
                  {["condition", "approval"].includes(selected.kind) ? (
                    (["yes", "no"] as const).map((b) => (
                      <Choice
                        key={b}
                        label={
                          b === "yes" ? "成立 / 通过后" : "不成立 / 拒绝后"
                        }
                        value={
                          draft.edges.find(
                            (e) => e.source === selected.id && e.branch === b,
                          )?.target || "none"
                        }
                        options={targetOptions}
                        disabled={!editing}
                        onChange={(v) => connect(selected.id, v, b)}
                      />
                    ))
                  ) : selected.kind === "parallel" ? (
                    <Field>
                      <FieldLabel>并行会签分支</FieldLabel>
                      {targetOptions
                        .filter(([v]) => v !== "none")
                        .map(([id, text]) => (
                          <Field key={id} orientation="horizontal">
                            <Checkbox
                              id={`branch-${id}`}
                              disabled={!editing}
                              checked={draft.edges.some(
                                (e) =>
                                  e.source === selected.id && e.target === id,
                              )}
                              onCheckedChange={(v) =>
                                v
                                  ? connect(selected.id, id)
                                  : change((d) => {
                                      d.edges = d.edges.filter(
                                        (e) =>
                                          !(
                                            e.source === selected.id &&
                                            e.target === id
                                          ),
                                      );
                                    })
                              }
                            />
                            <FieldLabel htmlFor={`branch-${id}`}>
                              {text}
                            </FieldLabel>
                          </Field>
                        ))}
                      <FieldDescription>
                        所有有效分支均完成后，汇聚节点才可继续。
                      </FieldDescription>
                    </Field>
                  ) : (
                    !["end", "terminate"].includes(selected.kind) && (
                      <Choice
                        label="后续节点"
                        value={
                          draft.edges.find((e) => e.source === selected.id)
                            ?.target || "none"
                        }
                        options={targetOptions}
                        disabled={!editing}
                        onChange={(v) => connect(selected.id, v)}
                      />
                    )
                  )}
                </FieldGroup>
              )}
            </CardContent>
            {selected && (
              <CardFooter>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={!editing || selected.kind === "start"}
                  onClick={() => {
                    change((d) => {
                      d.nodes = d.nodes.filter((n) => n.id !== selected.id);
                      d.edges = d.edges.filter(
                        (e) =>
                          e.source !== selected.id && e.target !== selected.id,
                      );
                    });
                    setSelectedId("start");
                  }}
                >
                  删除节点
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
        <Field>
          <FieldLabel htmlFor="version-note">更新说明</FieldLabel>
          <Input
            id="version-note"
            placeholder="例如：高金额项目增加产品与研发联合会签"
            disabled={!editing}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </div>
      <Dialog
        open={!!confirm}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirm === "edit" ? "修改流程规则" : "确认发布流程配置"}
            </DialogTitle>
            <DialogDescription>
              当前有 {inflight.length}{" "}
              个在途项目。这些项目沿用发起时的流程规则，新配置仅供发布后新发起的项目使用。
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <ShieldCheck />
            <AlertTitle>在途项目不受影响</AlertTitle>
            <AlertDescription>
              系统保留项目原流程快照；不会替换已发起项目的节点、分支或处理人绑定规则。
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              取消
            </Button>
            <Button onClick={publish}>
              {confirm === "edit" ? "继续编辑" : "确认发布"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="inset-0 flex h-dvh w-screen data-open:animate-none data-closed:animate-none max-w-none translate-x-0 translate-y-0 flex-col gap-3 rounded-none p-4 sm:max-w-none sm:p-6">
          <DialogHeader className="pr-10">
            <DialogTitle>业务流程 · 全屏查看</DialogTitle>
            <DialogDescription>
              查看当前草稿的流程图与 DSL
              定义，节点通过岗位角色或项目关系绑定处理人。
            </DialogDescription>
          </DialogHeader>
          <Tabs
            value={fullscreenTab}
            onValueChange={setFullscreenTab}
            className="flex min-h-0 flex-1 flex-col gap-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <TabsList>
                <TabsTrigger value="graph">流程图</TabsTrigger>
                <TabsTrigger value="dsl">DSL</TabsTrigger>
              </TabsList>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(dsl);
                    toast.success("DSL 已复制");
                  } catch {
                    toast.error("复制失败，请选中 DSL 文本手动复制");
                  }
                }}
              >
                <Copy data-icon="inline-start" />
                复制 DSL
              </Button>
            </div>
            <TabsContent
              value="graph"
              className="min-h-0 flex-1 overflow-hidden rounded-lg border"
            >
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                fitView
                minZoom={0.2}
                maxZoom={1.5}
                nodesDraggable={false}
                nodesConnectable={false}
                deleteKeyCode={null}
              >
                <Background />
                <Controls showInteractive={false} />
              </ReactFlow>
            </TabsContent>
            <TabsContent value="dsl" className="flex min-h-0 flex-1 flex-col">
              <Textarea
                aria-label="流程 DSL"
                readOnly
                value={dsl}
                spellCheck={false}
                className="min-h-0 flex-1 resize-none font-mono text-xs"
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
