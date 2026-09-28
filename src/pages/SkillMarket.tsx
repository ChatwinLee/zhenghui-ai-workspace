import { SessionAgentIcon } from "../components/SessionAgentIcon";
import { useState } from "react";
import { Blocks, Download, Plus, Send, Check } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "../lib/store";
import { rolePeople } from "../lib/types";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "../components/ui/field";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  PageHeader,
  SearchBox,
  Choice,
  Tabs,
  Empty,
} from "../components/shared";
interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  author: string;
  content: string;
  published: boolean;
  installed: string[];
}
const seed: Skill[] = [
  ["客户沟通总结", "提炼录音转写中的需求、待办和下一步跟进。", "销售", "林晓"],
  ["客户拜访准备", "整理客户背景、沟通目标和拜访提纲。", "销售", "林晓"],
  ["需求拆解", "将客户需求整理成范围、字段与验收标准。", "产品", "陈思远"],
  ["产品方案编写", "辅助撰写结构清晰的产品方案与交接说明。", "产品", "陈思远"],
  ["字段映射整理", "分析字段口径，输出映射表与转换建议。", "研发", "张晨"],
  ["数据质量检查", "整理完整性、唯一性和格式一致性检查规则。", "研发", "李浩"],
  ["交付文档整理", "汇总交付清单、使用说明和验收注意事项。", "研发", "张晨"],
  ["项目进度复盘", "整理项目进展、阻塞事项和待决策问题。", "管理", "王磊"],
].map(([name, description, category, author], i) => ({
  id: `skill-${i}`,
  name,
  description,
  category,
  author,
  published: true,
  installed: [],
  content: `# ${name}\n\n## 目标\n${description}\n\n## 操作步骤\n1. 阅读用户提供的材料，确认任务目标。\n2. 提取关键事实，标记缺失或待确认的信息。\n3. 输出结论、依据和下一步建议。\n\n## 要求\n不编造数据，重要结论由负责人确认。`,
}));
const key = "zhenghui-skill-market-v1";
export default function SkillMarket() {
  const { role } = useStore();
  const [skills, setSkills] = useState<Skill[]>(() => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return Array.isArray(value) ? value : seed;
    } catch {
      return seed;
    }
  });
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");
  const [category, setCategory] = useState("全部");
  const [draft, setDraft] = useState<Skill | null>(null);
  const [detail, setDetail] = useState<Skill | null>(null);
  const [installId, setInstallId] = useState<string | null>(null);
  const [agent, setAgent] = useState("Codex");
  function persist(next: Skill[]) {
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setSkills(next);
      return true;
    } catch {
      toast.error("保存失败，浏览器存储空间不足");
      return false;
    }
  }
  function save(published: boolean) {
    if (
      !draft?.name.trim() ||
      !draft.description.trim() ||
      !draft.content.trim()
    ) {
      toast.error("请填写名称、简介和 Skill 内容");
      return;
    }
    const item = { ...draft, name: draft.name.trim(), published };
    if (persist([item, ...skills.filter((s) => s.id !== item.id)])) {
      setDraft(null);
      toast.success(published ? "Skill 已发布到广场" : "草稿已保存");
    }
  }
  const visible = skills.filter(
    (s) =>
      (tab === "mine" ? s.author === rolePeople[role] : s.published) &&
      (category === "全部" || s.category === category) &&
      `${s.name}${s.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  const target = skills.find((s) => s.id === installId);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-5 lg:p-7">
      <PageHeader
        title="Skill 广场"
        description="发现和分享公司内部 Skill，为 Agent 添加工作能力。"
      >
        <Button
          onClick={() =>
            setDraft({
              id: crypto.randomUUID(),
              name: "",
              description: "",
              category: "通用",
              author: rolePeople[role],
              content: "",
              published: false,
              installed: [],
            })
          }
        >
          <Plus data-icon="inline-start" />
          创建 Skill
        </Button>
      </PageHeader>
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "all", label: "公司 Skill" },
          { id: "mine", label: "我创建的" },
        ]}
      />
      <div className="flex gap-3">
        <div className="flex-1">
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="搜索 Skill 名称或用途…"
          />
        </div>
        <div className="w-36">
          <Choice
            label="Skill 分类"
            value={category}
            onChange={setCategory}
            options={["全部", "销售", "产品", "研发", "管理", "通用"]}
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((skill) => (
          <Card key={skill.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Blocks className="size-5" />
                {skill.name}
              </CardTitle>
              <CardDescription>{skill.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Badge variant="secondary">{skill.category}</Badge>
              <Badge variant="outline">{skill.author}</Badge>
              {!skill.published && <Badge variant="outline">草稿</Badge>}
              {skill.installed.map((a) => (
                <Badge key={a} variant="outline">
                  <Check />
                  {a}
                </Badge>
              ))}
            </CardContent>
            <CardFooter className="mt-auto flex-wrap justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDetail(skill)}
              >
                查看详情
              </Button>
              <div className="flex gap-2">
                {skill.author === rolePeople[role] && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDraft({ ...skill })}
                  >
                    编辑
                  </Button>
                )}
                {skill.published && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setInstallId(skill.id);
                      setAgent("Codex");
                    }}
                  >
                    <Download data-icon="inline-start" />
                    安装到 Agent
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
      {!visible.length && (
        <Empty
          title="暂无 Skill"
          description="调整搜索条件，或创建一个新的 Skill。"
        />
      )}
      <Dialog
        open={!!draft}
        onOpenChange={(v) => {
          if (!v) setDraft(null);
        }}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {draft?.published ? "编辑 Skill" : "创建 Skill"}
            </DialogTitle>
            <DialogDescription>
              填写使用说明，保存草稿或发布到公司广场。
            </DialogDescription>
          </DialogHeader>
          {draft && (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="skill-name">名称</FieldLabel>
                <Input
                  id="skill-name"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="skill-description">简介</FieldLabel>
                <Input
                  id="skill-description"
                  value={draft.description}
                  onChange={(e) =>
                    setDraft({ ...draft, description: e.target.value })
                  }
                />
              </Field>
              <Field>
                <FieldLabel>分类</FieldLabel>
                <Choice
                  label="分类"
                  value={draft.category}
                  onChange={(category) => setDraft({ ...draft, category })}
                  options={["销售", "产品", "研发", "管理", "通用"]}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="skill-content">Skill 内容</FieldLabel>
                <Textarea
                  id="skill-content"
                  className="min-h-60"
                  placeholder="描述任务目标、操作步骤和输出要求，支持 Markdown。"
                  value={draft.content}
                  onChange={(e) =>
                    setDraft({ ...draft, content: e.target.value })
                  }
                />
              </Field>
            </FieldGroup>
          )}
          <DialogFooter>
            {!draft?.published && (
              <Button variant="outline" onClick={() => save(false)}>
                保存草稿
              </Button>
            )}
            <Button onClick={() => save(true)}>
              <Send data-icon="inline-start" />
              {draft?.published ? "保存并更新" : "发布 Skill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!detail}
        onOpenChange={(v) => {
          if (!v) setDetail(null);
        }}
      >
        <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{detail?.name}</DialogTitle>
            <DialogDescription>{detail?.description}</DialogDescription>
          </DialogHeader>
          <p className="whitespace-pre-wrap text-sm leading-7">
            {detail?.content}
          </p>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!target}
        onOpenChange={(v) => {
          if (!v) setInstallId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>安装 {target?.name}</DialogTitle>
            <DialogDescription>
              选择目标 Agent。当前为 Demo，仅保存模拟安装状态。
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel>目标 Agent</FieldLabel>
            <Choice
              label="目标 Agent"
              value={agent}
              onChange={setAgent}
              options={["Codex", "Claude Code", "DeepSeek Harness"]}
            />
          </Field>
          <DialogFooter>
            <Button
              disabled={target?.installed.includes(agent)}
              onClick={() => {
                if (
                  persist(
                    skills.map((s) =>
                      s.id === installId
                        ? {
                            ...s,
                            installed: [...new Set([...s.installed, agent])],
                          }
                        : s,
                    ),
                  )
                ) {
                  setInstallId(null);
                  toast.success(`已模拟安装到 ${agent}`);
                }
              }}
            >
              <SessionAgentIcon runtime={agent} />
              {target?.installed.includes(agent) ? "已安装" : "一键安装"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
