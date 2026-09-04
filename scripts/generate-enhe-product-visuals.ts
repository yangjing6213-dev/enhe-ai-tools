import { mkdir, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { chromium } from "playwright";
import { prisma } from "../src/lib/db";

type ToolRow = Awaited<ReturnType<typeof loadTools>>[number];

const assetRoot = path.join(process.cwd(), "public", "images", "products", "enhe-visuals");
const publicRoot = "/images/products/enhe-visuals";
const args = process.argv.slice(2);
const shouldUpdateDatabase = !args.includes("--no-db-update");
const migrationPath = getArgValue("--migration");

function getArgValue(name: string) {
  const index = args.indexOf(name);
  if (index === -1) return null;
  return args[index + 1] ?? null;
}

const typeLabels = {
  software: {
    label: "SOFTWARE",
    zh: "AI软件",
    coverMetric: "3步",
    coverMetricLabel: "输入到交付",
    sceneTitle: "本地工具台",
    scenario: ["资料整理", "素材归档", "项目交付"],
    specTitle: "软件参数"
  },
  online: {
    label: "ACCOUNT",
    zh: "AI账号服务",
    coverMetric: "清晰",
    coverMetricLabel: "服务交付",
    sceneTitle: "服务交付台",
    scenario: ["订阅咨询", "使用说明", "交付支持"],
    specTitle: "服务清单"
  },
  skill_learning: {
    label: "COURSE",
    zh: "AI课程",
    coverMetric: "实战",
    coverMetricLabel: "边学边做",
    sceneTitle: "课程模块台",
    scenario: ["方法学习", "案例练习", "模板复用"],
    specTitle: "课程内容"
  }
} as const;

function getVisualType(tool: Pick<ToolRow, "type" | "name" | "slug" | "category">) {
  if (tool.type !== "online") return typeLabels[tool.type];

  const searchable = `${tool.name} ${tool.slug} ${tool.category?.name ?? ""}`;
  if (/文案|清洗|工具|copy|cleaner/i.test(searchable)) {
    return {
      label: "ONLINE TOOL",
      zh: "AI在线工具",
      coverMetric: "一次",
      coverMetricLabel: "输入即整理",
      sceneTitle: "在线工具台",
      scenario: ["粘贴文本", "选择规则", "复制结果"],
      specTitle: "工具参数"
    } as const;
  }

  return typeLabels.online;
}

async function loadTools() {
  return prisma.tool.findMany({
    orderBy: [{ status: "asc" }, { type: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      englishName: true,
      slug: true,
      type: true,
      status: true,
      shortDescription: true,
      content: true,
      version: true,
      systemRequirement: true,
      downloadCount: true,
      usageCount: true,
      category: { select: { name: true } },
      priceSpecs: {
        where: { status: "active" },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { name: true, price: true }
      }
    }
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sqlLiteral(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function buildMigrationSql(manifest: Array<{ slug: string; coverImage: string; screenshots: string[] }>) {
  return `${manifest
    .map(
      (item) => `UPDATE "tools"
SET
  "cover_image" = ${sqlLiteral(item.coverImage)},
  "screenshots" = ARRAY[
${item.screenshots.map((screenshot) => `    ${sqlLiteral(screenshot)}`).join(",\n")}
  ]::TEXT[]
WHERE "slug" = ${sqlLiteral(item.slug)};
`
    )
    .join("\n")}`;
}

function sanitizeSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "tool";
}

function compactText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1))}…`;
}

function splitByLength(value: string, maxLineLength: number, maxLines = 3) {
  const chars = compactText(value, maxLineLength * maxLines).split("");
  const lines: string[] = [];
  for (let index = 0; index < chars.length && lines.length < maxLines; index += maxLineLength) {
    lines.push(chars.slice(index, index + maxLineLength).join(""));
  }

  if (lines.length > 1 && lines.at(-1)?.length === 1) {
    const last = lines.pop();
    const previous = lines.pop() ?? "";
    lines.push(previous.slice(0, -1), `${previous.slice(-1)}${last}`);
  }

  return lines.filter(Boolean);
}

function buildHeadlineLines(value: string) {
  if (value.startsWith("ENHE ")) {
    const rest = value.replace(/^ENHE\s+/, "");
    if (rest === "批量文件重命名助手") return ["ENHE", "批量文件", "重命名助手"];
    if (rest === "文案清洗在线工具") return ["ENHE", "文案清洗", "在线工具"];
    return ["ENHE", ...splitByLength(rest, 6, 2)];
  }

  const compact = value.replace(/\s+/g, "");
  const knownHeadlines: Record<string, string[]> = {
    VIP软件下载: ["VIP软件", "下载"],
    本地工具交付: ["本地工具", "交付"],
    上传流程校验: ["上传流程", "校验"],
    AI软件测试: ["AI软件", "测试"],
    AI服务交付: ["AI服务", "交付"]
  };

  return knownHeadlines[compact] ?? splitByLength(compact, compact.length > 12 ? 7 : 8, 3);
}

function isInternalTestTool(tool: Pick<ToolRow, "name" | "slug">) {
  const value = `${tool.name} ${tool.slug}`.toLowerCase();
  return /e2e|auto local|upload fix|测试|test/.test(value);
}

function getDisplayName(tool: ToolRow) {
  if (!isInternalTestTool(tool)) return tool.name;
  if (tool.type === "online") return "AI服务交付";
  if (tool.slug.includes("upload-fix")) return "上传流程校验";
  if (tool.slug.includes("auto-local")) return "本地工具交付";
  if (tool.slug.includes("e2e")) return "VIP软件下载";
  return "AI软件测试";
}

function getShortBody(tool: ToolRow) {
  if (isInternalTestTool(tool)) {
    return tool.type === "online"
      ? "服务路径清楚呈现，帮助用户快速判断交付内容。"
      : "用清晰界面呈现工具价值，减少用户理解成本。";
  }
  return compactText(tool.shortDescription || tool.content || "围绕真实任务整理能力、流程与交付边界。", 34);
}

function getPriceLabel(tool: ToolRow) {
  const firstPrice = tool.priceSpecs.find((spec) => Number(spec.price) > 0);
  if (!firstPrice) return tool.type === "software" ? "以页面说明为准" : "按项目配置";
  return `¥${Number(firstPrice.price).toFixed(0)}`;
}

function getSpecItems(tool: ToolRow) {
  const visualType = getVisualType(tool);
  const category = tool.category?.name ?? visualType.zh;
  const price = getPriceLabel(tool);
  const version = tool.version ?? (tool.type === "software" ? "当前版本" : "在线服务");
  const platform = tool.systemRequirement ?? (tool.type === "software" ? "Windows / 浏览器" : "浏览器访问");

  if (tool.type === "online") {
    return [
      ["类型", category],
      ["交付", "清单可查"],
      ["价格", price],
      ["支持", "页面说明"]
    ];
  }

  if (tool.type === "skill_learning") {
    return [
      ["类型", category],
      ["方式", "案例实战"],
      ["模板", "随课使用"],
      ["价格", price]
    ];
  }

  return [
    ["类型", category],
    ["版本", version],
    ["系统", platform],
    ["价格", price]
  ];
}

function getSceneWords(tool: ToolRow) {
  if (tool.type === "online") return Array.from(getVisualType(tool).scenario);
  if (tool.type === "skill_learning") return ["模块学习", "项目练习", "模板复用"];
  return ["选择文件", "预览规则", "完成输出"];
}

function getProductView(tool: ToolRow, variant: "dashboard" | "pipeline" | "scenario" | "package") {
  const type = getVisualType(tool);
  const sceneWords = getSceneWords(tool);
  const specItems = getSpecItems(tool);

  if (variant === "pipeline") {
    return `
      <div class="pipeline">
        ${sceneWords
          .map(
            (word, index) => `
          <div class="pipe-node ${index === 1 ? "active" : ""}">
            <span>${String(index + 1).padStart(2, "0")}</span>
            <strong>${escapeHtml(word)}</strong>
          </div>`
          )
          .join("")}
      </div>
      `;
  }

  if (variant === "scenario") {
    return `
      <div class="scenario-grid">
        ${type.scenario
          .map(
            (item, index) => `
          <div class="scenario-card">
            <span>${index + 1}</span>
            <strong>${escapeHtml(item)}</strong>
            <small>${index === 0 ? "快速判断" : index === 1 ? "减少试错" : "清晰落地"}</small>
          </div>`
          )
          .join("")}
      </div>`;
  }

  if (variant === "package") {
    return `
      <div class="spec-board">
        ${specItems
          .map(
            ([label, value]) => `
          <div class="spec-row">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(compactText(value, 12))}</strong>
          </div>`
          )
          .join("")}
      </div>`;
  }

  return `
    <div class="browser-mock">
      <div class="browser-top"><span></span><span></span><span></span><b>${escapeHtml(type.sceneTitle)}</b></div>
      <div class="browser-body">
        <div class="side-rail">
          <i></i><i></i><i></i>
        </div>
        <div class="work-area">
          <div class="metric-pill"><em>${escapeHtml(type.coverMetric)}</em><span>${escapeHtml(type.coverMetricLabel)}</span></div>
          <div class="work-line wide"></div>
          <div class="work-line"></div>
          <div class="task-cards">
            <span>${escapeHtml(sceneWords[0])}</span>
            <span>${escapeHtml(sceneWords[1])}</span>
            <span>${escapeHtml(sceneWords[2])}</span>
          </div>
        </div>
      </div>
    </div>`;
}

function getPosterCopy(tool: ToolRow, kind: "cover" | "benefit" | "mechanism" | "scenario" | "included" | "specs") {
  const displayName = getDisplayName(tool);
  const type = getVisualType(tool);
  const body = getShortBody(tool);

  if (kind === "cover") {
    return {
      label: type.label,
      headline: buildHeadlineLines(displayName),
      body,
      metric: type.coverMetric,
      metricLabel: type.coverMetricLabel,
      visual: "dashboard" as const
    };
  }

  if (kind === "benefit") {
    return {
      label: "CORE",
      headline: tool.type === "online" ? ["服务交付", "清晰可查"] : ["核心能力", "一眼看懂"],
      body,
      metric: tool.type === "online" ? "清单" : "3步",
      metricLabel: tool.type === "online" ? "交付透明" : "输入到输出",
      visual: "dashboard" as const
    };
  }

  if (kind === "mechanism") {
    return {
      label: "FLOW",
      headline: ["流程拆解", "从输入到交付"],
      body:
        tool.type === "online" && getVisualType(tool).label === "ACCOUNT"
          ? "把服务边界、使用说明与支持路径放在同一张图里。"
          : "用简单步骤呈现关键动作，让用户知道下一步怎么做。",
      metric: "示例",
      metricLabel: "流程",
      visual: "pipeline" as const
    };
  }

  if (kind === "scenario") {
    return {
      label: "SCENE",
      headline: ["适合场景", "快速判断"],
      body: "突出真实使用场景，帮助用户判断是否适合当前需求。",
      metric: "3类",
      metricLabel: "使用场景",
      visual: "scenario" as const
    };
  }

  if (kind === "included") {
    return {
      label: tool.type === "online" && getVisualType(tool).label === "ACCOUNT" ? "SERVICE" : "PACKAGE",
      headline: tool.type === "online" && getVisualType(tool).label === "ACCOUNT" ? ["交付内容", "边界明确"] : ["包含内容", "清楚可用"],
      body:
        tool.type === "online" && getVisualType(tool).label === "ACCOUNT"
          ? "不承诺绕过平台规则，只说明服务内容与使用边界。"
          : "把版本、平台、价格与使用说明放在购买前可见位置。",
      metric: "可查",
      metricLabel: "以页面为准",
      visual: "package" as const
    };
  }

  return {
    label: "SPECS",
    headline: [type.specTitle, "一页看清"],
    body: "减少无效咨询，让用户先理解产品条件再做选择。",
    metric: getPriceLabel(tool),
    metricLabel: "当前页面",
    visual: "package" as const
  };
}

function baseStyles() {
  return `
    @font-face {
      font-family: MiSansLocal;
      src: url("file:///${path.join(process.cwd(), "public", "fonts", "misans", "MiSans-Semibold.latin.woff2").replace(/\\/g, "/")}");
      font-weight: 600;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #0b0b0b;
      font-family: MiSansLocal, "Microsoft YaHei", "PingFang SC", Arial, sans-serif;
      color: #050505;
    }
    .poster {
      position: relative;
      overflow: hidden;
      background:
        radial-gradient(circle at 18% 10%, rgba(255,159,28,.22), transparent 26%),
        radial-gradient(circle at 78% 84%, rgba(255,211,106,.12), transparent 28%),
        linear-gradient(145deg, #090909, #171717 54%, #0b0b0b);
    }
    .poster::before {
      content: "";
      position: absolute;
      inset: 0;
      background:
        linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px),
        linear-gradient(0deg, rgba(255,255,255,.035) 1px, transparent 1px);
      background-size: 72px 72px;
      mask-image: radial-gradient(circle at 50% 42%, black, transparent 74%);
      opacity: .36;
    }
    .stage {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 44px;
      padding: 54px;
    }
    .card {
      position: relative;
      overflow: hidden;
      border-radius: 48px;
      background: #f7f7f5;
      box-shadow:
        0 34px 90px rgba(0,0,0,.42),
        inset 0 1px 0 rgba(255,255,255,.86);
    }
    .card::after {
      content: "";
      position: absolute;
      inset: 0;
      border: 1px solid rgba(255,255,255,.5);
      border-radius: inherit;
      pointer-events: none;
    }
    .label {
      color: #8a8a87;
      font-size: 24px;
      font-weight: 900;
      letter-spacing: .12em;
    }
    h1, h2 {
      margin: 0;
      color: #050505;
      font-weight: 900;
      letter-spacing: 0;
      line-height: .96;
    }
    .body-copy {
      margin: 0;
      color: #787873;
      font-weight: 700;
      line-height: 1.55;
    }
    .image-box {
      position: relative;
      overflow: hidden;
      border-radius: 34px;
      background:
        radial-gradient(circle at 18% 12%, rgba(255,255,255,.9), transparent 30%),
        linear-gradient(145deg, #efefed, #d8d8d4);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.9), 0 20px 50px rgba(0,0,0,.14);
    }
    .metric-block {
      display: flex;
      align-items: baseline;
      gap: 16px;
    }
    .metric-block strong {
      font-size: 78px;
      line-height: .8;
      font-weight: 1000;
      color: #ff9f1c;
      background: linear-gradient(135deg, #ff8a00, #ffd36a 64%, #ff9f1c);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    .metric-block span {
      color: #8a8a87;
      font-size: 22px;
      font-weight: 900;
    }
    .browser-mock {
      position: absolute;
      left: 7%;
      right: 7%;
      top: 13%;
      bottom: 12%;
      overflow: hidden;
      border-radius: 30px;
      background: #f8f8f6;
      box-shadow: 0 28px 50px rgba(0,0,0,.16);
      transform: rotate(-2deg);
    }
    .browser-top {
      height: 62px;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 22px;
      border-bottom: 1px solid rgba(0,0,0,.08);
      color: #8a8a87;
      font-size: 14px;
      font-weight: 900;
    }
    .browser-top span {
      width: 13px;
      height: 13px;
      border-radius: 999px;
      background: #d7d7d3;
    }
    .browser-top b {
      margin-left: auto;
      color: #111;
      font-size: 13px;
      letter-spacing: .08em;
    }
    .browser-body {
      display: grid;
      grid-template-columns: 76px 1fr;
      height: calc(100% - 62px);
    }
    .side-rail {
      display: flex;
      flex-direction: column;
      gap: 18px;
      padding: 24px;
      border-right: 1px solid rgba(0,0,0,.08);
    }
    .side-rail i {
      display: block;
      width: 28px;
      height: 28px;
      border-radius: 12px;
      background: #dededb;
    }
    .side-rail i:first-child {
      background: linear-gradient(135deg, #ff9f1c, #ffd36a);
    }
    .work-area {
      padding: 28px;
    }
    .metric-pill {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      border-radius: 999px;
      background: #0d0d0d;
      padding: 10px 16px;
      color: white;
      font-weight: 900;
    }
    .metric-pill em {
      font-style: normal;
      color: #ffd36a;
      font-size: 26px;
    }
    .work-line {
      width: 70%;
      height: 18px;
      margin-top: 22px;
      border-radius: 999px;
      background: #d4d4d0;
    }
    .work-line.wide {
      width: 92%;
      height: 28px;
    }
    .task-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
      margin-top: 28px;
    }
    .task-cards span {
      min-height: 86px;
      border-radius: 20px;
      background: white;
      padding: 18px 14px;
      color: #111;
      font-size: 18px;
      font-weight: 900;
      box-shadow: 0 14px 28px rgba(0,0,0,.09);
    }
    .pipeline {
      position: absolute;
      inset: 10% 12% 16%;
      display: grid;
      gap: 18px;
      align-content: center;
    }
    .pipe-node {
      display: flex;
      align-items: center;
      gap: 16px;
      border-radius: 24px;
      background: rgba(255,255,255,.72);
      padding: 18px 20px;
      box-shadow: 0 18px 34px rgba(0,0,0,.08);
    }
    .pipe-node span {
      display: grid;
      place-items: center;
      width: 48px;
      height: 48px;
      border-radius: 16px;
      background: #111;
      color: #ffd36a;
      font-size: 18px;
      font-weight: 900;
    }
    .pipe-node strong {
      font-size: 25px;
      font-weight: 1000;
    }
    .pipe-node.active {
      background: linear-gradient(135deg, #fff6e4, #ffffff);
      outline: 3px solid rgba(255,159,28,.34);
    }
    .mini-console {
      position: absolute;
      right: 8%;
      bottom: 10%;
      width: 172px;
      display: grid;
      gap: 10px;
      border-radius: 22px;
      background: #111;
      padding: 18px;
    }
    .mini-console div {
      height: 12px;
      border-radius: 999px;
      background: #555;
    }
    .mini-console div:first-child {
      width: 70%;
      background: #ff9f1c;
    }
    .scenario-grid {
      position: absolute;
      inset: 11%;
      display: grid;
      grid-template-columns: 1fr;
      gap: 18px;
    }
    .scenario-card {
      border-radius: 28px;
      background: rgba(255,255,255,.75);
      padding: 24px;
      box-shadow: 0 16px 30px rgba(0,0,0,.08);
    }
    .scenario-card span {
      display: inline-grid;
      place-items: center;
      width: 42px;
      height: 42px;
      border-radius: 14px;
      background: linear-gradient(135deg, #ff9f1c, #ffd36a);
      color: #111;
      font-weight: 1000;
    }
    .scenario-card strong {
      display: block;
      margin-top: 14px;
      font-size: 28px;
      font-weight: 1000;
    }
    .scenario-card small {
      display: block;
      margin-top: 8px;
      color: #777;
      font-size: 18px;
      font-weight: 800;
    }
    .spec-board {
      position: absolute;
      inset: 12%;
      display: grid;
      align-content: center;
      gap: 16px;
    }
    .spec-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      border-radius: 24px;
      background: rgba(255,255,255,.76);
      padding: 22px 24px;
      box-shadow: 0 14px 28px rgba(0,0,0,.08);
    }
    .spec-row span {
      color: #777;
      font-size: 20px;
      font-weight: 900;
    }
    .spec-row strong {
      color: #111;
      font-size: 24px;
      font-weight: 1000;
    }
  `;
}

function renderCover(tool: ToolRow) {
  const copy = getPosterCopy(tool, "cover");
  const headline = copy.headline.map((line) => `<span>${escapeHtml(line)}</span>`).join("");
  return `
    <!doctype html>
    <html><head><meta charset="utf-8"><style>${baseStyles()}
      .poster { width: 1600px; height: 900px; }
      .cover-card { width: 630px; height: 790px; padding: 54px 50px; }
      .feature-card { width: 520px; height: 690px; padding: 42px; transform: translateY(18px); }
      .cover-title { display: grid; gap: 6px; margin-top: 28px; font-size: 84px; }
      .cover-title span { display: block; }
      .cover-body { margin-top: 28px; font-size: 27px; }
      .cover-image { height: 335px; margin-top: 38px; }
      .feature-card h2 { margin-top: 24px; font-size: 58px; }
      .feature-card .image-box { height: 320px; margin-top: 34px; }
      .feature-card .pipeline { inset: 8% 12% 18%; gap: 14px; }
      .feature-card .pipe-node { padding: 15px 18px; border-radius: 22px; }
      .feature-card .pipe-node span { width: 42px; height: 42px; border-radius: 14px; font-size: 16px; }
      .feature-card .pipe-node strong { font-size: 22px; }
      .feature-card .mini-console { bottom: 7%; width: 154px; padding: 16px; }
      .feature-card .body-copy { margin-top: 22px; font-size: 23px; }
      .status-strip {
        position: absolute;
        left: 50px;
        right: 50px;
        bottom: 42px;
        display: flex;
        justify-content: space-between;
        gap: 20px;
        border-radius: 24px;
        background: #111;
        padding: 18px 22px;
        color: #f7f7f5;
        font-size: 18px;
        font-weight: 900;
      }
      .status-strip span:last-child { color: #ffd36a; }
    </style></head>
    <body>
      <div class="poster">
        <div class="stage">
          <section class="card cover-card">
            <div class="label">${escapeHtml(copy.label)}</div>
            <h1 class="cover-title">${headline}</h1>
            <p class="body-copy cover-body">${escapeHtml(copy.body)}</p>
            <div class="image-box cover-image">${getProductView(tool, copy.visual)}</div>
            <div class="status-strip"><span>ENHE AI</span><span>${escapeHtml(getVisualType(tool).zh)}</span></div>
          </section>
          <section class="card feature-card">
            <div class="label">KEY POINT</div>
            <div class="metric-block"><strong>${escapeHtml(copy.metric)}</strong><span>${escapeHtml(copy.metricLabel)}</span></div>
            <h2>重点清晰<br/>快速判断</h2>
            <p class="body-copy">${escapeHtml(compactText(copy.body, 28))}</p>
            <div class="image-box">${getProductView(tool, "pipeline")}</div>
          </section>
        </div>
      </div>
    </body></html>`;
}

function renderDetail(tool: ToolRow, kind: "benefit" | "mechanism" | "scenario" | "included" | "specs") {
  const copy = getPosterCopy(tool, kind);
  const headline = copy.headline.map((line) => `<span>${escapeHtml(line)}</span>`).join("");
  return `
    <!doctype html>
    <html><head><meta charset="utf-8"><style>${baseStyles()}
      .poster { width: 1600px; height: 1200px; }
      .detail-card {
        width: 780px;
        height: 1080px;
        padding: 58px 54px;
      }
      .detail-title {
        display: grid;
        gap: 7px;
        margin-top: 30px;
        font-size: 78px;
      }
      .detail-title span { display: block; }
      .detail-body {
        margin-top: 28px;
        min-height: 92px;
        font-size: 27px;
      }
      .detail-image {
        height: 440px;
        margin-top: 36px;
      }
      .metric-row {
        position: absolute;
        left: 54px;
        right: 54px;
        bottom: 50px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
        border-top: 1px solid rgba(0,0,0,.12);
        padding-top: 28px;
      }
      .metric-row p {
        margin: 0;
        color: #8a8a87;
        font-size: 22px;
        font-weight: 900;
      }
    </style></head>
    <body>
      <div class="poster">
        <div class="stage">
          <section class="card detail-card">
            <div class="label">${escapeHtml(copy.label)}</div>
            <h1 class="detail-title">${headline}</h1>
            <p class="body-copy detail-body">${escapeHtml(copy.body)}</p>
            <div class="image-box detail-image">${getProductView(tool, copy.visual)}</div>
            <div class="metric-row">
              <div class="metric-block"><strong>${escapeHtml(copy.metric)}</strong><span>${escapeHtml(copy.metricLabel)}</span></div>
              <p>ENHE AI</p>
            </div>
          </section>
        </div>
      </div>
    </body></html>`;
}

async function main() {
  const tools = await loadTools();
  await mkdir(assetRoot, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 1 });
  const detailKinds = ["benefit", "mechanism", "scenario", "included", "specs"] as const;
  const manifest: Array<{ slug: string; coverImage: string; screenshots: string[] }> = [];

  for (const tool of tools) {
    const segment = sanitizeSegment(tool.slug);
    const dir = path.join(assetRoot, segment);
    await mkdir(dir, { recursive: true });

    const coverPath = path.join(dir, "cover.png");
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.setContent(renderCover(tool), { waitUntil: "load" });
    await page.locator(".poster").screenshot({ path: coverPath });

    const screenshots: string[] = [];
    await page.setViewportSize({ width: 1600, height: 1200 });
    for (let index = 0; index < detailKinds.length; index += 1) {
      const kind = detailKinds[index];
      const fileName = `detail-${String(index + 1).padStart(2, "0")}-${kind}.png`;
      const detailPath = path.join(dir, fileName);
      await page.setContent(renderDetail(tool, kind), { waitUntil: "load" });
      await page.locator(".poster").screenshot({ path: detailPath });
      screenshots.push(`${publicRoot}/${segment}/${fileName}`);
    }

    const coverImage = `${publicRoot}/${segment}/cover.png`;
    if (shouldUpdateDatabase) {
      await prisma.tool.update({
        where: { id: tool.id },
        data: { coverImage, screenshots }
      });
    }
    manifest.push({ slug: tool.slug, coverImage, screenshots });
    console.log(`Updated ${tool.slug}: ${coverImage}`);
  }

  await browser.close();
  await writeFile(path.join(assetRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  if (migrationPath) {
    await mkdir(path.dirname(migrationPath), { recursive: true });
    await writeFile(migrationPath, buildMigrationSql(manifest), "utf8");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
