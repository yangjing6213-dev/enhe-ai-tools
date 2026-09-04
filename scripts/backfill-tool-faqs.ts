import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

type ToolType = "software" | "skill_learning";

type ToolForFaq = {
  id: string;
  name: string;
  slug: string;
  englishName: string | null;
  shortDescription: string;
  content: string;
  type: ToolType;
  category: { name: string } | null;
  faqs: { id: string; question: string; sortOrder: number }[];
};

type FaqTemplate = {
  question: string;
  answer: string;
};

const prisma = new PrismaClient();
const targetTypes: ToolType[] = ["software", "skill_learning"];
const minimumFaqCount = 5;

function parseEnvLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const separatorIndex = trimmed.indexOf("=");
  if (separatorIndex <= 0) return null;

  const key = trimmed.slice(0, separatorIndex).trim();
  let value = trimmed.slice(separatorIndex + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return { key, value };
}

async function loadLocalEnvFile(path = join(process.cwd(), ".env")) {
  try {
    const content = await readFile(path, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const parsed = parseEnvLine(line);
      if (!parsed || process.env[parsed.key]) continue;
      process.env[parsed.key] = parsed.value;
    }
  } catch {
    // Production and CI can provide env vars directly.
  }
}

function normalizeText(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function getDisplayName(tool: Pick<ToolForFaq, "name" | "englishName">) {
  return normalizeText(tool.name || tool.englishName) || "该内容";
}

function buildSoftwareFaqs(tool: ToolForFaq): FaqTemplate[] {
  const name = getDisplayName(tool);

  return [
    {
      question: `${name}主要用来做什么？`,
      answer: `${name}用于辅助完成 AI 工具应用、内容生产、流程处理或效率提升类任务。使用前建议结合详情页说明确认适用场景、版本信息和交付方式。`,
    },
    {
      question: `购买${name}后如何获取下载内容？`,
      answer:
        "完成购买并通过审核后，可在用户中心查看对应软件的下载链接、版本信息和使用说明。请以当前详情页和用户中心展示内容为准。",
    },
    {
      question: `使用${name}前需要确认什么？`,
      answer:
        "请先查看系统要求、版本记录、工具介绍、价格说明和使用教程，确认软件适合你的设备环境、任务目标和工作流程。",
    },
    {
      question: `${name}如何融入实际工作流？`,
      answer:
        "建议先明确要完成的任务，再按照详情页和教程进行小范围测试，确认输出质量、操作步骤和成本后再用于高频工作。",
    },
    {
      question: `遇到${name}下载、安装或使用问题怎么办？`,
      answer:
        "可以先查看详情页、教程和版本说明；如果仍有问题，可联系 ENHE AI 客服获取下载、安装、使用或更新相关支持。",
    },
  ];
}

function buildSkillLearningFaqs(tool: ToolForFaq): FaqTemplate[] {
  const name = getDisplayName(tool);

  return [
    {
      question: `${name}主要学习什么？`,
      answer: `${name}围绕 AI 工具使用、流程方法和实战落地展开，帮助你把学习内容转化为可执行的工作步骤和可复用的实践流程。`,
    },
    {
      question: `购买${name}后如何开始学习？`,
      answer:
        "完成购买并通过审核后，可在用户中心查看课程内容、学习资料、操作说明和相关补充信息。建议按课程顺序完成学习和实践。",
    },
    {
      question: `${name}适合哪些用户？`,
      answer:
        "适合希望系统学习 AI 工具、提示词、自动化流程和实战方法的用户。建议先阅读课程介绍和目录，再判断是否符合当前目标。",
    },
    {
      question: `学习${name}前需要具备基础吗？`,
      answer:
        "大多数内容会从实际场景和操作步骤切入。如果课程涉及特定软件、账号或本地部署环境，请先查看详情页中的适用条件和准备说明。",
    },
    {
      question: `学完${name}后可以获得什么结果？`,
      answer:
        "你可以把课程中的方法用于内容创作、运营提效、工具配置或工作流搭建，并形成可复用的实践步骤。",
    },
  ];
}

function buildFaqs(tool: ToolForFaq) {
  return tool.type === "skill_learning"
    ? buildSkillLearningFaqs(tool)
    : buildSoftwareFaqs(tool);
}

function getArgValue(name: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

async function main() {
  await loadLocalEnvFile();
  const dryRun = process.argv.includes("--dry-run");
  const limitArg = getArgValue("--limit");
  const limit = limitArg ? Number.parseInt(limitArg, 10) : undefined;
  const tools = await prisma.tool.findMany({
    where: { status: "published", type: { in: targetTypes } },
    include: {
      category: true,
      faqs: {
        where: { status: "active" },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    ...(Number.isFinite(limit) && limit && limit > 0 ? { take: limit } : {}),
  });

  const changes: {
    toolId: string;
    slug: string;
    type: ToolType;
    existing: number;
    created: number;
  }[] = [];

  for (const tool of tools as ToolForFaq[]) {
    const existingQuestions = new Set(
      tool.faqs.map((faq) => normalizeText(faq.question).toLowerCase()),
    );
    const templates = buildFaqs(tool).filter(
      (faq) => !existingQuestions.has(normalizeText(faq.question).toLowerCase()),
    );
    const missingCount = Math.max(0, minimumFaqCount - tool.faqs.length);
    const selected = templates.slice(0, missingCount);
    if (!selected.length) {
      changes.push({
        toolId: tool.id,
        slug: tool.slug,
        type: tool.type,
        existing: tool.faqs.length,
        created: 0,
      });
      continue;
    }

    if (!dryRun) {
      const startOrder =
        tool.faqs.reduce((max, faq) => Math.max(max, faq.sortOrder), 0) || 0;
      await prisma.toolFaq.createMany({
        data: selected.map((faq, index) => ({
          toolId: tool.id,
          question: faq.question,
          answer: faq.answer,
          sortOrder: startOrder + index + 1,
          status: "active",
        })),
      });
    }

    changes.push({
      toolId: tool.id,
      slug: tool.slug,
      type: tool.type,
      existing: tool.faqs.length,
      created: selected.length,
    });
  }

  const summary = changes.reduce(
    (acc, item) => {
      acc.tools += 1;
      acc.created += item.created;
      acc.byType[item.type] ??= { tools: 0, created: 0 };
      acc.byType[item.type].tools += 1;
      acc.byType[item.type].created += item.created;
      return acc;
    },
    {
      dryRun,
      tools: 0,
      created: 0,
      byType: {} as Record<ToolType, { tools: number; created: number }>,
    },
  );

  console.log(
    JSON.stringify(
      {
        summary,
        changedTools: changes.filter((item) => item.created > 0),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
