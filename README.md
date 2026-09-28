# 正惠科技 AI Native 工作台

React + TypeScript + Vite 交互 Demo，使用 shadcn/ui 官方组件与 `b0` 预设（Radix Nova、中性色、Inter）。仅参考飞书的导航布局：可折叠一级侧栏，只有「会话」模块显示二级会话列表。客户、需求、项目和审计页面直接展示列表，经营统计集中在管理视角的概览页。

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
7. **管理**：查看经营概览、团队会话与拜访、审计日志、人与 Agent 权限。关闭研发导出权限后，研发导出会被拦截。

银行示例覆盖普惠金融、对公获客、授信风控、绿色金融及存量客户信息维护。管理视角 → 权限与安全 →「重置演示数据」可恢复初始状态。

## 组件与样式

使用官方 Sidebar、Table、Dialog、Field、Select、Tabs、Command、Card、Chart 等组件。聊天使用官方 MessageScroller、Message、Bubble、Attachment 和 Marker。流程图使用 React Flow，节点由 shadcn Card 组成。

已安装 `.agents/skills/shadcn`。当前环境使用 Bun，以下命令分别等价于用户指定的 `npx shadcn@latest init --preset b0 --template vite` 和 `npx skills add shadcn/ui`：

```bash
bun x shadcn@latest init --preset b0 --template vite
bun x skills add shadcn/ui --agent codex --yes
```

配置见 `components.json`；预设样式位于 `src/theme.css`。

## 数据与运行时

- 业务状态保存在浏览器 `localStorage`，刷新后保留；旧演示客户升级为银行场景时保留项目编号、轮次、权限及新增记录。
- 当前是前端 Demo，没有真实登录、后端、模型推理、录音上传或数据库连接。AI 回复、设备状态和质量指标为预置数据；播放使用浏览器朗读示例转写。
- Excel 为实际生成的模拟企业数据，样例 50 条、正式交付 50,000 条，包含 DEMO 标识。银行、人员、金额、知识库和经营趋势均为演示。
- IAM 与审计模拟浏览器内行为；生产实现需服务端授权、数据库权限控制、执行审批和审计存储。
- 会话参考本地 `Agents-Anywhere/web-next` 的设备、运行时实例及会话结构建模，尚未连接其 API。

## 源码

- `src/App.tsx`：布局、四角色切换、导航与搜索。
- `src/lib/store.tsx`：共享状态、项目流转、会话与日志。
- `src/lib/data.ts`：银行业务演示数据。
- `src/lib/migrate-demo.ts`：旧演示数据迁移。
- `src/pages/Customers.tsx`：CRM、拜访转写与知识引用。
- `src/pages/Projects.tsx`：列表、方案、指派、质检、交付与历史。
- `src/pages/Conversations.tsx`：AI 会话、通知审批。
- `src/pages/Management.tsx`：经营看板、团队、审计、IAM、运行时与知识库。
- `src/pages/BusinessFlow.tsx`：独立流程讲解。
- `src/components/ui`：通过 shadcn CLI 安装的官方组件源码。
- `tests/workspace.spec.ts`：浏览器交互与业务闭环回归。
