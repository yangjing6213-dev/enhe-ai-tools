import Link from "next/link";
import Image from "next/image";
import { UserAvatar } from "@/components/user-avatar";
import { getForumCategoryLabel, type ForumCategory } from "@/lib/forum-rules";
import type { Locale } from "@/lib/i18n";
import { buildLocalePath } from "@/lib/seo";
import { getForumPost } from "@/lib/forum-data";
import { createForumPostAction, createForumReplyAction } from "@/app/forum/actions";
import { ForumLikeButton } from "@/components/forum/forum-like-button";
import { ForumMediaEditor } from "@/components/forum/forum-media-editor";
import { ForumMediaDisplay } from "@/components/forum/forum-media-display";
import { EmojiText } from "@/components/emoji-text";

type ForumPosts = Awaited<ReturnType<typeof import("@/lib/forum-data").getForumPosts>>;
type ForumPostView = NonNullable<Awaited<ReturnType<typeof getForumPost>>>;

const categories: ForumCategory[] = ["question", "experience", "workflow", "showcase"];

function copy(locale: Locale) {
  return locale === "en" ? {
    title: "AI Community Forum",
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
    reply: "Reply",
    replyPlaceholder: "Write a helpful reply",
    sendReply: "Publish reply",
    back: "Back to discussions",
  } : {
    title: "共创AI论坛",
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
    reply: "回复",
    replyPlaceholder: "写下你的回复",
    sendReply: "发布回复",
    back: "返回话题列表",
  };
}

function pageHref(locale: Locale, path: string) {
  return buildLocalePath(path, locale);
}

function dateLabel(date: Date, locale: Locale) {
  return date.toLocaleDateString(locale === "en" ? "en-US" : "zh-CN", { year: "numeric", month: "short", day: "numeric" });
}

function JoinLink({ locale, returnTo = "/forum" }: { locale: Locale; returnTo?: string }) {
  const t = copy(locale);
  return <Link className="forum-login-link" href={`${pageHref(locale, "/login")}?returnTo=${encodeURIComponent(pageHref(locale, returnTo))}`}>{t.signIn}</Link>;
}

export function ForumIndexContent({ locale, posts, selectedCategory, isAuthenticated }: { locale: Locale; posts: ForumPosts; selectedCategory?: ForumCategory; isAuthenticated: boolean }) {
  const t = copy(locale);
  return (
    <main className="forum-page">
      <div className="forum-cover">
        <Image
          src="/images/forum-cover.png"
          alt={t.coverAlt}
          width={1448}
          height={620}
          priority
          sizes="(max-width: 768px) 100vw, 1120px"
          className="forum-cover-image"
        />
      </div>
      <section className="forum-heading">
        <div><p className="forum-eyebrow">ENHE AI COMMUNITY</p><h1>{t.title}</h1><p>{t.intro}</p></div>
        <Link className="forum-primary-button" href={pageHref(locale, "/forum/new")}>{t.newPost}</Link>
      </section>
      <nav className="forum-categories" aria-label={t.categoryLabel}>
        <Link className={!selectedCategory ? "is-active" : ""} href={pageHref(locale, "/forum")}>{t.all}</Link>
        {categories.map((category) => <Link className={selectedCategory === category ? "is-active" : ""} key={category} href={`${pageHref(locale, "/forum")}?category=${category}`}>{getForumCategoryLabel(category, locale)}</Link>)}
      </nav>
      {posts.length ? <div className="forum-post-list">{posts.map((post) => (
        <article className="forum-post-card" key={post.id}>
          <div className="forum-post-header"><div className="forum-author-line"><UserAvatar src={post.author.avatar} alt={post.author.displayName} size={40} className="forum-avatar" /><span><EmojiText text={post.author.displayName} /></span><time dateTime={post.createdAt.toISOString()}>{dateLabel(post.createdAt, locale)}</time></div><span className="forum-category-tag">{getForumCategoryLabel(post.category, locale)}</span></div>
          <h2><Link href={pageHref(locale, `/forum/${post.id}`)}><EmojiText text={post.title} /></Link></h2>
          <p className="forum-post-excerpt"><EmojiText text={post.content} /></p>
          <ForumMediaDisplay locale={locale} attachments={post.attachments ?? []} />
          <div className="forum-post-meta"><ForumLikeButton locale={locale} postId={post.id} count={post._count.likes} isLiked={post.isLiked} isAuthenticated={isAuthenticated} returnTo={`/forum/${post.id}`} /><Link href={pageHref(locale, `/forum/${post.id}`)}>{post._count.replies} {t.replies}</Link></div>
        </article>
      ))}</div> : <p className="forum-empty-state">{t.empty}</p>}
      {!isAuthenticated ? <div className="forum-join-callout"><JoinLink locale={locale} /></div> : null}
    </main>
  );
}

function ReplyForm({ locale, postId, parentId }: { locale: Locale; postId: string; parentId?: string }) {
  const t = copy(locale);
  return (
    <details className="forum-reply-form">
      <summary className="forum-primary-button">{t.reply}</summary>
      <form action={createForumReplyAction}>
        <input type="hidden" name="postId" value={postId} />
        {parentId ? <input type="hidden" name="parentId" value={parentId} /> : null}
        <textarea name="content" required minLength={2} maxLength={2000} placeholder={t.replyPlaceholder} />
        <ForumMediaEditor locale={locale} allowVideo={false} />
        <button type="submit">{t.sendReply}</button>
      </form>
    </details>
  );
}

function ReplyBranch({ locale, postId, replies, isAuthenticated }: { locale: Locale; postId: string; replies: ForumPostView["replies"]; isAuthenticated: boolean }) {
  const t = copy(locale);
  return <div className="forum-reply-tree">{replies.map((reply) => (
    <article className="forum-reply-card" key={reply.id}>
      <div className="forum-author-line"><UserAvatar src={reply.author.avatar} alt={reply.author.displayName} size={34} className="forum-avatar" /><span><EmojiText text={reply.author.displayName} /></span><time dateTime={reply.createdAt.toISOString()}>{dateLabel(reply.createdAt, locale)}</time></div>
      <p className="forum-reply-content"><EmojiText text={reply.content} /></p>
      <ForumMediaDisplay locale={locale} attachments={reply.attachments ?? []} />
      <div className="forum-post-meta"><ForumLikeButton locale={locale} replyId={reply.id} count={reply._count.likes} isLiked={reply.isLiked} isAuthenticated={isAuthenticated} returnTo={`/forum/${postId}`} />{isAuthenticated ? <ReplyForm locale={locale} postId={postId} parentId={reply.id} /> : null}</div>
      {reply.children.length ? <ReplyBranch locale={locale} postId={postId} replies={reply.children} isAuthenticated={isAuthenticated} /> : null}
    </article>
  ))}</div>;
}

export function ForumPostContent({ locale, post, isAuthenticated, replySubmitted }: { locale: Locale; post: ForumPostView; isAuthenticated: boolean; replySubmitted: boolean }) {
  const t = copy(locale);
  return (
    <main className="forum-page">
      <Link className="forum-back-link" href={pageHref(locale, "/forum")}><span aria-hidden="true">◀</span> {t.back}</Link>
      {replySubmitted ? <p className="forum-success-notice">{t.replyPublished}</p> : null}
      <article className="forum-post-card forum-post-detail">
        <div className="forum-post-header"><div className="forum-author-line"><UserAvatar src={post.author.avatar} alt={post.author.displayName} size={44} className="forum-avatar" /><span><EmojiText text={post.author.displayName} /></span><time dateTime={post.createdAt.toISOString()}>{dateLabel(post.createdAt, locale)}</time></div><span className="forum-category-tag">{getForumCategoryLabel(post.category, locale)}</span></div>
        <h1><EmojiText text={post.title} /></h1><p className="forum-detail-content"><EmojiText text={post.content} /></p>
        <ForumMediaDisplay locale={locale} attachments={post.attachments ?? []} />
        <div className="forum-post-meta"><ForumLikeButton locale={locale} postId={post.id} count={post._count.likes} isLiked={post.isLiked} isAuthenticated={isAuthenticated} returnTo={`/forum/${post.id}`} /><a href="#replies">{post.replyCount} {t.replies}</a></div>
      </article>
      <section className="forum-replies" id="replies">
        <div className="forum-section-heading">{isAuthenticated ? <ReplyForm locale={locale} postId={post.id} /> : <JoinLink locale={locale} />}</div>
        {post.replies.length ? <ReplyBranch locale={locale} postId={post.id} replies={post.replies} isAuthenticated={isAuthenticated} /> : <p className="forum-empty-state">{locale === "en" ? "No replies yet." : "还没有回复。"}</p>}
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
          <label><span>{t.categoryLabel}</span><select name="category" required defaultValue="question">{categories.map((category) => <option key={category} value={category}>{getForumCategoryLabel(category, locale)}</option>)}</select></label>
          <label><span>{t.titleLabel}</span><input name="title" required minLength={2} maxLength={120} placeholder={t.titlePlaceholder} /></label>
          <label><span>{t.contentLabel}</span><textarea name="content" required minLength={2} maxLength={5000} placeholder={t.contentPlaceholder} /></label>
          <ForumMediaEditor locale={locale} allowVideo />
          <button className="forum-primary-button" type="submit">{t.submit}</button>
        </form> : <JoinLink locale={locale} returnTo="/forum/new" />}
      </section>
    </main>
  );
}
