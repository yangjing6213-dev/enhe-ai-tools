import type {
  ApiKeyRecord,
  ApiPlan,
  BillingOrder,
  ConsoleQuickAction,
  DeveloperProfile,
  ReferralRecord,
  RequestLogRecord,
  UsageTrendPoint
} from "./types";

export const ENHE_API_BASE_URL = "https://api.enhe-tech.com.cn";

export const pricingPlans: ApiPlan[] = [
  {
    name: "Starter",
    price: "¥29",
    period: "月",
    credit: "$5 API 额度",
    fiveHourWindow: "$1.20",
    sevenDayWindow: "$5",
    maxKeys: 3,
    audience: "适合个人试用、轻量脚本和低频 AI 编程工具配置。",
    cta: "选择 Starter"
  },
  {
    name: "Pro",
    price: "¥99",
    period: "月",
    credit: "$25 API 额度",
    fiveHourWindow: "$8",
    sevenDayWindow: "$25",
    maxKeys: 20,
    audience: "适合日常 Codex、Claude Code、Cursor 和内容工作流。",
    cta: "选择 Pro",
    highlighted: true
  },
  {
    name: "Ultra",
    price: "¥299",
    period: "月",
    credit: "$90 API 额度",
    fiveHourWindow: "$30",
    sevenDayWindow: "$90",
    maxKeys: 60,
    audience: "适合多项目开发、团队前置验证和高频内容生成。",
    cta: "选择 Ultra"
  },
  {
    name: "Enterprise",
    price: "联系 ENHE",
    period: "按协议",
    credit: "自定义额度",
    fiveHourWindow: "自定义",
    sevenDayWindow: "自定义",
    maxKeys: "custom",
    audience: "适合企业采购、合规评估、专属模型权限和人工支持。",
    cta: "联系开通"
  }
];

export const dashboardMetrics = [
  { label: "当前方案", value: "Pro", helper: "mock 套餐" },
  { label: "可用额度", value: "$18.42", helper: "套餐、充值、推荐余额汇总" },
  { label: "近 30 天请求数", value: "18,640", helper: "仅 mock 展示" },
  { label: "今日请求数", value: "326", helper: "UTC+8 统计窗口" },
  { label: "平均延迟", value: "842 ms", helper: "最近 24 小时" }
];

export const quickActions: ConsoleQuickAction[] = [
  { label: "创建 API Key", href: "/user/api/keys" },
  { label: "查看用量", href: "/user/api/usage" },
  { label: "查看请求日志", href: "/user/api/logs" },
  { label: "查看文档", href: "/user/api/docs" },
  { label: "购买额度", href: "/user/api/billing" },
  { label: "邀请好友", href: "/user/api/referrals" }
];

export const apiKeys: ApiKeyRecord[] = [
  {
    id: "key_console",
    name: "Codex 本机配置",
    prefix: "enhe_sk_live_ab12...",
    createdAt: "2026-07-02 10:21",
    lastUsedAt: "2026-07-05 15:40",
    todayUsage: "$1.42",
    status: "active"
  },
  {
    id: "key_content",
    name: "内容批处理脚本",
    prefix: "enhe_sk_live_cd34...",
    createdAt: "2026-06-28 18:02",
    lastUsedAt: "2026-07-04 22:18",
    todayUsage: "$0.28",
    status: "active"
  }
];

export const requestLogs: RequestLogRecord[] = [
  {
    id: "log_01",
    time: "2026-07-05 15:42:18",
    method: "POST",
    path: "/v1/chat/completions",
    model: "enhe-coder-pro",
    keyPrefix: "enhe_sk_live_ab12...",
    tokens: "in 1,248 / out 642",
    cost: "$0.048",
    latency: "912 ms",
    statusCode: 200,
    requestId: "req_enhe_7h4m2k"
  },
  {
    id: "log_02",
    time: "2026-07-05 15:30:51",
    method: "POST",
    path: "/v1/messages",
    model: "enhe-claude-bridge",
    keyPrefix: "enhe_sk_live_ab12...",
    tokens: "in 806 / out 391",
    cost: "$0.031",
    latency: "1,084 ms",
    statusCode: 200,
    requestId: "req_enhe_6f9p1a"
  },
  {
    id: "log_03",
    time: "2026-07-05 14:58:04",
    method: "GET",
    path: "/v1/models",
    model: "-",
    keyPrefix: "enhe_sk_live_cd34...",
    tokens: "-",
    cost: "$0.000",
    latency: "86 ms",
    statusCode: 200,
    requestId: "req_enhe_4u8n0c"
  },
  {
    id: "log_04",
    time: "2026-07-05 14:12:39",
    method: "POST",
    path: "/v1/chat/completions",
    model: "enhe-coder-pro",
    keyPrefix: "enhe_sk_live_cd34...",
    tokens: "in 2,019 / out 0",
    cost: "$0.000",
    latency: "42 ms",
    statusCode: 402,
    requestId: "req_enhe_3c2v8s"
  },
  {
    id: "log_05",
    time: "2026-07-05 13:44:10",
    method: "POST",
    path: "/v1/messages",
    model: "enhe-claude-bridge",
    keyPrefix: "enhe_sk_live_ab12...",
    tokens: "in 422 / out 0",
    cost: "$0.000",
    latency: "28 ms",
    statusCode: 429,
    requestId: "req_enhe_2b8w6q"
  },
  {
    id: "log_06",
    time: "2026-07-05 12:28:55",
    method: "POST",
    path: "/v1/chat/completions",
    model: "enhe-fast-chat",
    keyPrefix: "enhe_sk_live_ab12...",
    tokens: "in 694 / out 320",
    cost: "$0.016",
    latency: "731 ms",
    statusCode: 200,
    requestId: "req_enhe_1a7r5m"
  }
];

export const usageTrend: UsageTrendPoint[] = [
  { day: "06-29", requests: 144, credit: 0.92 },
  { day: "06-30", requests: 208, credit: 1.38 },
  { day: "07-01", requests: 260, credit: 1.76 },
  { day: "07-02", requests: 314, credit: 2.18 },
  { day: "07-03", requests: 286, credit: 1.94 },
  { day: "07-04", requests: 402, credit: 2.66 },
  { day: "07-05", requests: 326, credit: 2.04 }
];

export const walletBreakdown = [
  { label: "总可用额度", value: "$18.42", helper: "所有余额汇总" },
  { label: "套餐余额", value: "$11.80", helper: "优先扣费" },
  { label: "充值余额", value: "$4.90", helper: "套餐后扣费" },
  { label: "推荐余额", value: "$1.72", helper: "最后扣费" },
  { label: "5 小时窗口", value: "$2.40 / $8", helper: "mock 消费窗口" },
  { label: "7 天窗口", value: "$10.36 / $25", helper: "mock 消费窗口" }
];

export const billingOrders: BillingOrder[] = [
  { id: "api_order_1007", item: "Pro 月度套餐", amount: "¥99", status: "paid", createdAt: "2026-07-01" },
  { id: "api_order_1004", item: "$10 额度包", amount: "¥69", status: "processing", createdAt: "2026-06-26" },
  { id: "api_order_0998", item: "管理员手动开通", amount: "¥0", status: "manual", createdAt: "2026-06-18" }
];

export const referrals: ReferralRecord[] = [
  { id: "ref_01", user: "li***@example.com", status: "rewarded", reward: "$1.00", createdAt: "2026-07-03" },
  { id: "ref_02", user: "zh***@example.com", status: "qualified", reward: "$1.00 待发", createdAt: "2026-07-04" },
  { id: "ref_03", user: "wa***@example.com", status: "pending", reward: "$1.00 待激活", createdAt: "2026-07-05" },
  { id: "ref_04", user: "te***@example.com", status: "review", reward: "待审核", createdAt: "2026-07-05" }
];

export const developerProfile: DeveloperProfile = {
  avatarInitials: "EA",
  displayName: "ENHE Developer",
  email: "developer@example.com",
  developerId: "dev_enhe_42k9",
  status: "active"
};

export const supportedTools = ["Codex", "Claude Code", "Cursor", "Cline"];

export const faqItems = [
  {
    question: "ENHE API 会调用真实上游模型吗？",
    answer: "当前页面是阶段 3 前端 mock，不会调用真实 Gateway 或真实上游模型。"
  },
  {
    question: "完整 API Key 会在哪里显示？",
    answer: "正式实现后只会在创建成功时显示一次。列表、日志和后台只显示 prefix。"
  },
  {
    question: "余额不足时如何处理？",
    answer: "Gateway 应在调用上游前返回 402，并引导用户进入用量页或账单页补充额度。"
  },
  {
    question: "是否兼容 OpenAI 和 Anthropic 风格接口？",
    answer: "MVP 规划包含 /v1/models、/v1/chat/completions 和 /v1/messages。"
  }
];
