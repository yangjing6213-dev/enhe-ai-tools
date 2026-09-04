import { NextResponse } from "next/server";
import type { Locale } from "@/lib/dictionaries";
import { prisma } from "@/lib/db";
import { resolvePublicToolSlug } from "@/lib/public-content";
import { buildCanonicalToolPath } from "@/lib/public-slugs";
import { absoluteUrl } from "@/lib/seo";

export async function buildLegacyToolDetailRedirectResponse(slug: string, forceLocale: Locale) {
  const slugMatch = await resolvePublicToolSlug(slug);
  if (!slugMatch) return null;

  const tool = await prisma.tool.findUnique({
    where: { id: slugMatch.id },
    select: { slug: true, name: true, englishName: true, status: true, type: true }
  });
  if (!tool || tool.status !== "published") return null;

  return NextResponse.redirect(absoluteUrl(buildCanonicalToolPath(tool, forceLocale)), 301);
}
