import Link from "next/link";
import Image from "next/image";
import { UserAvatar } from "@/components/user-avatar";
import { HoldDeleteForm } from "@/components/hold-delete-form";
import { getForumCategoryLabel, type ForumCategory } from "@/lib/forum-rules";
import type { Locale } from "@/lib/i18n";
import { buildLocalePath } from "@/lib/seo";
import { getForumPost } from "@/lib/forum-data";
import { createForumPostAction, createForumReplyAction, deleteForumReplyAction } from "@/app/forum/actions";
import { ForumLikeButton } from "@/components/forum/forum-like-button";
import { ForumPostActions } from "@/components/forum/forum-post-actions";
import { ForumDeletePostButton } from "@/components/forum/forum-delete-post-button";
import { ForumMediaEditor } from "@/components/forum/forum-media-editor";
import { ForumMediaDisplay } from "@/components/forum/forum-media-display";
import { EmojiText } from "@/components/emoji-text";
import { RichTextEditor } from "@/components/rich-text-editor";
import { RichTextContent } from "@/components/rich-text-content";

type ForumPosts = Awaited<ReturnType<typeof import("@/lib/forum-data").getForumPosts>>;
type ForumPostView = NonNullable<Awaited<ReturnType<typeof getForumPost>>>;

const categories: ForumCategory[] = ["question", "experience", "workflow", "showcase"];

function copy(locale: Locale) {
  return locale === "en" ? {
    title: "AI Community",
    coverAlt: "ENHE AI website shown on a laptop and phone",
    intro: "Ask questions, share useful workflows, and learn from the ENHE AI community.",
    newPost: "Start a discussion",
    all: "All topics",
    empty: "No discussions here yet. Start the first one.",
    signIn: "Sign in to join the discussion",
    like: "Like",
    replies: "replies",
    submitHint: "Posts appear publicly right after publishing.",
    submit: "Publish topic",
    titleLabel: "Title",
    contentLabel: "Details",
    categoryLabel: "Topic",
    contentPlaceholder: "Share enough context for others to help.",
    titlePlaceholder: "What would you like to discuss?",
    published: "Your topic is now public.",
    replyPublished: "Your reply is now public.",
    postDeleted: "Topic deleted. The topic and its replies are no longer public.",
    reply: "Reply",
    replyPlaceholder: "Write a helpful reply",
    sendReply: "Publish reply",
    back: "Back to discussions",
    replyDeleted: "This reply was deleted.",
    deleteReply: "Delete reply",
    comment: "Comment",
  } : {
    title: "AI社区",
    coverAlt: "笔记本电脑和手机上的 ENHE 官网画面",
    intro: "在这里提问、分享实用工作流，与 ENHE AI 用户一起交流。",
    newPost: "发布新话题",
    all: "全部话题",
    empty: "这里还没有话题，来发布第一条吧。",
    signIn: "登录后参与交流",
    like: "喜欢",
    replies: "条回复",
    submitHint: "发布后会立即公开显示。",
    submit: "发布话题",
    titleLabel: "标题",
    contentLabel: "内容",
    categoryLabel: "话题分类",
    contentPlaceholder: "补充背景和细节，方便大家理解并回复。",
    titlePlaceholder: "你想讨论什么？",
    published: "话题已发布，现在公开可见。",
    replyPublished: "回复已发布，现在公开可见。",
    postDeleted: "话题已删除，话题及回复不再公开显示。",
    reply: "回复",
    replyPlaceholder: "写下你的回复",
    sendReply: "发布回复",
    back: "返回话题列表",
    replyDeleted: "这条回复已删除。",
    deleteReply: "删除回复",
    comment: "评论",
  };
}

function pageHref(locale: Locale, path: string) {
  return buildLocalePath(path, locale);
}

function OriginalPostNote({ locale, post }: { locale: Locale; post: { title: string; content: string } }) {
  if (locale !== "en") return null;
  const sample = post.title + " " + post.content.slice(0, 400);
  const chinese = /[这们为对与还从说请个吗您]/u.test(sample) && !/[\u3040-\u30ff\uac00-\ud7a3]/u.test(sample);
  return <small className="forum-original-language">{chinese ? "Original post in Chinese" : "Original post"}</small>;
}

function dateLabel(date: Date, locale: Locale) {
  return date.toLocaleDateString(locale === "en" ? "en-US" : "zh-CN", { year: "numeric", month: "short", day: "numeric" });
}

function JoinLink({ locale, returnTo = "/forum" }: { locale: Locale; returnTo?: string }) {
  const t = copy(locale);
  return <Link className="forum-login-link" href={`${pageHref(locale, "/login")}?returnTo=${encodeURIComponent(pageHref(locale, returnTo))}`}>{t.signIn}</Link>;
}

function topicArtwork(text: string, category: string) {
  if (/本地部署|开源模型|编程|代码|开发|自动化|coding|deploy|workflow|automation/i.test(text)) return "productivity";
  if (/绘图|图像|视频|音乐|创作|配音|image|video|music|creative/i.test(text)) return "content-creation";
  if (/学习|教程|入门|课程|tutorial|learn|course/i.test(text)) return "ai-learning";
  if (/资讯|发布|趋势|新闻|release|news|trend/i.test(text)) return "ai-news";
  return category === "workflow" ? "productivity" : category === "showcase" ? "content-creation" : category === "question" ? "ai-learning" : "ai-news";
}

function TopicCover({ post, locale }: { post: ForumPosts[number]; locale: Locale }) {
  const image = post.coverAttachmentId
    ? post.attachments?.find((attachment) => attachment.id === post.coverAttachmentId && attachment.kind === "image")
    : undefined;
  const categoryLabel = getForumCategoryLabel(post.category, locale);
  const theme = topicArtwork(`${post.title} ${post.content.slice(0, 200)}`, post.category);
  return <Link className={`forum-topic-card__cover${image ? "" : " forum-topic-cover--generated"}`} href={pageHref(locale, `/forum/${post.id}`)} aria-label={`${locale === "en" ? "Open topic" : "查看话题"}: ${post.title}`}>
    {image
      ? <Image src={`/api/forum/media/${encodeURIComponent(image.id)}`} alt={post.title} width={720} height={405} unoptimized />
      : <span className="forum-topic-cover__art" style={{ backgroundImage: `linear-gradient(0deg, rgba(7,17,42,.93), rgba(7,17,42,.15)), url("/images/home/flowing-menu/${theme}.webp")` }}>
          <span className="forum-topic-cover__category">{categoryLabel}</span>
          <span className="forum-topic-cover__title"><EmojiText text={post.title} /></span>
        </span>}
  </Link>;
}

function uninsertedAttachments(content: string, attachments: ForumPostView["attachments"]) {
  const inserted = new Set(Array.from(content.matchAll(/\[\[media[:=]([a-zA-Z0-9_-]{1,100})\]\]/gu), (match) => match[1]));
  return attachments.filter((attachment) => !inserted.has(attachment.id));
}

export function ForumIndexContent({ locale, posts, selectedCategory, isAuthenticated, isAdmin = false, postDeleted = false }: { locale: Locale; posts: ForumPosts; selectedCategory?: ForumCategory; isAuthenticated: boolean; isAdmin?: boolean; postDeleted?: boolean }) {
  const t = copy(locale);
  return (
    <main className="forum-page">
      <div className="forum-cover">
        <Image
          src="/images/forum-cover-logo4.png"
          alt={t.coverAlt}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 1120px"
          className="forum-cover-image"
        />
      </div>
      <section className="forum-heading">
        <div><p className="forum-eyebrow">ENHE AI COMMUNITY</p><h1 className="redesign-bold-copy">{t.title}</h1><p>{t.intro}</p></div>
        <Link className="forum-primary-button" href={pageHref(locale, "/forum/new")}>{t.newPost}</Link>
      </section>
      <nav className="forum-categories" aria-label={t.categoryLabel}>
        <Link className={!selectedCategory ? "is-active" : ""} href={pageHref(locale, "/forum")}>{t.all}</Link>
        {categories.map((category) => <Link className={selectedCategory === category ? "is-active" : ""} key={category} href={`${pageHref(locale, "/forum")}?category=${category}`}>{getForumCategoryLabel(category, locale)}</Link>)}
      </nav>
      {postDeleted && isAuthenticated && isAdmin ? <p className="forum-success-notice" role="status">{t.postDeleted}</p> : null}
      {posts.length ? <div className="forum-post-list">{posts.map((post) => (
        <article className="forum-post-card forum-topic-card" key={post.id}>
          <TopicCover post={post} locale={locale} />
          <OriginalPostNote locale={locale} post={post} />
          <h2><Link href={pageHref(locale, `/forum/${post.id}`)}><EmojiText text={post.title} /></Link></h2>
          <div className="forum-post-header"><div className="forum-author-line"><UserAvatar src={post.author.avatar} alt={post.author.displayName} size={32} className="forum-avatar" /><span><EmojiText text={post.author.displayName} /></span><time dateTime={post.createdAt.toISOString()}>{dateLabel(post.createdAt, locale)}</time></div><span className="forum-category-tag">{getForumCategoryLabel(post.category, locale)}</span></div>
          <div className="forum-post-meta forum-topic-meta"><ForumPostActions locale={locale} postId={post.id} title={post.title} replyCount={post._count.replies} shareCount={post._count.shares} likeCount={post._count.likes} isLiked={post.isLiked} isBookmarked={post.isBookmarked} isAuthenticated={isAuthenticated} replyHref={`${pageHref(locale, `/forum/${post.id}`)}#replies`} />{isAuthenticated && isAdmin ? <><ForumDeletePostButton locale={locale} postId={post.id} /><Link className="forum-primary-button forum-topic-edit" href={"/admin/forum/" + encodeURIComponent(post.id) + "/edit"}>{locale === "en" ? "Edit topic" : "编辑话题"}</Link></> : null}</div>
        </article>
      ))}</div> : <p className="forum-empty-state">{t.empty}</p>}
      {!isAuthenticated ? <div className="forum-join-callout"><JoinLink locale={locale} /></div> : null}
    </main>
  );
}

function ReplyForm({ locale, postId, parentId, label }: { locale: Locale; postId: string; parentId?: string; label?: string }) {
  const t = copy(locale);
  return (
    <details className="forum-reply-form">
      <summary className="forum-primary-button">{label ?? t.reply}</summary>
      <form action={createForumReplyAction}>
        <input type="hidden" name="postId" value={postId} />
        {parentId ? <input type="hidden" name="parentId" value={parentId} /> : null}
        <RichTextEditor name="content" locale={locale} ariaLabel={t.replyPlaceholder} emojiPicker required minLength={2} maxLength={2000} placeholder={t.replyPlaceholder} />
        <ForumMediaEditor locale={locale} allowVideo={false} />
        <button type="submit">{t.sendReply}</button>
      </form>
    </details>
  );
}

function ReplyBranch({ locale, postId, replies, isAuthenticated, currentUserId, isAdmin }: { locale: Locale; postId: string; replies: ForumPostView["replies"]; isAuthenticated: boolean; currentUserId?: string; isAdmin: boolean }) {
  const t = copy(locale);
  return <div className="forum-reply-tree">{replies.map((reply) => (
    <article className={`forum-reply-card${reply.content.trim() ? "" : " forum-reply-deleted"}`} key={reply.id}>
      <div className="forum-author-line"><UserAvatar src={reply.author.avatar} alt={reply.author.displayName} size={34} className="forum-avatar" /><span><EmojiText text={reply.author.displayName} /></span><time dateTime={reply.createdAt.toISOString()}>{dateLabel(reply.createdAt, locale)}</time></div>
      <div className="forum-reply-content">{reply.content.trim() ? <RichTextContent content={reply.content} attachments={reply.attachments ?? []} locale={locale} /> : t.replyDeleted}</div>
      {reply.content.trim() ? <>
        <ForumMediaDisplay locale={locale} attachments={uninsertedAttachments(reply.content, reply.attachments ?? [])} />
        <div className="forum-post-meta"><ForumLikeButton locale={locale} replyId={reply.id} count={reply._count.likes} isLiked={reply.isLiked} isAuthenticated={isAuthenticated} returnTo={`/forum/${postId}`} />{isAuthenticated ? <ReplyForm locale={locale} postId={postId} parentId={reply.id} /> : null}{isAuthenticated && (isAdmin || reply.author.id === currentUserId) ? <HoldDeleteForm action={deleteForumReplyAction} locale={locale} label={t.deleteReply} data-delete-kind="forum-reply"><input type="hidden" name="replyId" value={reply.id} /></HoldDeleteForm> : null}</div>
      </> : null}
      {reply.children.length ? <ReplyBranch locale={locale} postId={postId} replies={reply.children} isAuthenticated={isAuthenticated} currentUserId={currentUserId} isAdmin={isAdmin} /> : null}
    </article>
  ))}</div>;
}

export function ForumPostContent({ locale, post, isAuthenticated, currentUserId, isAdmin = false, replySubmitted }: { locale: Locale; post: ForumPostView; isAuthenticated: boolean; currentUserId?: string; isAdmin?: boolean; replySubmitted: boolean }) {
  const t = copy(locale);
  return (
    <main className="forum-page">
      <Link className="forum-back-link" href={pageHref(locale, "/forum")}><span aria-hidden="true">◀</span> {t.back}</Link>
      {replySubmitted ? <p className="forum-success-notice">{t.replyPublished}</p> : null}
      <article className="forum-post-card forum-post-detail">
        <div className="forum-post-header"><div className="forum-author-line"><UserAvatar src={post.author.avatar} alt={post.author.displayName} size={44} className="forum-avatar" /><span><EmojiText text={post.author.displayName} /></span><time dateTime={post.createdAt.toISOString()}>{dateLabel(post.createdAt, locale)}</time></div><span className="forum-category-tag">{getForumCategoryLabel(post.category, locale)}</span></div>
        <OriginalPostNote locale={locale} post={post} />
        <h1><EmojiText text={post.title} /></h1><RichTextContent className="forum-detail-content rich-text-content" content={post.content} attachments={post.attachments ?? []} locale={locale} />
        <ForumMediaDisplay locale={locale} attachments={uninsertedAttachments(post.content, post.attachments ?? [])} />
        <div className="forum-post-meta forum-topic-meta"><ForumPostActions locale={locale} postId={post.id} title={post.title} replyCount={post.replyCount} shareCount={post._count.shares} likeCount={post._count.likes} isLiked={post.isLiked} isBookmarked={post.isBookmarked} isAuthenticated={isAuthenticated} replyHref="#replies" />{isAuthenticated && isAdmin ? <ForumDeletePostButton locale={locale} postId={post.id} /> : null}</div>
      </article>
      <section className="forum-replies" id="replies">
        <div className="forum-section-heading">{isAuthenticated ? <ReplyForm locale={locale} postId={post.id} label={t.comment} /> : <JoinLink locale={locale} />}</div>
        {post.replies.length ? <ReplyBranch locale={locale} postId={post.id} replies={post.replies} isAuthenticated={isAuthenticated} currentUserId={currentUserId} isAdmin={isAdmin} /> : <p className="forum-empty-state">{locale === "en" ? "No replies yet." : "还没有回复。"}</p>}
      </section>
    </main>
  );
}

export function ForumNewPostContent({ locale, submitted, isAuthenticated }: { locale: Locale; submitted: boolean; isAuthenticated: boolean }) {
  const t = copy(locale);
  return (
    <main className="forum-page forum-new-page">
      <Link className="forum-back-link" href={pageHref(locale, "/forum")}><span aria-hidden="true">◀</span> {t.back}</Link>
      <section className="forum-form-card">
        <h1>{t.newPost}</h1>
        <p>{t.submitHint}</p>
        {submitted ? <p className="forum-success-notice">{t.published}</p> : null}
        {isAuthenticated ? <form action={createForumPostAction}>
          <label><span>{t.categoryLabel}</span><span className="forum-form-select-control"><select name="category" required defaultValue="question">{categories.map((category) => <option key={category} value={category}>{getForumCategoryLabel(category, locale)}</option>)}</select></span></label>
          <label><span>{t.titleLabel}</span><input name="title" required minLength={2} maxLength={120} placeholder={t.titlePlaceholder} /></label>
          <label htmlFor="forum-post-content">{t.contentLabel}</label>
          <RichTextEditor id="forum-post-content" ariaLabel={t.contentLabel} name="content" locale={locale} required minLength={2} maxLength={5000} placeholder={t.contentPlaceholder} />
          <ForumMediaEditor locale={locale} allowVideo allowCover />
          <button className="forum-primary-button" type="submit">{t.submit}</button>
        </form> : <JoinLink locale={locale} returnTo="/forum/new" />}
      </section>
    </main>
  );
}
