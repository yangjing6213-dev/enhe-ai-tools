export type AiWorkflowGitHubRepositoryCandidate = {
  id: string;
  fullName: string;
  url: string;
  description: string;
  language: string | null;
  stars: number;
  updatedAt: string;
  defaultBranch: string;
  licenseSpdx: string | null;
};

export function restoreAiWorkflowCandidateMetadata(
  candidate: Omit<AiWorkflowGitHubRepositoryCandidate, "description" | "language"> & { description?: unknown; language?: unknown },
): AiWorkflowGitHubRepositoryCandidate {
  return {
    ...candidate,
    description: typeof candidate.description === "string" ? candidate.description : "",
    language: typeof candidate.language === "string" ? candidate.language : null,
  };
}

export function getAiWorkflowRegisteredRepositoryIds(
  candidates: ReadonlyArray<{ repositoryId: string; status: string }>,
) {
  return [...new Set(candidates
    .filter(({ status }) => ["reviewing", "pending_pricing", "published"].includes(status))
    .map(({ repositoryId }) => repositoryId))];
}

type PendingRepositoryRegistration = {
  repositoryId: string;
  repository: string;
  result: unknown;
};

export function skipAlreadyRegisteredRepository(
  state: {
    completedRepositoryIds: string[];
    outcomes: Array<{ repositoryId: string; repository: string; state: "registered" | "rejected"; reason?: string }>;
    pendingRegistration?: PendingRepositoryRegistration;
  },
  repositoryId: string,
) {
  const pending = state.pendingRegistration;
  if (!pending || pending.repositoryId !== repositoryId) return false;
  if (!state.completedRepositoryIds.includes(repositoryId)) state.completedRepositoryIds.push(repositoryId);
  if (!state.outcomes.some((outcome) => outcome.repositoryId === repositoryId)) {
    state.outcomes.push({ repositoryId, repository: pending.repository, state: "rejected", reason: "REPOSITORY_ALREADY_REGISTERED" });
  }
  state.pendingRegistration = undefined;
  return true;
}

const redistributableLicenses = new Set([
  "0BSD",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "ISC",
  "MIT",
  "MPL-2.0",
]);

const topicSearchTerms: Record<string, string> = {
  "工作效率": "productivity automation workflow",
  "视频生成": "AI video generation workflow",
  "内容创作": "AI content creation workflow",
  "编程开发": "AI developer workflow tools",
  "学习教育": "AI education learning workflow",
  "搜索研究": "AI research search knowledge base",
  "营销销售": "AI marketing sales automation",
  "办公自动化": "office document spreadsheet automation",
  "情感陪伴": "AI companion conversational agent",
  "财务法律辅助": "AI contract review finance workflow",
};

const topicRelevanceTerms: Record<string, string[]> = {
  "工作效率": ["productivity", "workflow automation", "task automation", "task management", "time management", "效率工具", "工作流自动化", "任务管理", "时间管理"],
  "视频生成": ["video generation", "video generator", "text-to-video", "text to video", "image-to-video", "image to video", "video synthesis", "video diffusion", "generative video", "ai video maker", "ai-generated video", "generate video", "视频生成", "生成视频", "文生视频", "图生视频", "视频合成", "视频扩散"],
  "内容创作": ["content creation", "content generation", "content creator", "writing assistant", "ai writing", "copywriting", "内容创作", "内容生成", "文案生成", "写作助手"],
  "编程开发": ["code generation", "coding assistant", "developer tool", "software development", "programming", "code editor", "ai coding", "代码生成", "编程助手", "开发者工具"],
  "学习教育": ["education", "learning platform", "tutoring", "study assistant", "educational tool", "在线课程", "学习平台", "教育工具", "辅导学习"],
  "搜索研究": ["research assistant", "research tool", "search engine", "knowledge base", "information retrieval", "academic search", "研究助手", "搜索引擎", "知识库", "信息检索"],
  "营销销售": ["marketing automation", "sales automation", "crm", "lead generation", "ad creative", "营销自动化", "销售自动化", "客户管理", "广告素材"],
  "办公自动化": ["office automation", "document automation", "spreadsheet", "meeting notes", "document assistant", "办公自动化", "文档自动化", "会议纪要", "表格自动化"],
  "情感陪伴": ["ai companion", "virtual companion", "companion chatbot", "conversational companion", "情感陪伴", "虚拟伴侣", "陪伴聊天"],
  "财务法律辅助": ["legal assistant", "contract review", "financial assistant", "accounting", "tax preparation", "finance workflow", "法律助手", "合同审查", "财务助手", "会计软件"],
};

const directionSearchTerms: Record<string, string> = {
  "搜索趋势": "search trends",
  "saas产品发布": "SaaS product launch",
  "企业预算": "enterprise budget",
  "创作者社区": "creator community",
  "模型更新": "AI model release",
  "工具榜单": "AI tools comparison",
  "社媒讨论": "social media content",
  "模板市场": "template marketplace",
  "自媒体需求": "independent creator needs",
  "开发者工具": "developer tools",
  "github生态": "GitHub ecosystem",
  "ide集成": "IDE integration",
  "课程产品": "education course",
  "家庭学习": "family learning",
  "语言学习": "language learning",
  "ai搜索": "AI search",
  "知识库": "knowledge base",
  "研究助手": "research assistant",
  "crm": "CRM automation",
  "广告素材": "ad creative",
  "客户触达": "customer outreach",
  "文档表格": "documents spreadsheets",
  "会议纪要": "meeting notes",
  "流程编排": "workflow orchestration",
  "消费应用": "consumer AI apps",
  "社区反馈": "user feedback",
  "长时互动": "long-term interaction",
  "高风险咨询": "risk management",
  "合同审阅": "contract review",
  "合规工具": "compliance automation",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function buildAiWorkflowSearchTerms(topic: string, directions: string) {
  const base = topicSearchTerms[topic] ?? `AI agent workflow ${topic}`;
  const translated = directions.split(/[\/|,，;；]/)
    .map((value) => directionSearchTerms[value.trim().replace(/\s+/g, "").toLowerCase()])
    .filter((value): value is string => Boolean(value))
    .map((value) => `${base} ${value}`);
  return translated.length ? [...new Set(translated)].slice(0, 3) : [base];
}

export function isAiWorkflowCandidateRelevant(
  topic: string,
  candidate: Pick<AiWorkflowGitHubRepositoryCandidate, "fullName" | "description">,
  readme: string,
) {
  const terms = topicRelevanceTerms[topic];
  if (!terms) return true;

  const normalize = (value: string) => value.normalize("NFKC").toLocaleLowerCase();
  const metadata = normalize(`${candidate.fullName}\n${candidate.description}`);
  if (terms.some((term) => metadata.includes(normalize(term)))) return true;

  const readmeOverview = normalize(readme.slice(0, 2_000));
  if (terms.some((term) => readmeOverview.includes(normalize(term)))) return true;

  const readmeSummary = normalize(readme.slice(0, 12_000));
  return terms.filter((term) => readmeSummary.includes(normalize(term))).length >= 2;
}

export function selectAiWorkflowRepositoryCandidates(
  values: unknown,
  alreadyRegistered: ReadonlySet<string>,
  limit: number,
): AiWorkflowGitHubRepositoryCandidate[] {
  if (!Array.isArray(values) || !Number.isSafeInteger(limit) || limit < 1) return [];
  const output: AiWorkflowGitHubRepositoryCandidate[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    if (!isRecord(value)) continue;
    const idValue = value.id;
    const id = typeof idValue === "number" && Number.isSafeInteger(idValue) && idValue > 0
      ? String(idValue)
      : typeof idValue === "string" && /^\d{1,32}$/.test(idValue)
        ? idValue
        : "";
    const fullName = typeof value.full_name === "string" ? value.full_name : "";
    const url = typeof value.html_url === "string" ? value.html_url : "";
    const defaultBranch = typeof value.default_branch === "string" ? value.default_branch : "";
    const language = typeof value.language === "string" ? value.language : null;
    const description = typeof value.description === "string"
      ? value.description.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 500)
      : "";
    const licenseValue = isRecord(value.license) ? value.license.spdx_id : null;
    const licenseSpdx = typeof licenseValue === "string" && redistributableLicenses.has(licenseValue) ? licenseValue : null;
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      continue;
    }
    if (
      !id || seen.has(id) || alreadyRegistered.has(id) ||
      !/^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/.test(fullName) ||
      parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "github.com" ||
      parsedUrl.pathname.toLowerCase() !== `/${fullName.toLowerCase()}` ||
      value.private !== false || value.archived === true || value.disabled === true || value.fork === true ||
      !defaultBranch || defaultBranch.length > 120 || !licenseSpdx
    ) continue;

    const stars = typeof value.stargazers_count === "number" && Number.isSafeInteger(value.stargazers_count) && value.stargazers_count >= 0
      ? value.stargazers_count
      : 0;
    const updatedAt = typeof value.updated_at === "string" && Number.isFinite(Date.parse(value.updated_at))
      ? value.updated_at
      : null;
    if (stars < 1 || !updatedAt || Date.parse(updatedAt) < Date.now() - 730 * 24 * 60 * 60 * 1000) continue;
    seen.add(id);
    output.push({ id, fullName, url: parsedUrl.origin + parsedUrl.pathname.replace(/\/$/, ""), description, language, stars, updatedAt, defaultBranch, licenseSpdx });
  }

  return output
    .sort((left, right) => right.stars - left.stars || Date.parse(right.updatedAt ?? "") - Date.parse(left.updatedAt ?? "") || left.fullName.localeCompare(right.fullName))
    .slice(0, limit);
}

const linkOnlyFailureReasons = new Set([
  "PACKAGE_LANGUAGE_UNSUPPORTED",
  "NODE_MANIFEST_MISSING",
  "NODE_MANIFEST_INVALID",
  "NO_LOCKED_NODE_TEST_SUITE",
  "ARCHIVE_SIZE_LIMIT",
  "ARCHIVE_FILE_LIMIT",
  "ARCHIVE_FILE_TOO_LARGE",
  "ARCHIVE_EXPANSION_LIMIT",
  "UNSUPPORTED_GIT_LFS",
  "UNSUPPORTED_SUBMODULES",
  "CANDIDATE_TEST_FAILED",
  "PACKAGE_SIZE_LIMIT",
  "PACKAGE_FILE_TOO_LARGE",
  "CODEX_DRAFT_UNAVAILABLE",
  "CODEX_DRAFT_INVALID",
]);

export function getAiWorkflowLinkOnlyFailureReason(error: unknown) {
  const reason = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return linkOnlyFailureReasons.has(reason) ? reason : null;
}

export function getAiWorkflowFailureCode(error: unknown): "GITHUB_RATE_LIMIT" | "NETWORK_UNAVAILABLE" | "SANDBOX_UNAVAILABLE" | "ARCHIVE_UPLOAD_FAILED" | "UNKNOWN" {
  if (!error || typeof error !== "object") return "UNKNOWN";
  const record = error as { code?: unknown; status?: unknown; message?: unknown; cause?: unknown };
  const code = typeof record.code === "string" ? record.code : "";
  const message = typeof record.message === "string" ? record.message : "";
  const cause = record.cause && typeof record.cause === "object" ? record.cause as { code?: unknown; message?: unknown } : null;
  const causeText = cause ? `${typeof cause.code === "string" ? cause.code : ""} ${typeof cause.message === "string" ? cause.message : ""}` : "";
  if (code === "GITHUB_RATE_LIMIT" || message === "GITHUB_RATE_LIMIT") return "GITHUB_RATE_LIMIT";
  if (/ENOTFOUND|ECONNRESET|ETIMEDOUT|EAI_AGAIN|NETWORK/i.test(code + " " + message + " " + causeText)) return "NETWORK_UNAVAILABLE";
  if (/SANDBOX_UNAVAILABLE/.test(message)) return "SANDBOX_UNAVAILABLE";
  if (/COS|UPLOAD|PRIVATE_COS_ACCESS|SIGNED_COS_READ/i.test(message)) return "ARCHIVE_UPLOAD_FAILED";
  return "UNKNOWN";
}

export function redactAiWorkflowCollectorText(value: string, secrets: readonly string[] = []) {
  let safe = value;
  for (const secret of secrets) {
    if (secret.length >= 4) safe = safe.replaceAll(secret, "[REDACTED]");
  }
  return safe
    .replace(/(authorization\s*[:=]\s*)(?:bearer\s+)?[^\s,;]+/gi, "$1[REDACTED]")
    .replace(/((?:secret(?:_id|_key)?|token|password|api[_-]?key)\s*[:=]\s*)[^\s,;]+/gi, "$1[REDACTED]")
    .replace(/https?:\/\/[^\s"'<>]+/gi, (url) => {
      try {
        const parsed = new URL(url);
        if (parsed.search) parsed.search = "?[REDACTED]";
        return parsed.toString();
      } catch {
        return "[URL_REDACTED]";
      }
    });
}
