import {
  generateSeoAuditProductMetadata,
  SeoAuditProductPageShell,
} from "@/app/online-tools/seo-geo-audit/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return generateSeoAuditProductMetadata("en");
}

export default async function EnglishSeoAuditProductPage({
  searchParams,
}: {
  searchParams: Promise<{ run?: string | string[] }>;
}) {
  const { run } = await searchParams;
  const initialRunId =
    typeof run === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(run)
      ? run
      : undefined;

  return (
    <PublicSiteChrome forceLocale="en">
      <SeoAuditProductPageShell locale="en" initialRunId={initialRunId} />
    </PublicSiteChrome>
  );
}
