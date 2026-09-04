import {
  AiTrendDailyDetailPageShell,
  generateAiTrendDailyDetailMetadata
} from "@/app/ai-trends/daily/[date]/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  return generateAiTrendDailyDetailMetadata(date, "en");
}

export default async function EnglishAiTrendDailyDetailPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  return (
    <PublicSiteChrome forceLocale="en">
      <AiTrendDailyDetailPageShell date={date} forceLocale="en" />
    </PublicSiteChrome>
  );
}
