import { readFile } from "node:fs/promises";
import type { EbosEvidenceWarning } from "../evidence";
import type {
  EbosCompetitorManualInput,
  EbosCompetitorSeed,
  LoadCompetitorManualInputOptions
} from "./competitor-evidence-types";

const DEFAULT_COMPETITOR_SEEDS: EbosCompetitorSeed[] = [
  {
    id: "futurepedia",
    name: "Futurepedia",
    url: "https://www.futurepedia.io",
    category: "ai_tool_directory",
    priority: "high",
    source: "manual",
    notes: "AI tool directory observation target.",
    recommendedAuditPaths: ["/", "/pricing", "/ai-tools"]
  },
  {
    id: "theres-an-ai-for-that",
    name: "There's An AI For That",
    url: "https://theresanaiforthat.com",
    category: "ai_tool_directory",
    priority: "high",
    source: "manual",
    notes: "AI tool directory observation target.",
    recommendedAuditPaths: ["/", "/pricing", "/ai-tools"]
  },
  {
    id: "toolify",
    name: "Toolify",
    url: "https://www.toolify.ai",
    category: "ai_tool_directory",
    priority: "medium",
    source: "manual",
    notes: "AI tool directory observation target.",
    recommendedAuditPaths: ["/", "/category", "/best-ai-tools"]
  },
  {
    id: "futuretools",
    name: "FutureTools",
    url: "https://www.futuretools.io",
    category: "ai_tool_directory",
    priority: "medium",
    source: "manual",
    notes: "AI tool directory observation target.",
    recommendedAuditPaths: ["/", "/tools", "/newsletter"]
  },
  {
    id: "gumroad-discover",
    name: "Gumroad Discover",
    url: "https://gumroad.com/discover",
    category: "digital_product_marketplace",
    priority: "medium",
    source: "manual",
    notes: "Digital product marketplace observation target.",
    recommendedAuditPaths: ["/discover", "/discover?query=ai", "/"]
  },
  {
    id: "whop-discover",
    name: "Whop Discover",
    url: "https://whop.com/discover",
    category: "digital_product_marketplace",
    priority: "medium",
    source: "manual",
    notes: "Digital product marketplace observation target.",
    recommendedAuditPaths: ["/discover", "/", "/ai"]
  },
  {
    id: "product-hunt",
    name: "Product Hunt",
    url: "https://www.producthunt.com",
    category: "digital_product_marketplace",
    priority: "medium",
    source: "manual",
    notes: "Launch and discovery marketplace observation target.",
    recommendedAuditPaths: ["/", "/topics/artificial-intelligence", "/products"]
  },
  {
    id: "github-trending",
    name: "GitHub Trending",
    url: "https://github.com/trending",
    category: "technical_workflow_reference",
    priority: "medium",
    source: "manual",
    notes: "Open technical workflow observation target.",
    recommendedAuditPaths: ["/trending", "/trending/typescript", "/trending/python"]
  },
  {
    id: "hugging-face-spaces",
    name: "Hugging Face Spaces",
    url: "https://huggingface.co/spaces",
    category: "technical_workflow_reference",
    priority: "medium",
    source: "manual",
    notes: "Open AI demo and workflow observation target.",
    recommendedAuditPaths: ["/spaces", "/spaces?sort=trending", "/models"]
  }
];

export function getDefaultCompetitorSeeds(): EbosCompetitorSeed[] {
  return DEFAULT_COMPETITOR_SEEDS.map((seed) => ({ ...seed }));
}

export async function loadCompetitorManualInput(
  options: LoadCompetitorManualInputOptions = {}
): Promise<{
  seeds: EbosCompetitorSeed[];
  notes: string[];
  warnings: EbosEvidenceWarning[];
}> {
  const warnings: EbosEvidenceWarning[] = [];
  const input = options.input ?? await readInputFile(options.filePath);
  const seeds = input?.seeds?.length ? input.seeds : getDefaultCompetitorSeeds();
  const normalized = normalizeCompetitorSeeds(seeds);

  warnings.push(...normalized.warnings);
  warnings.push({
    code: input?.seeds?.length ? "manual_competitor_seed" : "default_competitor_seed",
    severity: "warning",
    source: "manual_input",
    message: "Competitor seeds are observation targets only and do not represent a complete competitor list."
  });

  return {
    seeds: normalized.seeds,
    notes: input?.notes ?? [],
    warnings
  };
}

export function normalizeCompetitorSeeds(input: EbosCompetitorSeed[]): {
  seeds: EbosCompetitorSeed[];
  warnings: EbosEvidenceWarning[];
} {
  const byUrl = new Map<string, EbosCompetitorSeed>();
  const warnings: EbosEvidenceWarning[] = [];

  for (const seed of input) {
    const normalized = normalizeSeed(seed);
    if (!normalized) {
      warnings.push({
        code: "invalid_competitor_seed_url",
        severity: "warning",
        source: "manual_input",
        message: `Invalid competitor seed URL skipped for ${seed.name || seed.id}.`
      });
      continue;
    }

    const key = normalizeUrlKey(normalized.url);
    const existing = byUrl.get(key);
    if (!existing) {
      byUrl.set(key, normalized);
      continue;
    }

    warnings.push({
      code: "duplicate_competitor_seed",
      severity: "warning",
      source: "manual_input",
      message: `Duplicate competitor seed removed for ${normalized.url}.`
    });

    if (priorityWeight(normalized.priority) >= priorityWeight(existing.priority)) {
      byUrl.set(key, normalized);
    }
  }

  return {
    seeds: [...byUrl.values()],
    warnings
  };
}

async function readInputFile(filePath?: string): Promise<EbosCompetitorManualInput | undefined> {
  if (!filePath) return undefined;
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as EbosCompetitorManualInput;
  return parsed;
}

function normalizeSeed(seed: EbosCompetitorSeed): EbosCompetitorSeed | null {
  const url = normalizeDisplayUrl(seed.url);
  if (!url) return null;

  return {
    ...seed,
    id: seed.id.trim(),
    name: seed.name.trim(),
    url,
    recommendedAuditPaths: normalizeAuditPaths(seed.recommendedAuditPaths, url)
  };
}

function normalizeDisplayUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function normalizeUrlKey(value: string) {
  return (normalizeDisplayUrl(value) ?? value.trim().replace(/\/$/, "")).toLowerCase();
}

function normalizeAuditPaths(paths: string[] | undefined, baseUrl: string) {
  if (!paths?.length) return undefined;
  const base = new URL(baseUrl);
  const normalized: string[] = [];

  for (const path of paths) {
    try {
      const url = new URL(path.trim(), base);
      if (url.origin !== base.origin) continue;
      const pathWithQuery = `${url.pathname || "/"}${url.search}`;
      const cleaned = pathWithQuery === "/" ? "/" : pathWithQuery.replace(/\/$/, "");
      if (!normalized.includes(cleaned)) normalized.push(cleaned);
    } catch {
      continue;
    }

    if (normalized.length >= 3) break;
  }

  return normalized.length ? normalized : undefined;
}

function priorityWeight(priority: EbosCompetitorSeed["priority"]) {
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  return 1;
}
