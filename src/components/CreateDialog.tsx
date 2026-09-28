import { useState, type FormEvent } from "react";
import { Plus, Sparkles } from "lucide-react";
import { useStore } from "../lib/store";
import {
  rolePeople,
  roleSkills,
  runtimeList,
  canSeeRuntime,
  providerModels,
} from "../lib/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "./ui/field";
import { Choice, Badge } from "./shared";
export type CreateKind = "session" | "customer" | "project";
export default function CreateDialog({
  kind,
  onClose,
  onProject,
  onSession,
  customerId,
}: {
  kind: CreateKind | null;
  onClose: () => void;
  onProject: (id: string) => void;
  onSession: (id: string) => void;
  customerId: string | null;
}) {
  const { state, role, addCustomer, addProject, addSession } = useStore();
  const [runtime, setRuntime] = useState("cloud-01");
  const availableRuntimes = runtimeList.filter(
    (r) => r.online && canSeeRuntime(role, r, state.policies),
  );
  const selectedRuntime = availableRuntimes.some((r) => r.id === runtime)
    ? runtime
    : availableRuntimes[0].id;
  const [provider, setProvider] = useState("Codex");
  const [model, setModel] = useState("默认模型");
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const str = (n: string) => String(f.get(n) || "").trim();
    if (kind === "customer")
      addCustomer({
        name: str("name"),
        short: str("name").slice(0, 1),
        industry: str("industry"),
        contact: str("contact"),
        position: str("position"),
        phone: str("phone"),
        email: str("email"),
        owner: rolePeople[role],
        status: "待跟进",
        amount: 0,
        color: "blue",
        lastContact: "尚未拜访",
        description: str("description"),
      });
    if (kind === "project")
      onProject(
        addProject({
          name: str("name"),
          customerId: str("customerId"),
          description: str("description"),
          due: str("due"),
          phase: str("phase") as "sample" | "full",
          priority: str("priority"),
        }),
      );
    if (kind === "session")
      onSession(
        addSession({
          name: str("name"),
          kind: "agent",
          role,
          runtimeId: selectedRuntime,
          provider,
          model,
        }),
      );
    onClose();
  }
  return (
    <Dialog
      open={!!kind}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {kind === "session"
              ? "开启新的 AI 会话"
              : kind === "customer"
                ? "添加新客户"
                : "创建客户需求"}
          </DialogTitle>
          <DialogDescription>
            {kind === "session"
              ? "选择运行设备、Agent 和模型配置。"
              : kind === "customer"
                ? "建立客户档案，并持续记录每一次沟通。"
                : "从样例验证到正式交付，始终保留同一个项目编号。"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-6">
          <FieldGroup>
            {kind === "session" && (
              <>
                <Field>
                  <FieldLabel htmlFor="session-name">会话名称</FieldLabel>
                  <Input
                    id="session-name"
                    name="name"
                    required
                    placeholder="例如：分析江南银行的客户需求"
                  />
                </Field>
                <Field>
                  <FieldLabel>运行时</FieldLabel>
                  <Choice
                    label="运行时"
                    options={availableRuntimes.map((r) => ({
                      value: r.id,
                      label: r.name,
                    }))}
                    value={selectedRuntime}
                    onChange={setRuntime}
                  />
                  <FieldDescription>
                    云端为企业共享沙箱，本地为个人工作设备。
                  </FieldDescription>
                </Field>
                <FieldGroup className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>Agent</FieldLabel>
                    <Choice
                      label="Agent"
                      options={Object.keys(providerModels)}
                      value={provider}
                      onChange={(v) => {
                        setProvider(v);
                        setModel("默认模型");
                      }}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>模型配置</FieldLabel>
                    <Choice
                      label="模型配置"
                      options={providerModels[provider]}
                      value={model}
                      onChange={setModel}
                    />
                  </Field>
                </FieldGroup>
                <Field>
                  <FieldLabel>
                    <Sparkles />
                    角色 Skills
                  </FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {roleSkills[role].map((s) => (
                      <Badge key={s}>{s}</Badge>
                    ))}
                  </div>
                  <FieldDescription>
                    当前使用演示运行时与预置回复。
                  </FieldDescription>
                </Field>
              </>
            )}
            {kind === "customer" && (
              <>
                <Field>
                  <FieldLabel htmlFor="customer-name">客户名称</FieldLabel>
                  <Input
                    id="customer-name"
                    name="name"
                    required
                    placeholder="例如：江南银行杭州分行"
                  />
                </Field>
                <FieldGroup className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>行业</FieldLabel>
                    <Choice
                      label="行业"
                      name="industry"
                      defaultValue="城市商业银行"
                      options={[
                        "城市商业银行",
                        "股份制商业银行",
                        "农村商业银行",
                        "国有商业银行",
                        "政策性银行",
                        "其他金融机构",
                      ]}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="customer-contact">联系人</FieldLabel>
                    <Input id="customer-contact" name="contact" required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="customer-position">
                      联系人职务
                    </FieldLabel>
                    <Input id="customer-position" name="position" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="customer-phone">联系电话</FieldLabel>
                    <Input id="customer-phone" name="phone" />
                  </Field>
                </FieldGroup>
                <Field>
                  <FieldLabel htmlFor="customer-email">电子邮箱</FieldLabel>
                  <Input
                    id="customer-email"
                    name="email"
                    type="email"
                    placeholder="name@company.com"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="customer-description">
                    客户简介
                  </FieldLabel>
                  <Textarea
                    id="customer-description"
                    name="description"
                    placeholder="客户背景、业务场景与初步意向"
                  />
                </Field>
              </>
            )}
            {kind === "project" && (
              <>
                <Field>
                  <FieldLabel htmlFor="project-name">需求名称</FieldLabel>
                  <Input
                    id="project-name"
                    name="name"
                    required
                    placeholder="例如：银行普惠金融客群筛选"
                  />
                </Field>
                <Field>
                  <FieldLabel>关联客户</FieldLabel>
                  <Choice
                    label="关联客户"
                    name="customerId"
                    defaultValue={customerId || state.customers[0]?.id}
                    options={state.customers.map((c) => ({
                      value: c.id,
                      label: c.name,
                    }))}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="project-description">
                    需求说明
                  </FieldLabel>
                  <Textarea
                    id="project-description"
                    name="description"
                    required
                    rows={4}
                    placeholder="描述数据范围、字段、条数和交付格式…"
                  />
                </Field>
                <FieldGroup className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>交付阶段</FieldLabel>
                    <Choice
                      label="交付阶段"
                      name="phase"
                      defaultValue="sample"
                      options={[
                        { value: "sample", label: "样例验证" },
                        { value: "full", label: "正式交付" },
                      ]}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="project-due">期望交付日期</FieldLabel>
                    <Input
                      id="project-due"
                      name="due"
                      type="date"
                      defaultValue="2026-09-30"
                      required
                    />
                  </Field>
                </FieldGroup>
                <Field>
                  <FieldLabel>优先级</FieldLabel>
                  <Choice
                    label="优先级"
                    name="priority"
                    defaultValue="中"
                    options={["高", "中", "低"]}
                  />
                </Field>
              </>
            )}
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit">
              <Plus data-icon="inline-start" />
              {kind === "session"
                ? "创建会话"
                : kind === "customer"
                  ? "添加客户"
                  : "创建需求"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
