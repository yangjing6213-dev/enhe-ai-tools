"use client";

import Link from "next/link";
import { ArrowUpRight, PlayCircle } from "lucide-react";
import { ProductVideoPlayer } from "@/components/product-video-player";

type AiTrendVideoBriefingProps = {
  locale: "zh" | "en";
  title: string;
  slug: string;
  coreConclusion: string;
  videoUrl: string;
  videoTitle?: string | null;
  videoDescription?: string | null;
  videoPosterUrl?: string | null;
  dailyHref: string;
};

const copy = {
  zh: {
    badge: "最新一期视频简报",
    title: "最新一期已发布 AI 趋势简报的视频",
    playLabel: "播放最新一期 AI 趋势简报视频",
    fallbackText: "当前浏览器不支持 HTML5 视频播放。",
    cta: "查看对应日报",
    summaryLabel: "核心结论",
    videoLabel: "视频摘要"
  },
  en: {
    badge: "Latest video briefing",
    title: "Latest published AI trend briefing video",
    playLabel: "Play the latest AI trend briefing video",
    fallbackText: "Your browser does not support HTML5 video playback.",
    cta: "Open the daily briefing",
    summaryLabel: "Core conclusion",
    videoLabel: "Video summary"
  }
} as const;

export function AiTrendVideoBriefing({
  locale,
  title,
  slug,
  coreConclusion,
  videoUrl,
  videoTitle,
  videoDescription,
  videoPosterUrl,
  dailyHref
}: AiTrendVideoBriefingProps) {
  const text = copy[locale];
  // Video metadata can be Chinese-only while the briefing has an English edition.
  const displayTitle = videoTitle && !(locale === "en" && /\p{Script=Han}/u.test(videoTitle))
    ? videoTitle
    : title;
  const displayDescription = videoDescription && !(locale === "en" && /\p{Script=Han}/u.test(videoDescription))
    ? videoDescription
    : null;

  return (
    <section className="ai-trend-video-briefing surface-panel-soft mt-10 overflow-hidden p-6 md:p-7" aria-labelledby="ai-trend-video-briefing-title">
      <div className="ai-trend-video-briefing-grid grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-start">
        <div className="ai-trend-video-briefing-media overflow-hidden rounded-2xl border border-white/10 bg-black/35">
          <ProductVideoPlayer
            src={videoUrl}
            title={displayTitle}
            fallbackText={text.fallbackText}
            playLabel={text.playLabel}
            poster={videoPosterUrl}
            deferUntilClicked
          />
        </div>

        <div className="ai-trend-video-briefing-copy flex h-full flex-col justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--marketing-accent)]">
              {text.badge}
            </p>
            <h2 id="ai-trend-video-briefing-title" className="mt-3 text-2xl font-black leading-tight text-[var(--marketing-text)]">
              {text.title}
            </h2>
            <time className="mt-4 block text-sm font-bold text-[var(--marketing-accent)]" dateTime={slug}>
              {slug}
            </time>
            <h3 className="mt-4 text-lg font-black leading-snug text-[var(--marketing-text)]">
              {displayTitle}
            </h3>
            {displayDescription ? (
              <p className="mt-3 text-sm leading-7 text-[var(--marketing-muted)]">
                <span className="font-bold text-[var(--marketing-text)]">{text.videoLabel}:</span> {displayDescription}
              </p>
            ) : null}
            <p className="mt-4 text-sm leading-7 text-[var(--marketing-muted)]">
              <span className="font-bold text-[var(--marketing-text)]">{text.summaryLabel}:</span> {coreConclusion}
            </p>
          </div>

          <Link
            href={dailyHref}
          className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[var(--marketing-accent)] transition-colors hover:text-[var(--marketing-text)]"
          >
            <PlayCircle size={18} strokeWidth={1.8} aria-hidden="true" />
            {text.cta}
            <ArrowUpRight size={16} strokeWidth={1.8} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
