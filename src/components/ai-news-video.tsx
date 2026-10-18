"use client";

import { useState } from "react";
import { localizeArticleVideoText, resolveArticleVideoMedia, resolveArticleVideoPresentation } from "@/lib/ai-news-video";

type AiNewsVideoProps = {
  video: { url: string; title: string; description?: string };
  locale: "zh" | "en";
  articleTitle: string;
};

export function AiNewsVideo({ video, locale, articleTitle }: AiNewsVideoProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const media = resolveArticleVideoPresentation(video.description) === "embedded" ? resolveArticleVideoMedia(video.url) : null;
  const title = localizeArticleVideoText(video.title, locale, articleTitle);
  const description = localizeArticleVideoText(video.description, locale);
  const english = locale === "en";
  const watchLabel = english ? "Watch on the source website" : "前往来源网站观看";
  const sourceLink = (
    <a
      href={video.url}
      target="_blank"
      rel="nofollow noopener noreferrer"
      className={`inline-flex max-w-full break-all text-[var(--marketing-accent)] underline underline-offset-4 ${media && !failed ? "mt-5" : ""}`}
    >
      {watchLabel}
    </a>
  );

  if (!media || failed) return sourceLink;

  return (
    <section className="glass rounded-2xl p-6" aria-label={title}>
      <h2 className="text-2xl font-black text-[var(--marketing-text)]">{title}</h2>
      {description ? <p className="mt-4 text-base leading-8 text-[var(--marketing-muted)]">{description}</p> : null}
      {media.kind === "native" ? (
        <video
          src={media.src}
          aria-label={title}
          controls
          playsInline
          preload="none"
          onError={() => setFailed(true)}
          className="mt-5 aspect-video w-full rounded-xl bg-black"
        >
          {english ? "Use the source link if the video cannot play." : "无法播放时，可使用下方来源链接。"}
        </video>
      ) : null}
      {media.kind === "embed" ? (
        loaded ? (
          <iframe
            src={media.src}
            title={title}
            loading="lazy"
            allow="encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            onError={() => setFailed(true)}
            className="mt-5 aspect-video w-full rounded-xl border-0"
          />
        ) : (
          <button
            type="button"
            onClick={() => setLoaded(true)}
            className="mt-5 rounded-xl border border-[var(--marketing-accent)]/40 px-5 py-3 text-[var(--marketing-accent)]"
          >
            {english ? "Load video" : "加载视频"}
          </button>
        )
      ) : null}
      {sourceLink}
    </section>
  );
}
