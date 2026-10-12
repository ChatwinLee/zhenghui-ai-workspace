# 正惠科技 AI Native 工作台

React + TypeScript + Vite 交互 Demo，使用 shadcn/ui 官方组件与 `b0` 预设（Radix Nova、中性色、Inter）。仅参考飞书的导航布局：可折叠一级侧栏，「会话」入口顶部通过「全部 / Agent 会话 / 群聊」筛选同一份会话列表。客户、需求、项目和审计页面直接展示列表，经营统计集中在管理视角的概览页。

## 启动

```bash
bun install
bun run dev
```

- 工作台：http://127.0.0.1:5180/
- 独立业务流程讲解页：http://127.0.0.1:5180/flow

```bash
bun run build       # TypeScript 检查与生产构建
bun run preview     # 预览构建产物
bun run test        # Playwright 浏览器测试，使用本机 Google Chrome
bun run format      # 格式化源码
```

## 推荐演示路线

1. **销售 → 客户管理**：查看六家演示银行的列表，点击银行名称或「查看详情」，查看拜访记录、转写和附知识库引用的点评。可朗读转写文本、查看引用条款。
2. **销售 → 需求管理**：打开「对公客户拓展数据服务」，提交管理员审批，审批通过后由产品人工编写方案。
3. **产品 → 项目管理**：人工编写并确认方案，随后指派一位或多位研发。
4. **研发 → 项目管理**：人工处理数据、填写交付说明并添加附件，确认后交付。
5. **销售 → 原需求**：反馈修改后继续下一轮方案与样例；确认签单后进入正式交付。复用同一项目编号，保留历史方案。
6. **会话**：创建云端或本地会话，选择 Codex、Claude Code 或 DeepSeek Harness；直接与 AI 对话并获取演示回复。通知可跳转项目或处理审批。
7. **会话 → 群聊**：审批进入产品环节自动创建项目群，销售与产品加入；指派或转交研发时自动加入同一群。各角色可手动建群并选择企业成员，管理员可查看全部群聊。支持纯文本、引用回复和图片、Word、PDF、Excel、PowerPoint 等附件；附件只显示文件卡片，下载后本地查看。不提供富文本、Markdown 渲染、在线预览、云文档、聊天记录搜索或表情包。
8. **管理**：查看审批、全部项目、群聊、审计日志及人员与 Agent 权限。管理员不是群成员时仅查看，不代替成员发言。

银行示例覆盖普惠金融、对公获客、授信风控、绿色金融及存量客户信息维护。管理视角 → 权限与安全 →「重置演示数据」可恢复初始状态。

## 自定义流程

管理视角 → 自定义流程，默认只展示流程图。点击「修改流程」进入全屏编辑，点击节点才显示配置卡片；通过「添加节点」展开工具箱，可配置审批节点、条件分支、并行会签、汇聚与终止节点。点击画布空白处或关闭按钮收起节点配置，通过连接点或后续节点选择器连线；保存草稿后点击「发布配置」使配置生效。退出编辑会保留当前页面的未发布修改，刷新前请保存草稿。发布前校验连通性、循环、分支完整性及管理员角色约束。

「全屏查看 DSL」展示当前草稿的 JSON 流程定义，支持复制及切换全屏流程图。暂不提供试跑、历史版本查看或回退界面。

修改、发布前会提示当前在途项目数量。项目首次提交时保存独立规则快照，后续配置更新不覆盖快照。管理员只参与需求承接审批，常规业务操作仍由销售、产品与研发执行。

当前仍为前端配置 Demo，配置、草稿及快照存于浏览器；自定义 DSL 尚未驱动原有项目阶段操作，也未连接服务端任务调度。

## 组件与样式

使用官方 Sidebar、Table、Dialog、Field、Select、Tabs、Command、Card、Chart 等组件。聊天使用官方 MessageScroller、Message、Bubble、Attachment 和 Marker。流程图使用 React Flow，节点由 shadcn Card 组成。

已安装 `.agents/skills/shadcn`。当前环境使用 Bun，以下命令分别等价于用户指定的 `npx shadcn@latest init --preset b0 --template vite` 和 `npx skills add shadcn/ui`：

```bash
bun x shadcn@latest init --preset b0 --template vite
bun x skills add shadcn/ui --agent codex --yes
```

配置见 `components.json`；预设样式位于 `src/theme.css`。

## 数据与运行时

- 本次合作仅处理公开数据，不包含非公开数据处理或模型本地部署服务。本地运行时卡片是设备接入演示，不代表提供本地模型部署。
- 群聊仅演示同一浏览器内的角色协作，不连接实时消息服务。附件保存于浏览器，Demo 附件总量上限 2 MB，正式服务容量另行配置。
- 业务状态保存在浏览器 `localStorage`，刷新后保留；旧演示客户升级为银行场景时保留项目编号、轮次、权限及新增记录。
- 当前是前端 Demo，没有真实登录、后端、模型推理、录音上传或数据库连接。AI 回复、设备状态和质量指标为预置数据；播放使用浏览器朗读示例转写。
- Excel 为实际生成的模拟企业数据，样例 50 条、正式交付 50,000 条，包含 DEMO 标识。银行、人员、金额、知识库和经营趋势均为演示。
- IAM 与审计模拟浏览器内行为；生产实现需服务端授权、数据库权限控制、执行审批和审计存储。
- 会话参考本地 `Agents-Anywhere/web-next` 的设备、运行时实例及会话结构建模，尚未连接其 API。

## 源码

- `src/App.tsx`：布局、四角色切换、导航与搜索。
- `src/lib/store.tsx`：共享状态、项目流转、会话与日志。
- `src/lib/group-chat.ts`：业务群同步、成员范围与消息规则。
- `src/pages/ConversationsHub.tsx`：统一会话列表、类型筛选与创建群聊。
- `src/pages/GroupChats.tsx`：群聊详情、文本及附件消息、引用回复。
- `src/lib/data.ts`：银行业务演示数据。
- `src/lib/migrate-demo.ts`：旧演示数据迁移。
- `src/pages/Customers.tsx`：CRM、拜访转写与知识引用。
- `src/pages/Projects.tsx`：列表、方案、指派、质检、交付与历史。
- `src/pages/Conversations.tsx`：AI 会话、通知审批。
- `src/pages/Management.tsx`：经营看板、团队、审计、IAM、运行时与知识库。
- `src/pages/BusinessFlow.tsx`：独立流程讲解。
- `src/components/ui`：通过 shadcn CLI 安装的官方组件源码。
- `tests/workspace.spec.ts`：浏览器交互与业务闭环回归。
