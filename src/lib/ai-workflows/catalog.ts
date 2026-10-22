import { Prisma } from "@prisma/client";

export type AiWorkflowCatalogFilters = {
  q: string;
  topic: string;
  paid: "all" | "free" | "paid";
  environment: "all" | "windows" | "macos" | "linux";
  type: "all" | "workflow" | "automation" | "agent" | "template" | "companion";
  sort: "recommended" | "latest" | "downloads" | "rating" | "price";
  page: number;
  pageSize: 12;
};

export type AiWorkflowCatalogSearchParams = Record<string, string | string[] | undefined>;

export const aiWorkflowFilterParamNames = ["q", "topic", "paid", "environment", "type", "sort"] as const;

export function normalizeAiWorkflowCatalogSearchParams(params: AiWorkflowCatalogSearchParams): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
}

const paidOptions = new Set(["all", "free", "paid"] as const);
const environmentOptions = new Set(["all", "windows", "macos", "linux"] as const);
const typeOptions = new Set(["all", "workflow", "automation", "agent", "template", "companion"] as const);
const sortOptions = new Set(["recommended", "latest", "downloads", "rating", "price"] as const);

function parseOption<T extends string>(value: string | undefined, allowed: Set<T>, fallback: T): T {
  return value && allowed.has(value as T) ? value as T : fallback;
}

export function parseAiWorkflowCatalogFilters(params: AiWorkflowCatalogSearchParams): AiWorkflowCatalogFilters {
  const normalized = normalizeAiWorkflowCatalogSearchParams(params);
  const pageValue = Number(normalized.page ?? "1");
  return {
    q: (normalized.q ?? "").trim().slice(0, 120),
    topic: (normalized.topic ?? "").trim().slice(0, 120),
    paid: parseOption(normalized.paid, paidOptions, "all"),
    environment: parseOption(normalized.environment, environmentOptions, "all"),
    type: parseOption(normalized.type, typeOptions, "all"),
    sort: parseOption(normalized.sort, sortOptions, "recommended"),
    page: Number.isFinite(pageValue) ? Math.max(1, Math.min(10000, Math.trunc(pageValue))) : 1,
    pageSize: 12,
  };
}

export function buildAiWorkflowCatalogWhere(filters: AiWorkflowCatalogFilters): Prisma.ToolWhereInput {
  const where: Prisma.ToolWhereInput = { type: "ai_workflow", status: "published" };
  const and: Prisma.ToolWhereInput[] = [];

  if (filters.q) {
    and.push({
      OR: [
        { name: { contains: filters.q, mode: "insensitive" } },
        { englishName: { contains: filters.q, mode: "insensitive" } },
        { slug: { contains: filters.q, mode: "insensitive" } },
        { shortDescription: { contains: filters.q, mode: "insensitive" } },
        { content: { contains: filters.q, mode: "insensitive" } },
        { category: { is: { name: { contains: filters.q, mode: "insensitive" } } } },
        { tagLinks: { some: { tag: { name: { contains: filters.q, mode: "insensitive" } } } } },
        { aiWorkflowCandidate: { is: { repositoryName: { contains: filters.q, mode: "insensitive" } } } },
        { aiWorkflowCandidate: { is: { repositoryOwner: { contains: filters.q, mode: "insensitive" } } } },
        { aiWorkflowCandidate: { is: { repositoryUrl: { contains: filters.q, mode: "insensitive" } } } },
        { aiWorkflowCandidate: { is: { topic: { is: { name: { contains: filters.q, mode: "insensitive" } } } } } },
        {
          aiWorkflowCandidate: {
            is: {
              topic: { is: { englishName: { contains: filters.q, mode: "insensitive" } } },
            },
          },
        },
      ],
    });
  }

  if (filters.topic) and.push({ aiWorkflowCandidate: { is: { topicId: filters.topic } } });
  if (filters.paid === "paid") and.push({ isDownloadPaid: true, downloadPrice: { gt: 0 } });
  if (filters.paid === "free") and.push({ OR: [{ isDownloadPaid: false }, { downloadPrice: { lte: 0 } }] });
  if (filters.environment !== "all") {
    and.push({ aiWorkflowCandidate: { is: { verifiedEnvironments: { has: filters.environment } } } });
  }
  if (filters.type !== "all") and.push({ aiWorkflowCandidate: { is: { projectType: filters.type } } });

  if (and.length) where.AND = and;
  return where;
}

export function buildAiWorkflowCatalogOrderBy(sort: AiWorkflowCatalogFilters["sort"]): Prisma.ToolOrderByWithRelationInput[] {
  if (sort === "latest") return [{ createdAt: "desc" }, { id: "asc" }];
  if (sort === "downloads") return [{ downloadCount: "desc" }, { createdAt: "desc" }];
  if (sort === "price") return [{ downloadPrice: "asc" }, { createdAt: "desc" }];
  return [{ sortOrder: "asc" }, { createdAt: "desc" }];
}
