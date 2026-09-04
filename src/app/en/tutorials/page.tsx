import { generateTutorialsPageMetadata, TutorialsPageShell } from "@/app/tutorials/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";

export const revalidate = 300;

export async function generateMetadata() {
  return generateTutorialsPageMetadata("en");
}

export default async function EnglishTutorialsPage() {
  return (
    <PublicSiteChrome forceLocale="en">
      <TutorialsPageShell forceLocale="en" />
    </PublicSiteChrome>
  );
}
