import { useState } from "react";
import { ReactFlow, Background, Controls, Handle, Position, applyNodeChanges, type Node, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { GitBranch, Plus, Play, RotateCcw, Save, ShieldCheck, Workflow } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "../lib/store";
import { bindings, nodeKinds, inFlight, simulateWorkflow, validateWorkflow, type Binding, type NodeKind, type RunStep, type WorkflowDefinition, type WorkflowNode, type WorkflowVersion } from "../lib/workflow";
import { uid, cn } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../components/ui/card";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "../components/ui/field";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from "../components/ui/select";
import { Input } from "../components/ui/input";
import { Checkbox } from "../components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/dialog";
import { Alert, AlertTitle, AlertDescription } from "../components/ui/alert";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "../components/ui/table";

function Choice({ label, value, options, onChange, disabled = false }: { label: string; value: string; options: [string, string][]; onChange: (v: string) => void; disabled?: boolean }) {
  return <Field><FieldLabel>{label}</FieldLabel><Select value={value} onValueChange={onChange} disabled={disabled}><SelectTrigger aria-label={label} className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{options.map(([v, text]) => <SelectItem key={v} value={v}>{text}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>;
}
type CanvasNode = Node<{ node: WorkflowNode; step?: RunStep; current: boolean }, "workflow">;
function FlowNode({ data, selected }: NodeProps<CanvasNode>) {
  const { node, step } = data;
  const branching = node.kind === "approval" || node.kind === "condition";
  return <>
    {node.kind !== "start" && <Handle type="target" position={Position.Top} />}
    <Card size="sm" className={cn("w-56", (selected || data.current) && "outline-2 outline-primary", step?.status === "blocked" && "outline-2 outline-destructive")}>
      <CardHeader><CardDescription>{nodeKinds[node.kind]}</CardDescription><CardTitle>{node.name}</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-2"><span className="text-xs text-muted-foreground">{bindings[node.binding]}</span>{step && <><Badge variant={step.status === "blocked" || step.status === "rejected" ? "destructive" : "secondary"}>{step.status === "blocked" ? "处理人缺失" : step.status === "terminated" ? "已终止" : step.status === "rejected" ? "已拒绝" : "已通过"}</Badge><span className="text-xs">{step.actors.join("、")}</span></>}</CardContent>
    </Card>
    {branching ? <><Handle type="source" id="yes" position={Position.Bottom} style={{ left: "30%" }} /><Handle type="source" id="no" position={Position.Bottom} style={{ left: "70%" }} /></> : !["end", "terminate"].includes(node.kind) && <Handle type="source" id="out" position={Position.Bottom} />}
  </>;
}
const nodeTypes = { workflow: FlowNode };
const kindOptions = Object.entries(nodeKinds) as [NodeKind, string][];
const bindingOptions = Object.entries(bindings) as [Binding, string][];

export default function Workflows() {
  const { state, role, update } = useStore();
  const config = state.workflow!;
  const active = config.versions.find(v => v.id === config.activeId)!;
  const [draft, setDraft] = useState<WorkflowDefinition>(() => structuredClone(config.draft));
  const [selectedId, setSelectedId] = useState("intake");
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState("design");
  const [addKind, setAddKind] = useState<NodeKind>("approval");
  const [confirm, setConfirm] = useState<"edit" | "publish" | WorkflowVersion | null>(null);
  const [preview, setPreview] = useState<WorkflowVersion | null>(null);
  const [note, setNote] = useState("");
  const [projectId, setProjectId] = useState(state.projects.find(p => p.developers.length)?.id || state.projects[0]?.id || "");
  const project = state.projects.find(p => p.id === projectId);
  const [amount, setAmount] = useState("150000");
  const [priority, setPriority] = useState("高");
  const [phase, setPhase] = useState("sample");
  const [reject, setReject] = useState("none");
  const [steps, setSteps] = useState<RunStep[]>([]);
  const [cursor, setCursor] = useState(0);
  const [simulationSource, setSimulationSource] = useState("draft");
  const [runDefinition, setRunDefinition] = useState<WorkflowDefinition | null>(null);
  const selected = draft.nodes.find(n => n.id === selectedId);
  const inflight = inFlight(state.projects);
  const errors = validateWorkflow(draft);
  const dirty = JSON.stringify(draft) !== JSON.stringify(config.draft);
  const displayed = preview?.definition || (tab === "simulate" ? runDefinition || draft : draft);
  const visibleSteps = tab === "simulate" ? steps.slice(0, cursor) : [];
  const nodes: CanvasNode[] = displayed.nodes.map(node => ({ id: node.id, type: "workflow", position: node.position, selected: tab === "design" && node.id === selectedId, data: { node, step: visibleSteps.find(s => s.nodeId === node.id), current: visibleSteps.at(-1)?.nodeId === node.id } }));
  const edges = displayed.edges.map(e => ({ ...e, type: "smoothstep", label: e.branch === "yes" ? "成立 / 通过" : e.branch === "no" ? "不成立 / 拒绝" : undefined, animated: visibleSteps.some(s => s.nodeId === e.target) }));
  function change(fn: (d: WorkflowDefinition) => void) {
    if (!editing || role !== "admin") return;
    setDraft(prev => { const next = structuredClone(prev); fn(next); return next; });
    setSteps([]); setCursor(0); setRunDefinition(null);
  }
  function patch(p: Partial<WorkflowNode>) { change(d => { const node = d.nodes.find(n => n.id === selectedId); if (node) Object.assign(node, p); }); }
  function connect(source: string, target: string, branch?: "yes" | "no") {
    change(d => {
      if (!target || target === "none") { d.edges = d.edges.filter(e => !(e.source === source && e.branch === branch)); return; }
      const node = d.nodes.find(n => n.id === source);
      if (!node || ["end", "terminate"].includes(node.kind) || source === target) return;
      if (node.kind !== "parallel") d.edges = d.edges.filter(e => !(e.source === source && e.branch === branch));
      if (!d.edges.some(e => e.source === source && e.target === target && e.branch === branch)) d.edges.push({ id: uid(), source, target, branch });
    });
  }
  function saveDraft() {
    update(s => { s.workflow!.draft = structuredClone(draft); }, "保存流程草稿", "业务流程");
    toast.success("草稿已保存，尚未生效");
  }
  function publish() {
    if (role !== "admin") return;
    if (confirm === "edit") { setEditing(true); setConfirm(null); return; }
    const definition = typeof confirm === "object" && confirm ? confirm.definition : draft;
    const validation = validateWorkflow(definition);
    if (validation.length) { toast.error(validation[0]); setConfirm(null); return; }
    const rollback = typeof confirm === "object" && confirm ? confirm : null;
    update(s => {
      const c = s.workflow!;
      const number = Math.max(...c.versions.map(v => v.number)) + 1;
      const version: WorkflowVersion = { id: uid(), number, definition: structuredClone(definition), createdAt: new Date().toLocaleString("sv-SE"), note: rollback ? `回退至 V${rollback.number} 的配置` : note.trim() || "更新业务流程" };
      c.versions.unshift(version); c.activeId = version.id; c.draft = structuredClone(definition);
    }, rollback ? "回退流程版本" : "发布流程版本", "业务流程");
    setDraft(structuredClone(definition)); setEditing(false); setPreview(null); setConfirm(null); setNote(""); setSteps([]); setCursor(0); setRunDefinition(null);
    toast.success(rollback ? "已按历史配置发布新版本，在途项目不受影响" : "新版本已发布，仅供后续发起的项目使用");
  }
  function simulate() {
    if (!project || !Number.isFinite(Number(amount)) || Number(amount) < 0) { toast.error("请选择项目并填写有效模拟金额"); return; }
    const definition = simulationSource === "project" ? project.workflowSnapshot?.definition : draft;
    if (!definition) { toast.error("该项目尚未发起，无绑定流程快照"); return; }
    try {
      const result = simulateWorkflow(definition, { ...project, amount: Number(amount), priority, phase: phase as "sample" | "full" }, state.policies, reject === "none" ? "" : reject);
      setRunDefinition(structuredClone(definition)); setSteps(result); setCursor(1);
    } catch (error) { toast.error((error as Error).message); }
  }
  const targetOptions: [string, string][] = [["none", "未连接"], ...draft.nodes.filter(n => n.id !== selectedId && n.kind !== "start").map(n => [n.id, n.name] as [string, string])];
  return <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-auto p-4 md:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex flex-col gap-1"><div className="flex items-center gap-2"><h1 className="text-2xl font-semibold">自定义流程</h1><Badge variant="secondary">V{active.number} 已发布</Badge></div><p className="text-sm text-muted-foreground">按角色编排业务，让每一步都清晰可见。</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => { setTab("simulate"); setPreview(null); }}><Play data-icon="inline-start" />流程试跑</Button><Button variant="outline" disabled={!editing} onClick={saveDraft}><Save data-icon="inline-start" />保存草稿{dirty ? " · 未保存" : ""}</Button><Button disabled={!editing || errors.length > 0} onClick={() => setConfirm("publish")}>发布新版本</Button></div></div>
    <Alert><ShieldCheck /><AlertTitle>配置更新只影响后续发起的项目</AlertTitle><AlertDescription>当前有 {inflight.length} 个在途项目，均保留发起时的规则。处理人按岗位或项目关系自动解析；管理员仅参与需求承接审批。</AlertDescription></Alert>
    <Tabs value={tab} onValueChange={v => { setTab(v); setPreview(null); }} className="flex flex-col gap-4">
      <TabsList><TabsTrigger value="design">流程设计</TabsTrigger><TabsTrigger value="simulate">模拟试跑</TabsTrigger><TabsTrigger value="versions">版本管理</TabsTrigger></TabsList>
      <TabsContent value="design" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-muted-foreground">点击节点配置规则，拖动节点排列；拖动连接点或选择后续节点来连线。</p>{!editing ? <Button variant="outline" onClick={() => setConfirm("edit")}>修改流程</Button> : <Badge variant="outline">编辑草稿 · 不影响已发布版本</Badge>}</div>
        {editing && errors.length > 0 && <Alert variant="destructive"><AlertTitle>发布前请完善配置</AlertTitle><AlertDescription><ul className="list-disc pl-4">{errors.map(e => <li key={e}>{e}</li>)}</ul></AlertDescription></Alert>}
        <div className="grid items-start gap-4 xl:grid-cols-[190px_minmax(0,1fr)_300px]">
          <Card><CardHeader><CardTitle>节点工具箱</CardTitle><CardDescription>无需编写代码</CardDescription></CardHeader><CardContent><FieldGroup><Choice label="节点类型" value={addKind} options={kindOptions} onChange={v => setAddKind(v as NodeKind)} disabled={!editing} /><Button variant="outline" disabled={!editing} onClick={() => { const id = uid(); change(d => d.nodes.push({ id, kind: addKind, name: nodeKinds[addKind], binding: "product", position: { x: 580, y: d.nodes.length * 90 } , ...(addKind === "condition" ? { field: "amount" as const, operator: "gte" as const, value: "100000" } : {}) })); setSelectedId(id); }}><Plus data-icon="inline-start" />添加节点</Button></FieldGroup></CardContent><CardFooter className="flex flex-col items-start gap-2"><Badge variant="outline"><GitBranch />条件分流</Badge><Badge variant="outline">全员会签后汇聚</Badge><p className="text-xs text-muted-foreground">审批和条件节点的左下连接点表示通过 / 成立，右下表示拒绝 / 不成立。点击连线按 Delete 可移除。</p></CardFooter></Card>
          <div className="h-[660px] min-w-0 overflow-hidden rounded-xl border bg-muted/20" aria-label="流程设计画布">
            <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView minZoom={0.2} maxZoom={1.5} nodesDraggable={editing} nodesConnectable={editing} deleteKeyCode={editing ? ["Backspace", "Delete"] : null}
              onNodeClick={(_, node) => setSelectedId(node.id)}
              onNodesChange={changes => { const positions = applyNodeChanges(changes.filter(c => c.type === "position"), nodes); if (changes.some(c => c.type === "position")) change(d => { d.nodes.forEach(n => { const pos = positions.find(p => p.id === n.id); if (pos) n.position = pos.position; }); }); }}
              onEdgesDelete={deleted => change(d => { d.edges = d.edges.filter(e => !deleted.some(x => x.id === e.id)); })}
              onConnect={c => connect(c.source, c.target, c.sourceHandle === "yes" ? "yes" : c.sourceHandle === "no" ? "no" : undefined)}><Background /><Controls showInteractive={false} /></ReactFlow>
          </div>
          <Card><CardHeader><CardTitle>节点配置</CardTitle><CardDescription>{selected ? nodeKinds[selected.kind] : "选择画布中的节点"}</CardDescription></CardHeader><CardContent>{selected && <FieldGroup>
            <Field><FieldLabel htmlFor="node-name">节点名称</FieldLabel><Input id="node-name" value={selected.name} disabled={!editing || selected.binding === "intake"} onChange={e => patch({ name: e.target.value })} /></Field>
            <Choice label="处理人绑定" value={selected.binding} options={bindingOptions.filter(([b]) => b !== "intake" || selected.kind === "approval")} disabled={!editing} onChange={v => patch({ binding: v as Binding, ...(v === "intake" ? { name: "需求承接审批" } : {}) })} />
            <FieldDescription>只保存角色或项目关系，不保存固定人员姓名。审批节点的全部处理人均需通过。</FieldDescription>
            {selected.kind === "condition" && <><Choice label="条件字段" value={selected.field || "amount"} options={[["amount", "项目金额（元）"], ["priority", "优先级"], ["phase", "交付阶段"]]} disabled={!editing} onChange={v => patch({ field: v as WorkflowNode["field"], operator: v === "amount" ? "gte" : "eq", value: v === "amount" ? "100000" : v === "phase" ? "sample" : "高" })} /><Choice label="判断方式" value={selected.operator || "gte"} options={selected.field === "amount" ? [["gte", "大于等于"], ["eq", "等于"]] : [["eq", "等于"]]} disabled={!editing} onChange={v => patch({ operator: v as "gte" | "eq" })} />{selected.field === "amount" ? <Field><FieldLabel htmlFor="condition-value">条件值</FieldLabel><Input id="condition-value" type="number" min="0" value={selected.value || ""} disabled={!editing} onChange={e => patch({ value: e.target.value })} /></Field> : <Choice label="条件值" value={selected.value || ""} options={selected.field === "phase" ? [["sample", "样例交付"], ["full", "正式交付"]] : [["高", "高"], ["中", "中"], ["低", "低"]]} disabled={!editing} onChange={v => patch({ value: v })} />}</>}
            {["condition", "approval"].includes(selected.kind) ? (["yes", "no"] as const).map(b => <Choice key={b} label={b === "yes" ? "成立 / 通过后" : "不成立 / 拒绝后"} value={draft.edges.find(e => e.source === selected.id && e.branch === b)?.target || "none"} options={targetOptions} disabled={!editing} onChange={v => connect(selected.id, v, b)} />) : selected.kind === "parallel" ? <Field><FieldLabel>并行会签分支</FieldLabel>{targetOptions.filter(([v]) => v !== "none").map(([id, text]) => <Field key={id} orientation="horizontal"><Checkbox id={`branch-${id}`} disabled={!editing} checked={draft.edges.some(e => e.source === selected.id && e.target === id)} onCheckedChange={v => v ? connect(selected.id, id) : change(d => { d.edges = d.edges.filter(e => !(e.source === selected.id && e.target === id)); })} /><FieldLabel htmlFor={`branch-${id}`}>{text}</FieldLabel></Field>)}<FieldDescription>所有有效分支均完成后，汇聚节点才可继续。</FieldDescription></Field> : !["end", "terminate"].includes(selected.kind) && <Choice label="后续节点" value={draft.edges.find(e => e.source === selected.id)?.target || "none"} options={targetOptions} disabled={!editing} onChange={v => connect(selected.id, v)} />}
          </FieldGroup>}</CardContent>{selected && <CardFooter><Button variant="destructive" size="sm" disabled={!editing || selected.kind === "start"} onClick={() => { change(d => { d.nodes = d.nodes.filter(n => n.id !== selected.id); d.edges = d.edges.filter(e => e.source !== selected.id && e.target !== selected.id); }); setSelectedId("start"); }}>删除节点</Button></CardFooter>}</Card>
        </div>
        <Field><FieldLabel htmlFor="version-note">发布说明</FieldLabel><Input id="version-note" placeholder="例如：高金额项目增加产品与研发联合会签" disabled={!editing} value={note} onChange={e => setNote(e.target.value)} /></Field>
      </TabsContent>
      <TabsContent value="simulate" className="flex flex-col gap-4">
        <div className="grid items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <Card><CardHeader><CardTitle>模拟业务数据</CardTitle><CardDescription>沿用真实项目关系解析处理人，模拟不会修改项目。</CardDescription></CardHeader><CardContent><FieldGroup>
            <Choice label="试跑规则" value={simulationSource} options={[["draft", "当前草稿"], ["project", "项目发起时的规则"]]} onChange={v => { setSimulationSource(v); setSteps([]); setCursor(0); setRunDefinition(null); }} />
            <Choice label="模拟项目" value={projectId} options={state.projects.map(p => [p.id, `${p.id} · ${p.name}`])} onChange={v => { setProjectId(v); setSteps([]); setCursor(0); setRunDefinition(null); }} />
            <FieldDescription>{project?.workflowSnapshot ? `项目绑定 V${project.workflowSnapshot.number}` : "项目尚未发起"} · 销售 {project?.owner || "未指定"} · 产品 {project?.product || "未指定"} · 研发 {project?.developers.join("、") || "未指定（进入该节点将阻塞）"}</FieldDescription>
            <Field><FieldLabel htmlFor="simulation-amount">模拟金额（元）</FieldLabel><Input id="simulation-amount" type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} /></Field>
            <Choice label="模拟优先级" value={priority} options={[["高", "高"], ["中", "中"], ["低", "低"]]} onChange={setPriority} />
            <Choice label="模拟交付阶段" value={phase} options={[["sample", "样例交付"], ["full", "正式交付"]]} onChange={setPhase} />
            <Choice label="审批结果" value={reject} options={[["none", "全部审批通过"], ...(simulationSource === "project" ? project?.workflowSnapshot?.definition || draft : draft).nodes.filter(n => n.kind === "approval").map(n => [n.id, `${n.name}：拒绝`] as [string, string])]} onChange={setReject} />
            <Button onClick={simulate}><Play data-icon="inline-start" />开始试跑</Button>
          </FieldGroup></CardContent><CardFooter className="flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={!steps.length || cursor >= steps.length} onClick={() => setCursor(c => c + 1)}>下一步</Button><Button variant="outline" size="sm" disabled={!steps.length || cursor >= steps.length} onClick={() => setCursor(steps.length)}>走完全流程</Button><Button variant="ghost" size="sm" disabled={!steps.length} onClick={() => setCursor(0)}><RotateCcw data-icon="inline-start" />重置</Button></CardFooter></Card>
          <div className="flex flex-col gap-4"><div className="h-[600px] overflow-hidden rounded-xl border bg-muted/20" aria-label="试跑流程画布"><ReactFlow key={runDefinition ? JSON.stringify(runDefinition) : "draft"} nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView minZoom={0.2} nodesDraggable={false} nodesConnectable={false} deleteKeyCode={null}><Background /><Controls showInteractive={false} /></ReactFlow></div>
            <Card><CardHeader><CardTitle>试跑记录 {cursor > 0 ? `· ${cursor} / ${steps.length}` : ""}</CardTitle><CardDescription>{cursor === steps.length && steps.length ? steps.at(-1)?.status === "blocked" ? "流程阻塞，请先补全处理人" : steps.at(-1)?.status === "terminated" ? "模拟流程已终止" : "模拟流程已完成" : "按步骤查看路径和实际处理人；并行分支记录按顺序展示。"}</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>节点</TableHead><TableHead>实际处理人</TableHead><TableHead>执行结果</TableHead></TableRow></TableHeader><TableBody>{visibleSteps.map(s => <TableRow key={s.nodeId}><TableCell>{s.name}</TableCell><TableCell>{s.actors.join("、") || "未解析到处理人"}</TableCell><TableCell>{s.detail}</TableCell></TableRow>)}{!visibleSteps.length && <TableRow><TableCell colSpan={3}>填写模拟数据，开始试跑以查看执行路径。</TableCell></TableRow>}</TableBody></Table></CardContent></Card>
          </div>
        </div>
      </TabsContent>
      <TabsContent value="versions" className="flex flex-col gap-4">
        <Card><CardHeader><CardTitle>发布历史</CardTitle><CardDescription>查看任意版本；回退将按历史配置发布一个新版本，保留全部历史与项目快照。</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>版本</TableHead><TableHead>发布时间</TableHead><TableHead>变更说明</TableHead><TableHead>操作</TableHead></TableRow></TableHeader><TableBody>{config.versions.map(v => <TableRow key={v.id}><TableCell>V{v.number} {v.id === active.id && <Badge variant="secondary">当前生效</Badge>}</TableCell><TableCell>{v.createdAt}</TableCell><TableCell>{v.note}</TableCell><TableCell><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setPreview(v)}>查看配置</Button><Button variant="ghost" size="sm" disabled={v.id === active.id} onClick={() => setConfirm(v)}>回退此版本</Button></div></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
        <Card><CardHeader><CardTitle>在途项目 · {inflight.length}</CardTitle><CardDescription>发起时绑定流程快照，发布与回退均不覆盖。</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>项目</TableHead><TableHead>发起版本</TableHead></TableRow></TableHeader><TableBody>{inflight.map(p => <TableRow key={p.id}><TableCell>{p.id} · {p.name}</TableCell><TableCell>V{p.workflowSnapshot?.number || 1}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
      </TabsContent>
    </Tabs>
    <Dialog open={!!confirm} onOpenChange={open => { if (!open) setConfirm(null); }}><DialogContent><DialogHeader><DialogTitle>{confirm === "edit" ? "修改流程规则" : confirm === "publish" ? "确认发布新版本" : "确认回退流程版本"}</DialogTitle><DialogDescription>当前有 {inflight.length} 个在途项目。这些项目沿用发起时的流程规则，新配置仅供发布后新发起的项目使用。{confirm !== "edit" && "当前草稿将由本次发布的配置替换。"}</DialogDescription></DialogHeader><Alert><ShieldCheck /><AlertTitle>在途项目不受影响</AlertTitle><AlertDescription>系统保留项目原流程快照；不会替换已发起项目的节点、分支或处理人绑定规则。</AlertDescription></Alert><DialogFooter><Button variant="outline" onClick={() => setConfirm(null)}>取消</Button><Button onClick={publish}>{confirm === "edit" ? "继续编辑" : confirm === "publish" ? "确认发布" : "确认回退并发布"}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={!!preview} onOpenChange={open => { if (!open) setPreview(null); }}><DialogContent className="sm:max-w-4xl"><DialogHeader><DialogTitle>V{preview?.number} · 历史流程配置</DialogTitle><DialogDescription>{preview?.note} · {preview?.createdAt}</DialogDescription></DialogHeader><div className="h-[60vh] rounded-lg border"><ReactFlow key={preview?.id} nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView minZoom={0.2} nodesDraggable={false} nodesConnectable={false} deleteKeyCode={null}><Background /><Controls showInteractive={false} /></ReactFlow></div></DialogContent></Dialog>
  </div>;
}
