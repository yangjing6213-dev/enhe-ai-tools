import type { Prisma } from "@prisma/client";

type AiNewsCoverArticle = {
  id: string;
  title?: string | null;
  keywords?: string | null;
  description?: string | null;
  summary?: string | null;
  coverImage?: string | null;
};

type DuplicateCoverArticle = {
  id: string;
  coverImage?: string | null;
};

const unsplashImageHost = "images.unsplash.com";
const unsplashImagePrefix = `https://${unsplashImageHost}/`;
const coverImageParams = "?auto=format&fit=crop&w=1200&q=80";

const coverImagePools = {
  agent: [
    "photo-1485827404703-89b55fcc595e",
    "photo-1518770660439-4636190af475",
    "photo-1507146426996-ef05306b995a",
    "photo-1535378917042-10a22c95931a",
    "photo-1484417894907-623942c8ee29",
    "photo-1555255707-c07966088b7b"
  ],
  local: [
    "photo-1558494949-ef010cbdcc31",
    "photo-1551808525-51a94da548ce",
    "photo-1516321318423-f06f85e504b3",
    "photo-1551288049-bebda4e38f71",
    "photo-1518432031352-d6fc5c10da5a",
    "photo-1519389950473-47ba0277781c"
  ],
  workflow: [
    "photo-1551434678-e076c223a692",
    "photo-1497366811353-6870744d04b2",
    "photo-1542744173-8e7e53415bb0",
    "photo-1521737604893-d14cc237f11d",
    "photo-1517245386807-bb43f82c33c4",
    "photo-1552664730-d307ca884978"
  ],
  coding: [
    "photo-1515879218367-8466d910aaa4",
    "photo-1461749280684-dccba630e2f6",
    "photo-1504639725590-34d0984388bd",
    "photo-1516116216624-53e697fedbea",
    "photo-1555066931-4365d14bab8c",
    "photo-1498050108023-c5249f4df085"
  ],
  media: [
    "photo-1492619375914-88005aa9e8fb",
    "photo-1536240478700-b869070f9279",
    "photo-1516035069371-29a1b244cc32",
    "photo-1516321497487-e288fb19713f",
    "photo-1516542076529-1ea3854896f2",
    "photo-1526948128573-703ee1aeb6fa"
  ],
  model: [
    "photo-1518186285589-2f7649de83e0",
    "photo-1451187580459-43490279c0fa",
    "photo-1526374965328-7f61d4dc18c5",
    "photo-1500530855697-b586d89ba3ee",
    "photo-1516321165247-4aa89a48be28",
    "photo-1534723328310-e82dad3ee43f"
  ]
} as const;

const topicRules: Array<{ key: keyof typeof coverImagePools; terms: string[] }> = [
  { key: "agent", terms: ["agent", "agents", "智能体", "代理", "自主"] },
  { key: "local", terms: ["local", "on-device", "部署", "本地", "私有化", "服务器"] },
  { key: "workflow", terms: ["workflow", "automation", "自动化", "工作流", "落地", "效率"] },
  { key: "coding", terms: ["code", "coding", "developer", "编程", "代码", "开发"] },
  { key: "media", terms: ["video", "image", "voice", "multimodal", "视频", "图像", "语音", "多模态"] },
  { key: "model", terms: ["model", "模型", "开源", "基础模型", "芯片", "安全", "监管"] }
];

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    url.hash = "";

    if (url.hostname === unsplashImageHost) {
      url.search = "";
      return `${url.origin}${url.pathname}`.replace(/\/$/, "");
    }

    return url.toString();
  } catch {
    return trimmed;
  }
}

function toUnsplashImageUrl(photoId: string) {
  return `${unsplashImagePrefix}${photoId}${coverImageParams}`;
}

function rankCandidatePhotoIds(article: AiNewsCoverArticle) {
  const searchable = [article.title, article.keywords, article.description, article.summary].filter(Boolean).join(" ").toLowerCase();
  const matchedKeys = topicRules.filter((rule) => rule.terms.some((term) => searchable.includes(term.toLowerCase()))).map((rule) => rule.key);
  const keys = matchedKeys.length ? matchedKeys : (Object.keys(coverImagePools) as Array<keyof typeof coverImagePools>);
  const topicPhotoIds = keys.flatMap((key) => coverImagePools[key]);
  const allPhotoIds = Object.values(coverImagePools).flat();

  return Array.from(new Set([...topicPhotoIds, ...allPhotoIds]));
}

export function getAiNewsCoverImageFingerprint(value: string | null | undefined) {
  return normalizeUrl(value ?? "");
}

export function buildAiNewsCoverImageDuplicateWhere(coverImage: string): Prisma.NewsArticleWhereInput {
  const fingerprint = getAiNewsCoverImageFingerprint(coverImage);
  if (fingerprint.startsWith(unsplashImagePrefix)) {
    return {
      coverImage: {
        startsWith: fingerprint
      }
    };
  }

  return { coverImage: fingerprint };
}

export function findDuplicateAiNewsCoverGroups<T extends DuplicateCoverArticle>(articles: T[]) {
  const groups = new Map<string, T[]>();

  for (const article of articles) {
    const fingerprint = getAiNewsCoverImageFingerprint(article.coverImage);
    if (!fingerprint) continue;
    groups.set(fingerprint, [...(groups.get(fingerprint) ?? []), article]);
  }

  return Array.from(groups.entries())
    .filter(([, groupArticles]) => groupArticles.length > 1)
    .map(([fingerprint, groupArticles]) => ({
      fingerprint,
      articles: groupArticles
    }));
}

export function buildReplacementAiNewsCoverImage({
  article,
  usedCoverImages
}: {
  article: AiNewsCoverArticle;
  usedCoverImages: Set<string>;
}) {
  const usedFingerprints = new Set(Array.from(usedCoverImages, (image) => getAiNewsCoverImageFingerprint(image)));
  const candidates = rankCandidatePhotoIds(article);
  const seed = stableHash([article.id, article.title, article.keywords].filter(Boolean).join("|"));

  for (let offset = 0; offset < candidates.length; offset += 1) {
    const photoId = candidates[(seed + offset) % candidates.length];
    const url = toUnsplashImageUrl(photoId);
    if (!usedFingerprints.has(getAiNewsCoverImageFingerprint(url))) {
      return url;
    }
  }

  return `https://source.unsplash.com/1200x630/?artificial-intelligence,technology&sig=${seed}`;
}
