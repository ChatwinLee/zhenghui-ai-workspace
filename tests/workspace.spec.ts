import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "客户管理", exact: true }).click();
});
test("four views, responsive shell, customer records and persistence", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await expect(
    page.getByRole("heading", { name: "客户管理", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/sales-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "收起侧边栏", exact: true }).click();
  await expect(
    page.locator("[data-slot=sidebar][data-state=collapsed]"),
  ).toBeAttached();
  await page.getByRole("button", { name: "展开侧边栏", exact: true }).click();
  await page
    .getByRole("row")
    .filter({ hasText: "江南银行（演示）" })
    .getByRole("button", { name: /查看.*详情/ })
    .click();
  await expect(
    page.getByText("基于企业知识库的拜访复盘", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /销售沟通规范 §3.2/ }).click();
  await expect(page.getByRole("dialog")).toContainText("数据承诺与授权确认");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "返回客户列表" }).click();
  await page.getByRole("button", { name: "新建客户", exact: true }).click();
  await page.getByLabel("客户名称", { exact: true }).fill("端到端测试客户");
  await page.getByLabel("联系人", { exact: true }).fill("测试同事");
  await page.getByRole("button", { name: "添加客户", exact: true }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "端到端测试客户" }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "客户管理", exact: true }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "端到端测试客户" }),
  ).toBeVisible();
  for (const name of ["产品视角", "研发视角", "管理视角"]) {
    await page.getByRole("radio", { name, exact: true }).click();
    await expect(page.locator("main h1").first()).toBeVisible();
  }
  await page.screenshot({
    path: "test-results/admin-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("radio", { name: "销售视角", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "客户管理", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/sales-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  expect(errors).toEqual([]);
});
test("same project progresses through sample revision, signing and delivery", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "需求管理", exact: false })
    .first()
    .click();
  await page
    .getByRole("row")
    .filter({ hasText: "对公客户拓展数据服务" })
    .getByRole("button", { name: /查看.*详情/ })
    .click();
  await page.getByRole("button", { name: "提交给产品", exact: true }).click();
  await page.getByRole("radio", { name: "产品视角", exact: true }).click();
  await page
    .getByRole("row")
    .filter({ hasText: "对公客户拓展数据服务" })
    .getByRole("button", { name: /查看.*详情/ })
    .click();
  await page.getByRole("button", { name: "编辑方案", exact: true }).click();
  await page
    .getByRole("textbox", { name: "编辑方案文档" })
    .fill("# 正式测试方案\n\n字段覆盖验证，先交付50条样例。");
  await page.getByRole("button", { name: "保存文档", exact: true }).click();
  await page.getByRole("button", { name: "接受方案", exact: true }).click();
  await page.getByRole("button", { name: "指派研发", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("checkbox", { name: /李浩/ })
    .check();
  await page.getByRole("button", { name: "确认指派", exact: true }).click();
  await page.getByRole("radio", { name: "研发视角", exact: true }).click();
  await page
    .getByRole("row")
    .filter({ hasText: "对公客户拓展数据服务" })
    .getByRole("button", { name: /查看.*详情/ })
    .click();
  await expect(page.getByText("必填字段完整率", { exact: true })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载 Excel", exact: true }).click();
  expect((await download).suggestedFilename()).toContain("50条");
  await page.getByRole("button", { name: "审核并交付", exact: true }).click();
  await page
    .getByRole("button", { name: "确认审核并交付", exact: true })
    .click();
  await page.getByRole("radio", { name: "销售视角", exact: true }).click();
  await page
    .getByRole("button", { name: "需求管理", exact: false })
    .first()
    .click();
  await page
    .getByRole("row")
    .filter({ hasText: "对公客户拓展数据服务" })
    .getByRole("button", { name: /查看.*详情/ })
    .click();
  await page.getByRole("button", { name: "反馈修改", exact: true }).click();
  await page
    .getByPlaceholder("例如：请补充经营异常记录时间，并调整地区口径…")
    .fill("补充客户所需地区口径。");
  await page
    .getByRole("button", { name: "提交反馈并流转", exact: true })
    .click();
  await expect(page.locator(".project-id")).toContainText("R2");
  await page.getByRole("radio", { name: "产品视角", exact: true }).click();
  await page
    .getByRole("row")
    .filter({ hasText: "对公客户拓展数据服务" })
    .getByRole("button", { name: /查看.*详情/ })
    .click();
  await expect(page.locator(".document-body")).toContainText(
    "补充客户所需地区口径",
  );
  await page.getByRole("button", { name: "接受方案", exact: true }).click();
  await page.getByRole("button", { name: "指派研发", exact: true }).click();
  await page.getByRole("button", { name: "确认指派", exact: true }).click();
  await page.getByRole("radio", { name: "研发视角", exact: true }).click();
  await page
    .getByRole("row")
    .filter({ hasText: "对公客户拓展数据服务" })
    .getByRole("button", { name: /查看.*详情/ })
    .click();
  await page.getByRole("button", { name: "审核并交付", exact: true }).click();
  await page
    .getByRole("button", { name: "确认审核并交付", exact: true })
    .click();
  await page.getByRole("radio", { name: "销售视角", exact: true }).click();
  await page
    .getByRole("button", { name: "需求管理", exact: false })
    .first()
    .click();
  await page
    .getByRole("row")
    .filter({ hasText: "对公客户拓展数据服务" })
    .getByRole("button", { name: /查看.*详情/ })
    .click();
  await page.getByRole("button", { name: "确认签单", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "确认签单", exact: true })
    .click();
  await expect(page.locator(".project-id")).toContainText("R3");
  await page.getByRole("radio", { name: "产品视角", exact: true }).click();
  await page
    .getByRole("row")
    .filter({ hasText: "对公客户拓展数据服务" })
    .getByRole("button", { name: /查看.*详情/ })
    .click();
  await expect(page.locator(".document-body")).toContainText("50,000");
  await page.getByRole("button", { name: "接受方案", exact: true }).click();
  await page.getByRole("button", { name: "指派研发", exact: true }).click();
  await page.getByRole("button", { name: "确认指派", exact: true }).click();
  await page.getByRole("radio", { name: "研发视角", exact: true }).click();
  await page
    .getByRole("row")
    .filter({ hasText: "对公客户拓展数据服务" })
    .getByRole("button", { name: /查看.*详情/ })
    .click();
  await page.getByRole("button", { name: "审核并交付", exact: true }).click();
  await page
    .getByRole("button", { name: "确认审核并交付", exact: true })
    .click();
  await expect(page.locator(".project-heading")).toContainText("已交付");
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("zhenghui-workspace-v1")!),
  );
  expect(
    state.projects.filter((p: any) => p.name === "对公客户拓展数据服务"),
  ).toHaveLength(1);
  const p = state.projects.find((p: any) => p.id === "ZH-2026-0914");
  expect(p.round).toBe(3);
  expect(p.phase).toBe("full");
  expect(p.stage).toBe("delivered");
  expect(p.versions).toHaveLength(2);
  expect(p.versions[0].document).toContain("正式测试方案");
  expect(
    state.sessions.filter(
      (s: any) => s.projectId === p.id && s.kind === "group",
    ),
  ).toHaveLength(1);
  expect(
    state.sessions.find((s: any) => s.projectId === p.id && s.kind === "group")
      .members,
  ).toContain("李浩");
});
test("runtime sessions, group invitations, notification approval and IAM audit", async ({
  page,
}) => {
  await page.getByRole("button", { name: "消息", exact: true }).click();
  await page.getByRole("button", { name: "新建 AI 会话", exact: true }).click();
  await page.getByLabel("会话名称").fill("本地客户分析");
  await page.getByRole("combobox", { name: "运行时", exact: true }).click();
  await page
    .getByRole("option", { name: "本地 · 我的 MacBook Pro", exact: true })
    .click();
  await page.getByRole("combobox", { name: "Agent", exact: true }).click();
  await page
    .getByRole("option", { name: "DeepSeek Harness", exact: true })
    .click();
  await page.getByRole("button", { name: "创建会话", exact: true }).click();
  await expect(page.locator(".chat-heading")).toContainText("DeepSeek Harness");
  await expect(page.locator(".chat-heading")).toContainText("MacBook Pro");
  await page
    .getByRole("textbox", { name: "输入消息" })
    .fill("帮我整理客户需求");
  await page.getByRole("button", { name: "发送消息", exact: true }).click();
  await expect(
    page.getByText("以上为 Demo 预置回复，未执行真实模型任务。", {
      exact: false,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: /江南银行普惠金融 · 项目群/ }).click();
  await page
    .getByRole("button", { name: "邀请成员或 Agent", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("checkbox", { name: /数据开发 Agent/ })
    .check();
  await page.getByRole("button", { name: "邀请加入", exact: true }).click();
  await expect(page.locator(".chat-heading")).toContainText("数据开发 Agent");
  await page.getByRole("button", { name: "提及 Agent", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "输入消息" })).toHaveValue(
    "@数据开发 Agent ",
  );
  await page.getByRole("radio", { name: "管理视角", exact: true }).click();
  await page.getByRole("button", { name: "查看通知", exact: true }).click();
  await page.getByRole("button", { name: "处理审批", exact: true }).click();
  await page.getByRole("button", { name: "批准本次操作", exact: true }).click();
  await expect(page.getByText("已批准", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "权限与安全", exact: true }).click();
  await page
    .getByRole("row")
    .filter({ hasText: "张晨" })
    .getByRole("button", { name: "编辑" })
    .click();
  await page.getByRole("switch", { name: /数据导出/ }).uncheck();
  await page.getByRole("button", { name: "保存权限", exact: true }).click();
  await page.getByRole("button", { name: "审计日志", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "修改访问权限", exact: true }),
  ).toBeVisible();
  await page.getByRole("radio", { name: "研发视角", exact: true }).click();
  await page
    .getByRole("row")
    .filter({ hasText: "对公授信风险数据验证" })
    .getByRole("button", { name: /查看.*详情/ })
    .click();
  await page.getByRole("button", { name: "下载 Excel", exact: true }).click();
  await expect(
    page.getByText("当前角色无数据导出权限", { exact: true }),
  ).toBeVisible();
});

test("lists are immediately visible and conversations only appear in Messages", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const conversations = page.getByRole("complementary", { name: "会话列表" });
  await expect(conversations).toHaveCount(0);
  await expect(page.getByRole("row").nth(1)).toBeInViewport();
  await expect(page.getByText("预计合作金额", { exact: true })).toHaveCount(0);
  await expect(page.getByText("最近拜访", { exact: true })).toHaveCount(0);
  await page.getByPlaceholder("搜索客户名称、联系人…").fill("海岚");
  await expect(page.getByRole("row")).toHaveCount(2);
  await page.getByRole("button", { name: "查看海岚银行（演示）详情" }).click();
  await expect(
    page.getByRole("heading", { name: "海岚银行（演示）", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "需求管理", exact: true }).click();
  await expect(conversations).toHaveCount(0);
  await expect(page.getByRole("row").nth(1)).toBeInViewport();
  await expect(page.getByText("完整项目生命周期", { exact: true })).toHaveCount(
    0,
  );
  await page
    .getByRole("row")
    .nth(1)
    .getByRole("button", { name: "查看详情", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "普惠金融企业名单筛选", exact: true }),
  ).toBeVisible();
  for (const role of ["产品视角", "研发视角"]) {
    await page.getByRole("radio", { name: role, exact: true }).click();
    await expect(conversations).toHaveCount(0);
    const row = page.getByRole("row").nth(1);
    await expect(row).toBeInViewport();
    const title = await row
      .getByRole("button")
      .first()
      .locator("span")
      .first()
      .innerText();
    await row.getByRole("button", { name: "查看详情", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: title, exact: true, level: 1 }),
    ).toBeVisible();
  }
  await page.getByRole("button", { name: "消息", exact: true }).click();
  await expect(conversations).toBeVisible();
  await expect(page.locator('[data-slot="message"]').first()).toBeVisible();
  await expect(page.locator('[data-slot="bubble"]').first()).toBeVisible();
  await page.getByRole("button", { name: "查看通知", exact: true }).click();
  await expect(conversations).toBeVisible();
  await page
    .getByRole("button", { name: "查看项目", exact: true })
    .first()
    .click();
  await expect(conversations).toHaveCount(0);
  await expect(page.locator(".project-id")).toBeVisible();
});

test("banking demo migration retains edited projects and added customers", async ({
  page,
}) => {
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("zhenghui-workspace-v1")!);
    Object.assign(state.customers[0], {
      name: "远景科技有限公司",
      short: "远",
      industry: "企业服务",
      position: "数据产品负责人",
    });
    state.customers.push({
      ...state.customers[0],
      id: "user-bank",
      name: "我的银行客户",
      position: "自定义负责人",
    });
    state.projects[0].name = "华东企业工商数据交付";
    state.projects[0].round = 7;
    state.projects[0].document = "产品已编辑的方案，必须保留";
    localStorage.setItem("zhenghui-workspace-v1", JSON.stringify(state));
  });
  await page.reload();
  await page.getByRole("button", { name: "客户管理", exact: true }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "江南银行（演示）" }),
  ).toBeVisible();
  await expect(
    page.getByRole("row").filter({ hasText: "我的银行客户" }),
  ).toContainText("自定义负责人");
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("zhenghui-workspace-v1")!),
  );
  expect(state.projects[0]).toMatchObject({
    id: "ZH-2026-0921",
    name: "普惠金融企业名单筛选",
    round: 7,
    document: "产品已编辑的方案，必须保留",
  });
  expect(state.customers[0].industry).toBe("城市商业银行");
});

test("presentation explains revision and formal delivery without changing projects", async ({
  page,
}) => {
  const before = await page.evaluate(() =>
    localStorage.getItem("zhenghui-workspace-v1"),
  );
  await page.goto("/flow");
  await expect(
    page.getByRole("heading", { name: "一个项目，从第一次需求到最终交付" }),
  ).toBeVisible();
  await expect(page.locator(".react-flow__node")).toHaveCount(10);
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await expect(
    page.getByText("当前讲解 · 产品 Agent", { exact: true }),
  ).toBeVisible();
  await page.getByRole("radio", { name: "样例修改", exact: true }).click();
  await expect(
    page.getByText("当前讲解 · 销售 + 产品", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await expect(
    page.getByText("当前讲解 · 产品 Agent", { exact: true }),
  ).toBeVisible();
  await page.getByRole("radio", { name: "签单后交付", exact: true }).click();
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await expect(
    page.getByText("当前讲解 · 产品 + Agent", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/business-flow.png",
    fullPage: true,
    animations: "disabled",
  });
  expect(
    await page.evaluate(() => localStorage.getItem("zhenghui-workspace-v1")),
  ).toBe(before);
});
