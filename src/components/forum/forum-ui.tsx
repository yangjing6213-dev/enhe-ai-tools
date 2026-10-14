import Link from "next/link";
import { UserAvatar } from "@/components/user-avatar";
import { getForumCategoryLabel, type ForumCategory } from "@/lib/forum-rules";
import type { Locale } from "@/lib/i18n";
import { buildLocalePath } from "@/lib/seo";
import { getForumPost } from "@/lib/forum-data";
import { createForumPostAction, createForumReplyAction, reportForumContentAction, toggleForumLikeAction } from "@/app/forum/actions";

type ForumPosts = Awaited<ReturnType<typeof import("@/lib/forum-data").getForumPosts>>;
type ForumPostView = NonNullable<Awaited<ReturnType<typeof getForumPost>>>;

const categories: ForumCategory[] = ["question", "experience", "workflow", "showcase"];

function copy(locale: Locale) {
  return locale === "en" ? {
    title: "Co-create AI",
    intro: "Ask questions, share useful workflows, and learn from the ENHE AI community.",
    newPost: "Start a discussion",
    all: "All topics",
    empty: "No discussions here yet. Start the first one.",
    signIn: "Sign in to join the discussion",
    like: "Like",
    replies: "replies",
    report: "Report",
    reportReason: "Tell us why this needs review",
    sendReport: "Submit report",
    submitHint: "Your discussion will appear after an administrator reviews it.",
    submit: "Submit for review",
    titleLabel: "Title",
    contentLabel: "Details",
    categoryLabel: "Topic",
    contentPlaceholder: "Share enough context for others to help.",
    titlePlaceholder: "What would you like to discuss?",
    pending: "Thanks. Your post is waiting for review.",
    replyPending: "Thanks. Your reply is waiting for review.",
    reportSent: "Thanks. The report has been sent to the administrators.",
    reply: "Reply",
    replyPlaceholder: "Write a helpful reply",
    sendReply: "Send for review",
    back: "Back to discussions",
  } : {
    title: "共创 AI",
    intro: "在这里提问、分享实用工作流，与 ENHE AI 用户一起交流。",
    newPost: "发布新话题",
    all: "全部话题",
    empty: "这里还没有话题，来发布第一条吧。",
    signIn: "登录后参与交流",
    like: "喜欢",
    replies: "条回复",
    report: "举报",
    reportReason: "请简单说明举报原因",
    sendReport: "提交举报",
    submitHint: "话题通过管理员审核后会公开显示。",
    submit: "提交审核",
    titleLabel: "标题",
    contentLabel: "内容",
    categoryLabel: "话题分类",
    contentPlaceholder: "补充背景和细节，方便大家理解并回复。",
    titlePlaceholder: "你想讨论什么？",
    pending: "已收到，话题正在等待管理员审核。",
    replyPending: "已收到，回复正在等待管理员审核。",
    reportSent: "已提交举报，管理员会进行处理。",
    reply: "回复",
    replyPlaceholder: "写下你的回复",
    sendReply: "提交审核",
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

function LikeControl({ locale, postId, replyId, count, isAuthenticated }: { locale: Locale; postId?: string; replyId?: string; count: number; isAuthenticated: boolean }) {
  const t = copy(locale);
  return isAuthenticated ? (
    <form action={toggleForumLikeAction} className="forum-inline-form">
      {postId ? <input type="hidden" name="postId" value={postId} /> : null}
      {replyId ? <input type="hidden" name="replyId" value={replyId} /> : null}
      <button className="forum-quiet-button" type="submit" aria-label={`${t.like}: ${count}`}>♡ {t.like} <span>{count}</span></button>
    </form>
  ) : <span className="forum-count">♡ {count}</span>;
}

function ReportControl({ locale, postId, replyId, isAuthenticated }: { locale: Locale; postId?: string; replyId?: string; isAuthenticated: boolean }) {
  const t = copy(locale);
  if (!isAuthenticated) return null;
  return (
    <details className="forum-report">
      <summary>{t.report}</summary>
      <form action={reportForumContentAction}>
        {postId ? <input type="hidden" name="postId" value={postId} /> : null}
        {replyId ? <input type="hidden" name="replyId" value={replyId} /> : null}
        <label>
          <span className="sr-only">{t.reportReason}</span>
          <input name="reason" minLength={2} maxLength={250} required placeholder={t.reportReason} />
        </label>
        <button type="submit">{t.sendReport}</button>
      </form>
    </details>
  );
}

export function ForumIndexContent({ locale, posts, selectedCategory, isAuthenticated }: { locale: Locale; posts: ForumPosts; selectedCategory?: ForumCategory; isAuthenticated: boolean }) {
  const t = copy(locale);
  return (
    <main className="forum-page">
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
          <div className="forum-author-line"><UserAvatar src={post.author.avatar} alt={post.author.displayName} size={40} className="forum-avatar" /><span>{post.author.displayName}</span><time dateTime={post.createdAt.toISOString()}>{dateLabel(post.createdAt, locale)}</time></div>
          <span className="forum-category-tag">{getForumCategoryLabel(post.category, locale)}</span>
          <h2><Link href={pageHref(locale, `/forum/${post.id}`)}>{post.title}</Link></h2>
          <p className="forum-post-excerpt">{post.content}</p>
          <div className="forum-post-meta"><LikeControl locale={locale} postId={post.id} count={post._count.likes} isAuthenticated={isAuthenticated} /><Link href={pageHref(locale, `/forum/${post.id}`)}>{post._count.replies} {t.replies}</Link><ReportControl locale={locale} postId={post.id} isAuthenticated={isAuthenticated} /></div>
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
      <summary>{t.reply}</summary>
      <form action={createForumReplyAction}>
        <input type="hidden" name="postId" value={postId} />
        {parentId ? <input type="hidden" name="parentId" value={parentId} /> : null}
        <textarea name="content" required minLength={2} maxLength={2000} placeholder={t.replyPlaceholder} />
        <button type="submit">{t.sendReply}</button>
      </form>
    </details>
  );
}

function ReplyBranch({ locale, postId, replies, isAuthenticated }: { locale: Locale; postId: string; replies: ForumPostView["replies"]; isAuthenticated: boolean }) {
  const t = copy(locale);
  return <div className="forum-reply-tree">{replies.map((reply) => (
    <article className="forum-reply-card" key={reply.id}>
      <div className="forum-author-line"><UserAvatar src={reply.author.avatar} alt={reply.author.displayName} size={34} className="forum-avatar" /><span>{reply.author.displayName}</span><time dateTime={reply.createdAt.toISOString()}>{dateLabel(reply.createdAt, locale)}</time></div>
      <p className="forum-reply-content">{reply.content}</p>
      <div className="forum-post-meta"><LikeControl locale={locale} replyId={reply.id} count={reply._count.likes} isAuthenticated={isAuthenticated} />{isAuthenticated ? <ReplyForm locale={locale} postId={postId} parentId={reply.id} /> : null}<ReportControl locale={locale} replyId={reply.id} isAuthenticated={isAuthenticated} /></div>
      {reply.children.length ? <ReplyBranch locale={locale} postId={postId} replies={reply.children} isAuthenticated={isAuthenticated} /> : null}
    </article>
  ))}</div>;
}

export function ForumPostContent({ locale, post, isAuthenticated, replySubmitted, reported }: { locale: Locale; post: ForumPostView; isAuthenticated: boolean; replySubmitted: boolean; reported: boolean }) {
  const t = copy(locale);
  return (
    <main className="forum-page">
      <Link className="forum-back-link" href={pageHref(locale, "/forum")}>← {t.back}</Link>
      {replySubmitted ? <p className="forum-success-notice">{t.replyPending}</p> : null}
      {reported ? <p className="forum-success-notice">{t.reportSent}</p> : null}
      <article className="forum-post-card forum-post-detail">
        <div className="forum-author-line"><UserAvatar src={post.author.avatar} alt={post.author.displayName} size={44} className="forum-avatar" /><span>{post.author.displayName}</span><time dateTime={post.createdAt.toISOString()}>{dateLabel(post.createdAt, locale)}</time><span className="forum-category-tag">{getForumCategoryLabel(post.category, locale)}</span></div>
        <h1>{post.title}</h1><p className="forum-detail-content">{post.content}</p>
        <div className="forum-post-meta"><LikeControl locale={locale} postId={post.id} count={post._count.likes} isAuthenticated={isAuthenticated} /><ReportControl locale={locale} postId={post.id} isAuthenticated={isAuthenticated} /></div>
      </article>
      <section className="forum-replies" id="replies">
        <div className="forum-section-heading"><h2>{t.replies}</h2>{isAuthenticated ? <ReplyForm locale={locale} postId={post.id} /> : <JoinLink locale={locale} />}</div>
        {post.replies.length ? <ReplyBranch locale={locale} postId={post.id} replies={post.replies} isAuthenticated={isAuthenticated} /> : <p className="forum-empty-state">{locale === "en" ? "No replies yet." : "还没有回复。"}</p>}
      </section>
    </main>
  );
}

export function ForumNewPostContent({ locale, submitted, isAuthenticated }: { locale: Locale; submitted: boolean; isAuthenticated: boolean }) {
  const t = copy(locale);
  return (
    <main className="forum-page forum-new-page">
      <Link className="forum-back-link" href={pageHref(locale, "/forum")}>← {t.back}</Link>
      <section className="forum-form-card">
        <h1>{t.newPost}</h1>
        <p>{t.submitHint}</p>
        {submitted ? <p className="forum-success-notice">{t.pending}</p> : null}
        {isAuthenticated ? <form action={createForumPostAction}>
          <label><span>{t.categoryLabel}</span><select name="category" required defaultValue="question">{categories.map((category) => <option key={category} value={category}>{getForumCategoryLabel(category, locale)}</option>)}</select></label>
          <label><span>{t.titleLabel}</span><input name="title" required minLength={2} maxLength={120} placeholder={t.titlePlaceholder} /></label>
          <label><span>{t.contentLabel}</span><textarea name="content" required minLength={2} maxLength={5000} placeholder={t.contentPlaceholder} /></label>
          <button className="forum-primary-button" type="submit">{t.submit}</button>
        </form> : <JoinLink locale={locale} returnTo="/forum/new" />}
      </section>
    </main>
  );
}
