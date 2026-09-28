import type { Project } from "./types";
export function projectDemoAttachments(
  project: Project,
  section: "requirement" | "document" | "data",
) {
  const files = {
    requirement: [
      {
        name: "客户需求清单.csv",
        content:
          "\uFEFF项目,需求项,内容\n" +
          `${project.name},业务目标,企业客群筛选\n${project.name},数据范围,上海江苏浙江制造业\n${project.name},样例数量,50条\n${project.name},交付格式,CSV\n`,
      },
      {
        name: "客户沟通纪要.md",
        content: `# ${project.name} · 客户沟通纪要\n\n销售负责人：${project.owner}\n\n## 沟通结论\n${project.description}\n\n## 待办\n- 确认字段范围与授权要求\n- 产品整理方案与验收口径\n- 研发准备验证样例\n\n此文件为 Demo 示例。`,
      },
    ],
    document: [
      {
        name: "产品方案说明.md",
        content: `# ${project.name} · 产品方案\n\n产品负责人：${project.product || "待指定"}\n\n${project.document || "按需求范围完成字段映射、数据清洗及样例验证。"}\n\n此文件为 Demo 示例。`,
      },
      {
        name: "字段映射表.csv",
        content:
          "\uFEFF字段名称,源字段,类型,处理规则\n企业名称,enterprise_name,文本,去除首尾空格\n信用代码,credit_code,文本,唯一性校验\n地区,region,文本,统一行政区划编码\n注册资本,capital,数值,统一万元单位\n成立日期,founded_at,日期,YYYY-MM-DD\n",
      },
    ],
    data: [
      {
        name: "交付样例数据.csv",
        content:
          "\uFEFF企业名称,信用代码,地区,注册资本万元,成立日期\n示例远山制造有限公司,DEMO000001,上海市,500,2020-01-15\n示例星辰科技有限公司,DEMO000002,江苏省苏州市,800,2019-06-20\n示例蓝海实业有限公司,DEMO000003,浙江省杭州市,1200,2021-03-08\n",
      },
      {
        name: "数据质量报告.md",
        content: `# ${project.name} · 数据质量报告\n\n## 校验结果（模拟）\n- 必填字段完整率：100%\n- 信用代码唯一率：100%\n- 日期格式一致率：100%\n- 地区编码有效率：100%\n\n## 交付内容\n附 3 条示例数据，供演示下载和预览。\n\n本报告为 Demo 示例，不代表真实项目验收结果。`,
      },
    ],
  };
  return files[section].map((file, index) => ({
    id: `demo-${section}-${index}`,
    name: file.name,
    size: new Blob([file.content]).size,
    data: `data:${file.name.endsWith(".csv") ? "text/csv" : "text/markdown"};charset=utf-8,${encodeURIComponent(file.content)}`,
  }));
}
