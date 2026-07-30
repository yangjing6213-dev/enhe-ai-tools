import type { Metadata } from "next";
import { SeoAuditTool } from "@/components/seo-audit/seo-audit-tool";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateCsrfToken } from "@/lib/csrf";
import type { Locale } from "@/lib/i18n";
import { listSeoAuditPaidOffers } from "@/lib/seo-audit/pricing";
import { buildPageMetadata } from "@/lib/seo";

const productPath = "/online-tools/seo-geo-audit";

export function generateSeoAuditProductMetadata(locale: Locale): Metadata {
  const en = locale === "en";
  return buildPageMetadata({
    title: en
      ? "Independent-site SEO/GEO Audit | ENHE AI"
      : "独立站 SEO/GEO 智能巡检 | ENHE AI",
    description: en
      ? "Audit up to 10 public pages free, review three public findings, and unlock an owner-only SEO/GEO remediation report."
      : "免费巡检最多 10 个公开页面，查看 3 条公开问题，并按需解锁仅任务所有者可读的 SEO/GEO 整改报告。",
    path: productPath,
    locale: en ? "en_US" : "zh_CN",
    localeKey: locale,
  });
}

export async function SeoAuditProductPageShell({
  locale,
  initialRunId,
}: {
  locale: Locale;
  initialRunId?: string;
}) {
  const [user, csrfToken, offers] = await Promise.all([
    getCurrentUser(),
    getOrCreateCsrfToken(),
    listSeoAuditPaidOffers().catch(() => []),
  ]);

  return (
    <SeoAuditTool
      locale={locale}
      initialRunId={initialRunId}
      isAuthenticated={Boolean(user)}
      csrfToken={csrfToken}
      offers={offers.map((offer) => ({
        code: offer.code,
        name: offer.name,
        nameEn: offer.nameEn,
        price: offer.price,
        regularPrice: offer.regularPrice,
        isLaunchPrice: offer.isLaunchPrice,
        pageLimit: offer.pageLimit,
        includedRuns: offer.includedRuns,
        validityDays: offer.validityDays,
      }))}
    />
  );
}
