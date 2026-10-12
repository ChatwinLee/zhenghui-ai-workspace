import { test, expect } from "@playwright/test";
import { initialState } from "../src/lib/data";
import {
  defaultDefinition,
  initializeWorkflow,
  snapshot,
  validateWorkflow,
} from "../src/lib/workflow";

test("workflow validation rejects cycles, missing branches and administrator business nodes", () => {
  const definition = defaultDefinition();
  expect(validateWorkflow(definition)).toEqual([]);
  definition.nodes.find((n) => n.id === "product")!.binding = "intake";
  expect(validateWorkflow(definition).join(" ")).toContain(
    "管理员仅可参与需求承接审批",
  );
  definition.nodes.find((n) => n.id === "product")!.binding = "product";
  definition.edges = definition.edges.filter(
    (e) => !(e.source === "condition" && e.branch === "no"),
  );
  expect(validateWorkflow(definition).join(" ")).toContain("必须分别配置");
  definition.edges.push({ id: "cycle", source: "merge", target: "parallel" });
  expect(validateWorkflow(definition).join(" ")).toContain("循环");
});

test("published configuration and project snapshots are independent", () => {
  const state = initializeWorkflow(structuredClone(initialState));
  const project = state.projects.find((p) => p.workflowSnapshot)!;
  const original = structuredClone(project.workflowSnapshot);
  const next = structuredClone(state.workflow!.versions[0]);
  next.id = "new";
  next.number = 2;
  next.definition.nodes[0].name = "新版入口";
  state.workflow!.versions = [next];
  state.workflow!.activeId = next.id;
  expect(snapshot(state.workflow!).definition.nodes[0].name).toBe("新版入口");
  expect(project.workflowSnapshot).toEqual(original);
  initializeWorkflow(state);
  expect(project.workflowSnapshot).toEqual(original);
});

test("administrator can view fullscreen DSL, edit and publish without changing in-flight snapshots", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: /林晓/ }).click();
  await page.getByRole("menuitem", { name: "管理视角" }).click();
  await page.getByRole("button", { name: "自定义流程", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "自定义流程", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("版本管理", { exact: true })).toHaveCount(0);
  await expect(page.getByText("模拟试跑", { exact: true })).toHaveCount(0);
  await expect(page.getByText("节点工具箱", { exact: true })).toHaveCount(0);
  await expect(page.getByText("节点配置", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("更新说明")).toHaveCount(0);
  await page.locator('.react-flow__node[data-id="product"]').click();
  await expect(page.getByText("节点配置", { exact: true })).toHaveCount(0);
  const before = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("zhenghui-workspace-v1")!).projects.map(
      (p: { workflowSnapshot?: unknown }) => p.workflowSnapshot,
    ),
  );
  await page.getByRole("button", { name: "全屏查看 DSL", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(page.getByRole("textbox", { name: "流程 DSL" })).toBeVisible();
  const dsl = JSON.parse(
    await page.getByRole("textbox", { name: "流程 DSL" }).inputValue(),
  );
  expect(dsl.schema).toBe("zhenghui.workflow/v1");
  expect(
    dsl.nodes.every((n: { binding: string }) => typeof n.binding === "string"),
  ).toBe(true);
  await expect.poll(async () => (await dialog.boundingBox())?.width).toBe(1512);
  const bounds = await dialog.boundingBox();
  expect(bounds!.width).toBeGreaterThan(1500);
  expect(bounds!.height).toBeGreaterThan(970);
  await page.screenshot({ path: "test-results/workflow-fullscreen-dsl.png" });
  await page.getByRole("tab", { name: "流程图", exact: true }).click();
  await expect(dialog.locator(".react-flow__node")).toHaveCount(9);
  await page.screenshot({ path: "test-results/workflow-fullscreen-graph.png" });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "修改流程", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("在途项目");
  await page.getByRole("button", { name: "继续编辑", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("编辑草稿");
  await expect
    .poll(async () => (await page.getByRole("dialog").boundingBox())?.width)
    .toBe(1512);
  await expect(page.getByText("节点配置", { exact: true })).toHaveCount(0);
  await expect(page.getByText("节点工具箱", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "添加节点", exact: true }).click();
  await page
    .getByRole("button", { name: "添加节点", exact: true })
    .last()
    .click();
  await expect(page.getByText("发布前请完善配置")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "发布配置", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "发布配置", exact: true }).click();
  await expect(page.getByText("发布前请完善配置")).toBeVisible();
  await expect(page.getByText("确认发布流程配置", { exact: true })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "删除节点", exact: true }).click();
  await expect(page.getByText("发布前请完善配置")).toHaveCount(0);
  await page
    .getByRole("button", { name: "添加节点", exact: true })
    .first()
    .click();
  await page.locator('.react-flow__node[data-id="product"]').click();
  await expect(page.getByText("节点配置", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "关闭节点配置" }).click();
  await expect(page.getByText("节点配置", { exact: true })).toHaveCount(0);
  await page.locator('.react-flow__node[data-id="product"]').click();
  await page.getByLabel("节点名称", { exact: true }).fill("联合产品方案评审");
  await page.getByRole("button", { name: /保存草稿/ }).click();
  await page.getByRole("button", { name: "发布配置", exact: true }).click();
  await page.getByRole("button", { name: "确认发布", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "修改流程", exact: true }),
  ).toBeVisible();
  const after = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("zhenghui-workspace-v1")!).projects.map(
      (p: { workflowSnapshot?: unknown }) => p.workflowSnapshot,
    ),
  );
  expect(after).toEqual(before);
  await page.reload();
  await page.getByRole("button", { name: /林晓/ }).click();
  await page.getByRole("menuitem", { name: "管理视角" }).click();
  await page.getByRole("button", { name: "自定义流程", exact: true }).click();
  await expect(
    page.locator('.react-flow__node[data-id="product"]'),
  ).toContainText("联合产品方案评审");
  await page.screenshot({
    path: "test-results/workflow-designer.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "全屏查看 DSL", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "流程 DSL" })).toBeVisible();
  const mobileBounds = await page.getByRole("dialog").boundingBox();
  expect(mobileBounds!.width).toBe(390);
  expect(mobileBounds!.height).toBe(844);
  await page.screenshot({ path: "test-results/workflow-mobile-dsl.png" });
  expect(errors).toEqual([]);
});
