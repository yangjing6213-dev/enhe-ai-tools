import type { Metadata } from "next";
import { SeoAuditUserPageShell } from "@/app/user/seo-audit/page-shell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "SEO/GEO Audit Workspace | ENHE AI",
  robots: { index: false, follow: false },
};

export default function EnglishSeoAuditUserPage() {
  return <SeoAuditUserPageShell locale="en" />;
}
