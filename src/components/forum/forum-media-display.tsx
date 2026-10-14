/* eslint-disable @next/next/no-img-element -- Media must use the authorization-aware endpoint directly. */

export type ForumMediaAttachment = { id: string; kind: string; mimeType?: string; originalName?: string };

export function ForumMediaDisplay({ attachments, locale }: { attachments: ForumMediaAttachment[]; locale: "zh" | "en" }) {
  if (!attachments.length) return null;
  const images = attachments.filter((item) => item.kind === "image");
  const videos = attachments.filter((item) => item.kind === "video");
  return (
    <div className="forum-media-display">
      {images.length > 0 && <div className="forum-media-display__images">
        {images.map((item, index) => {
          const url = `/api/forum/media/${encodeURIComponent(item.id)}`;
          const label = locale === "zh" ? `查看图片 ${index + 1}` : `View image ${index + 1}`;
          return <a key={item.id} href={url} target="_blank" rel="noopener noreferrer" aria-label={label}>
            <img className="forum-media-display__image" src={url} alt={locale === "zh" ? `帖子图片 ${index + 1}` : `Forum image ${index + 1}`} loading="lazy" />
          </a>;
        })}
      </div>}
      {videos.map((item) => <video key={item.id} className="forum-media-display__video" src={`/api/forum/media/${encodeURIComponent(item.id)}`} controls playsInline preload="metadata" aria-label={locale === "zh" ? "帖子视频" : "Forum video"}>
        {locale === "zh" ? "你的浏览器暂不支持播放此视频。" : "Your browser does not support this video."}
      </video>)}
    </div>
  );
}
