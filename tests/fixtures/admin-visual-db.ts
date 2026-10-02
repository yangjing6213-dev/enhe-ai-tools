import type { PrismaClient } from "@prisma/client";

if (
  process.env.ENHE_ADMIN_VISUAL_FIXTURE !== "1" ||
  process.env.NODE_ENV === "production" ||
  Boolean(process.env.DATABASE_URL?.trim()) ||
  Boolean(process.env.DIRECT_URL?.trim()) ||
  Boolean(process.env.SEO_AUDIT_TEST_DATABASE_URL?.trim())
) {
  throw new Error("The admin visual database fixture is available only in local database-free development.");
}

const readMethods = new Set(["findMany", "findFirst", "findUnique", "findUniqueOrThrow", "findFirstOrThrow", "count", "aggregate", "groupBy"]);
const localVisualUser = {
  id: "local-visual-user",
  email: "visual-user@localhost.invalid",
  phone: null,
  passwordHash: "fixture-only-disabled",
  nickname: "Local Visual Fixture User",
  avatar: null,
  role: "user",
  status: "active",
  isTestData: true,
  createdAt: new Date("2026-09-30T00:00:00.000Z"),
  updatedAt: new Date("2026-09-30T00:00:00.000Z"),
  newsletterEmail: null,
  acceptEmailUpdates: false,
  _count: {
    orders: 0,
    comments: 0,
    downloadLogs: 0,
    toolUsageLogs: 0,
    memberships: 0,
    paymentProofs: 0,
    reviewedProofs: 0,
    analyticsEvents: 0,
    toolPurchases: 0,
    vipAdjustments: 0,
    vipOperations: 0,
    refundRecords: 0,
    refundRequests: 0,
    adminAuditLogs: 0,
    sessions: 0,
    notifications: 0,
    newsFavorites: 0,
    newsLikes: 0,
    seoAuditProjects: 0,
    seoAuditRuns: 0,
    seoAuditCredits: 0,
    seoAuditSubscriptions: 0
  }
};
const localVisualOrder = {
  id: "local-visual-order",
  orderNo: "LOCAL-VISUAL-ORDER",
  userId: localVisualUser.id,
  toolId: "local-visual-item",
  user: localVisualUser,
  plan: null,
  tool: { id: "local-visual-item", name: "Local visual fixture item" },
  seoAuditOffer: null,
  amount: 39,
  orderStatus: "pending_review",
  isTestData: true,
  paymentMethod: "alipay",
  paymentProof: { id: "local-visual-proof", reviewStatus: "pending" },
  paymentTransaction: null,
  toolPurchase: null,
  seoAuditCredit: null,
  seoAuditSubscriptionOrder: null,
  toolPriceSpecName: null,
  seoAuditTargetOrigin: null,
  orderType: "software_download",
  createdAt: new Date("2026-09-30T00:00:00.000Z"),
  paidAt: null,
  activatedAt: null,
  refundRecords: [],
  _count: { refundRecords: 0, seoAuditRuns: 0 }
};
const localVisualPaymentProof = {
  id: "local-visual-proof",
  orderId: localVisualOrder.id,
  proofImage: null,
  paymentRemark: "Local visual fixture only",
  paymentMethod: "alipay",
  reviewStatus: "pending",
  order: {
    id: localVisualOrder.id,
    orderNo: localVisualOrder.orderNo,
    amount: localVisualOrder.amount,
    orderStatus: localVisualOrder.orderStatus,
    plan: localVisualOrder.plan,
    tool: localVisualOrder.tool
  },
  user: localVisualUser,
  reviewer: null
};
const localVisualRefund = {
  id: "local-visual-refund",
  orderId: localVisualOrder.id,
  admin: null,
  requester: localVisualUser,
  amount: 39,
  status: "pending",
  reason: "Local visual fixture only",
  note: null,
  refundReceiverQr: null,
  refundProofImage: null,
  completedAt: null,
  createdAt: new Date("2026-09-30T00:00:00.000Z"),
  updatedAt: new Date("2026-09-30T00:00:00.000Z"),
  order: localVisualOrder,
  paymentTransaction: null
};

// Synthetic records for local, read-only populated-state checks only.
const localVisualTool = {
  id: "local-visual-tool", name: "Local visual fixture tool", englishName: null,
  slug: "local-visual-tool", type: "software", status: "draft", sortOrder: 0,
  shortDescription: "Local visual fixture only", content: "Local visual fixture only",
  coverImage: null, screenshots: ["/images/tool-software.svg", "/images/tool-online.svg"],
  videoUrl: null, videoTitle: null, videoDescription: null,
  videoUrl2: null, videoTitle2: null, videoDescription2: null,
  videoUrl3: null, videoTitle3: null, videoDescription3: null,
  version: null, systemRequirement: null, supportedAgents: [],
  isVipRequired: false, isDownloadPaid: false, isDownloadLinkVipOnly: false,
  isHomeRecommended: false, downloadPrice: 0, onlineUrl: null,
  downloadFileId: null, downloadFile: null, priceSpecs: [],
  categoryId: null, category: null, _count: { orders: 0, purchases: 0 }
};
const localVisualToolsById = [
  localVisualTool,
  {
    ...localVisualTool,
    id: "local-visual-online-tool",
    name: "Local visual fixture online service",
    slug: "local-visual-online-tool",
    type: "online",
  },
  {
    ...localVisualTool,
    id: "local-visual-skill-course",
    name: "Local visual fixture skill-learning course",
    slug: "local-visual-skill-course",
    type: "skill_learning",
  },
  {
    ...localVisualTool,
    id: "local-visual-ai-skill",
    name: "Local visual fixture AI Skill",
    slug: "local-visual-ai-skill",
    type: "ai_skill",
  },
];
const localVisualContentDate = new Date("2026-09-30T00:00:00.000Z");
const localVisualArticle = {
  id: "local-visual-article",
  title: "Local visual fixture AI news article",
  slug: "local-visual-article",
  subtitle: "Local visual fixture only",
  description: "Local visual fixture only",
  keywords: "fixture",
  summary: "Local visual fixture only",
  content: "Local visual fixture only",
  coverImage: null,
  videoUrl: null,
  videoTitle: null,
  videoDescription: null,
  author: "Local visual fixture",
  status: "draft",
  categoryId: null,
  publishedAt: null,
  readingTime: 5,
  viewCount: 0,
  likeCount: 0,
  favoriteCount: 0,
  isFeatured: false,
  isPinned: false,
  sortOrder: 0,
  seoTitle: null,
  seoDescription: null,
  seoKeywords: null,
  canonicalUrl: null,
  sourceChannel: null,
  importedAt: null,
  importBatchId: null,
  rawImportPayload: null,
  keyTakeaways: [],
  impactNotes: null,
  conclusion: null,
  relatedArticleIds: [],
  relatedToolIds: [],
  relatedTutorialIds: [],
  englishTitle: null,
  englishSubtitle: null,
  englishDescription: null,
  englishSummary: null,
  englishContent: null,
  englishKeywords: null,
  englishSeoTitle: null,
  englishSeoDescription: null,
  englishSeoKeywords: null,
  englishKeyTakeaways: [],
  englishImpactNotes: null,
  englishConclusion: null,
  createdAt: localVisualContentDate,
  updatedAt: localVisualContentDate,
  category: null,
  tagLinks: [],
  externalSources: []
};
const localVisualTopic = {
  id: "local-visual-topic",
  slug: "local-visual-topic",
  status: "active",
  sortOrder: 0,
  title: "Local visual fixture topic",
  description: "Local visual fixture only",
  intro: "Local visual fixture only",
  answer: "Local visual fixture only",
  searchQuery: "local visual fixture",
  keywords: [],
  whyItMatters: [],
  actionLinks: [],
  faqs: [],
  sourceLinks: [],
  englishTitle: null,
  englishDescription: null,
  englishIntro: null,
  englishAnswer: null,
  englishSearchQuery: null,
  englishKeywords: [],
  englishWhyItMatters: [],
  englishActionLinks: [],
  englishFaqs: [],
  createdAt: localVisualContentDate,
  updatedAt: localVisualContentDate
};
const localVisualProductDemo = {
  id: "local-visual-demo",
  title: "Local visual fixture product demo",
  slug: "local-visual-demo",
  description: "Local visual fixture only",
  category: "software",
  tags: ["local fixture"],
  coverImage: "",
  coverAlt: "Local visual fixture only",
  videoUrl: null,
  videoDuration: null,
  uploadDate: null,
  transcript: null,
  faq: [],
  productType: null,
  relatedProductId: null,
  relatedProductSlug: null,
  relatedProductUrl: null,
  demoUrl: null,
  tutorialUrl: null,
  isFeaturedOnHome: false,
  sortOrder: 0,
  status: "draft",
  seoTitle: null,
  seoDescription: null,
  canonicalUrl: null,
  publishedAt: null,
  createdAt: localVisualContentDate,
  updatedAt: localVisualContentDate,
  relatedProduct: null
};
const localVisualFaq = {
  id: "local-visual-faq",
  toolId: localVisualTool.id,
  question: "Local visual fixture question",
  answer: "Local visual fixture only",
  status: "active",
  sortOrder: 0,
  createdAt: localVisualContentDate,
  updatedAt: localVisualContentDate,
  tool: localVisualTool
};
const localVisualChangelog = {
  id: "local-visual-changelog",
  toolId: localVisualTool.id,
  version: "0.0.0-local",
  title: "Local visual fixture changelog",
  content: "Local visual fixture only",
  releaseDate: localVisualContentDate,
  status: "active",
  sortOrder: 0,
  createdAt: localVisualContentDate,
  updatedAt: localVisualContentDate,
  tool: localVisualTool
};
const localVisualTutorial = {
  id: "local-visual-tutorial",
  toolId: localVisualTool.id,
  title: "Local visual fixture tutorial",
  content: "Local visual fixture only",
  imageUrl: null,
  videoUrl: null,
  notes: null,
  commonErrors: null,
  sortOrder: 0,
  status: "active",
  createdAt: localVisualContentDate,
  updatedAt: localVisualContentDate,
  tool: localVisualTool
};
const localVisualContentRecords: Record<string, { id: string }> = {
  newsArticle: localVisualArticle,
  newsTopic: localVisualTopic,
  productDemo: localVisualProductDemo,
  toolFaq: localVisualFaq,
  toolChangelog: localVisualChangelog,
  tutorial: localVisualTutorial
};
const localVisualSeoRun = {
  id: "local-visual-seo-run", status: "failed", kind: "free",
  normalizedOrigin: "https://visual-fixture.invalid", pageLimit: 1,
  totalTimeoutSeconds: 30, attemptCount: 1, maxAttempts: 2,
  availableAt: new Date("2026-09-30T00:00:00.000Z"), cancelRequestedAt: null,
  startedAt: null, completedAt: null, failedAt: new Date("2026-09-30T00:00:00.000Z"),
  failureCode: "LOCAL_VISUAL_FIXTURE", failureMessage: "Local visual fixture only",
  engineVersion: "local-visual-fixture", summaryScore: null,
  summaryEvidenceCoverage: null, summaryPageCount: 0,
  summaryCriticalCount: 0, summaryHighCount: 1, summaryMediumCount: 0,
  summaryFindings: [{ id: "local-visual-finding", code: "LOCAL_FIXTURE", severity: "high", summary: "Local visual fixture only" }],
  createdAt: new Date("2026-09-30T00:00:00.000Z"), updatedAt: new Date("2026-09-30T00:00:00.000Z"),
  user: null, project: null, offer: null, sourceOrder: null, credit: null, subscription: null
};

export const prisma = new Proxy(
  {},
  {
    get(_client, modelName) {
      if (typeof modelName !== "string") return undefined;
      if (modelName === "$transaction" || modelName === "$queryRaw" || modelName === "$executeRaw") {
        return (..._args: unknown[]) => {
          throw new Error(`Database operations are disabled in the admin visual fixture: prisma.${modelName}`);
        };
      }

      return new Proxy(
        {},
        {
          get(_delegate, operation) {
            if (typeof operation !== "string") return undefined;
            if (operation === "$disconnect" || operation === "$connect") return async () => undefined;
            if (!readMethods.has(operation)) {
              throw new Error(`Database writes are disabled in the admin visual fixture: ${modelName}.${operation}`);
            }
            if (operation === "findUnique" && Object.hasOwn(localVisualContentRecords, modelName)) {
              const record = localVisualContentRecords[modelName];
              return async (args?: { where?: { id?: string } }) =>
                args?.where?.id === record.id ? record : null;
            }
            if (modelName === "tool" && operation === "findMany") {
              return async (args?: {
                orderBy?: { name?: string };
                include?: Record<string, unknown>;
                select?: Record<string, unknown>;
              }) => {
                const requestsSortedToolNames = args?.orderBy?.name === "asc" &&
                !args.include &&
                args.select?.id === true &&
                args.select.name === true &&
                Object.keys(args.select).length === 2;
                if (!requestsSortedToolNames || process.env.ENHE_ADMIN_VISUAL_EMPTY_TOOLS === "1") return [];
                return [localVisualTool];
              };
            }
            if (modelName === "user" && operation === "findUnique") {
              return async (args?: { where?: { id?: string } }) =>
                args?.where?.id === localVisualUser.id ? localVisualUser : null;
            }
            if (modelName === "order" && operation === "findUnique") {
              return async (args?: { where?: { id?: string } }) =>
                args?.where?.id === localVisualOrder.id ? localVisualOrder : null;
            }
            if (modelName === "paymentProof" && operation === "findUnique") {
              return async (args?: { where?: { id?: string } }) =>
                args?.where?.id === localVisualPaymentProof.id ? localVisualPaymentProof : null;
            }
            if (modelName === "orderRefundRecord" && operation === "findUnique") {
              return async (args?: { where?: { id?: string } }) =>
                args?.where?.id === localVisualRefund.id ? localVisualRefund : null;
            }
            if (modelName === "tool" && operation === "findFirst") {
              return async (args?: { where?: { id?: string; type?: string } }) => {
                const where = args?.where;
                if (!where) return null;
                return localVisualToolsById.find(
                  (tool) => tool.id === where.id && tool.type === where.type,
                ) ?? null;
              };
            }
            if (modelName === "seoAuditRun" && operation === "findUnique") {
              return async (args?: { where?: { id?: string } }) =>
                args?.where?.id === localVisualSeoRun.id ? localVisualSeoRun : null;
            }
            if (modelName === "siteSetting" && operation === "findMany") {
              return async (args?: { where?: { key?: { in?: string[] } } }) => [
                { key: "alipay_qr", value: "Local visual fixture only" },
                { key: "wechat_qr", value: "Local visual fixture only" }
              ].filter((setting) => args?.where?.key?.in?.includes(setting.key));
            }
            return async () =>
              operation === "count"
                ? 0
                : operation === "aggregate"
                  ? { _sum: { amount: null } }
                  : operation === "findUnique"
                    ? null
                  : [];
          }
        }
      );
    }
  }
) as PrismaClient;
