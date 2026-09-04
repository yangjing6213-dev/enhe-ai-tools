import { generateTutorialsPageMetadata, TutorialsPageShell } from "@/app/tutorials/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";

export const revalidate = 300;

export async function generateMetadata() {
  return generateTutorialsPageMetadata("zh");
}

export default async function TutorialsPage() {
  return (
    <PublicSiteChrome forceLocale="zh">
      <TutorialsPageShell forceLocale="zh" />
    </PublicSiteChrome>
  );
}
