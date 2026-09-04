import { pathToFileURL } from "node:url";
import {
  buildReplacementAiNewsCoverImage,
  findDuplicateAiNewsCoverGroups,
  getAiNewsCoverImageFingerprint
} from "@/lib/ai-news-cover-images";

type AiNewsCoverRepairArticle = {
  id: string;
  title: string;
  slug: string;
  keywords: string | null;
  description: string | null;
  summary: string | null;
  coverImage: string | null;
  createdAt: Date;
  publishedAt: Date | null;
};

type AiNewsCoverRepairDb = {
  newsArticle: {
    findMany: (args: {
      where: {
        coverImage: {
          not: null;
        };
      };
      select: Record<keyof AiNewsCoverRepairArticle, true>;
      orderBy: Array<{ publishedAt: "asc" | "desc" } | { createdAt: "asc" | "desc" }>;
    }) => Promise<AiNewsCoverRepairArticle[]>;
    update: (args: { where: { id: string }; data: { coverImage: string } }) => Promise<unknown>;
  };
};

export type AiNewsCoverRepairReplacement = {
  id: string;
  title: string;
  slug: string;
  oldCoverImage: string;
  newCoverImage: string;
};

export type AiNewsCoverRepairResult = {
  inspectedCount: number;
  duplicateGroupCount: number;
  replacementCount: number;
  applied: boolean;
  replacements: AiNewsCoverRepairReplacement[];
};

export async function repairDuplicateAiNewsCoverImages({
  db,
  apply
}: {
  db: AiNewsCoverRepairDb;
  apply: boolean;
}): Promise<AiNewsCoverRepairResult> {
  const articles = await db.newsArticle.findMany({
    where: {
      coverImage: {
        not: null
      }
    },
    select: {
      id: true,
      title: true,
      slug: true,
      keywords: true,
      description: true,
      summary: true,
      coverImage: true,
      createdAt: true,
      publishedAt: true
    },
    orderBy: [{ publishedAt: "asc" }, { createdAt: "asc" }]
  });

  const usedCoverImages = new Set(articles.map((article) => article.coverImage).filter((coverImage): coverImage is string => Boolean(coverImage)));
  const duplicateGroups = findDuplicateAiNewsCoverGroups(articles);
  const replacements: AiNewsCoverRepairReplacement[] = [];

  for (const group of duplicateGroups) {
    const [, ...duplicateArticles] = group.articles;
    for (const article of duplicateArticles) {
      const newCoverImage = buildReplacementAiNewsCoverImage({ article, usedCoverImages });
      usedCoverImages.add(getAiNewsCoverImageFingerprint(newCoverImage));
      usedCoverImages.add(newCoverImage);

      replacements.push({
        id: article.id,
        title: article.title,
        slug: article.slug,
        oldCoverImage: article.coverImage ?? "",
        newCoverImage
      });
    }
  }

  if (apply) {
    for (const replacement of replacements) {
      await db.newsArticle.update({
        where: { id: replacement.id },
        data: { coverImage: replacement.newCoverImage }
      });
    }
  }

  return {
    inspectedCount: articles.length,
    duplicateGroupCount: duplicateGroups.length,
    replacementCount: replacements.length,
    applied: apply,
    replacements
  };
}

function printRepairResult(result: AiNewsCoverRepairResult) {
  console.log(`Inspected AI news articles with covers: ${result.inspectedCount}`);
  console.log(`Duplicate cover groups: ${result.duplicateGroupCount}`);
  console.log(`Cover replacements ${result.applied ? "applied" : "planned"}: ${result.replacementCount}`);

  for (const replacement of result.replacements) {
    console.log(`- ${replacement.title} (${replacement.slug})`);
    console.log(`  old: ${replacement.oldCoverImage}`);
    console.log(`  new: ${replacement.newCoverImage}`);
  }

  if (!result.applied && result.replacementCount > 0) {
    console.log("Run again with --apply to update the database.");
  }
}

async function main() {
  const apply = process.argv.includes("--apply");
  const { prisma } = await import("@/lib/db");
  const result = await repairDuplicateAiNewsCoverImages({ db: prisma, apply });
  printRepairResult(result);
  await prisma.$disconnect();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
