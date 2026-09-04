import {
  AiTrendDailyDetailPageShell,
  generateAiTrendDailyDetailMetadata
} from "@/app/ai-trends/daily/[date]/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  return generateAiTrendDailyDetailMetadata(date);
}

export default async function AiTrendDailyDetailPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  return (
    <PublicSiteChrome forceLocale="zh">
      <AiTrendDailyDetailPageShell date={date} />
    </PublicSiteChrome>
  );
}
