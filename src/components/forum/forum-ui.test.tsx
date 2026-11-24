import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ForumIndexContent, ForumNewPostContent, ForumPostContent } from "./forum-ui";

Object.assign(globalThis, { React });
vi.mock("@/app/forum/actions", () => ({ createForumPostAction: vi.fn(), createForumReplyAction: vi.fn(), deleteForumPostAction: vi.fn(), deleteForumReplyAction: vi.fn(), toggleForumLikeAction: vi.fn(), setForumBookmarkAction: vi.fn(), recordForumShareAction: vi.fn() }));

const author = { id: "author", displayName: "用户 :enhe_01:", nickname: "用户", avatar: "/images/default-avatars/avatar-01.webp" };
const reply = { id: "reply-1", postId: "post-1", parentId: null, authorId: "author", status: "approved", author, createdAt: new Date("2026-10-14T00:00:00Z"), updatedAt: new Date("2026-10-14T00:00:00Z"), content: "回复正文", attachments: [], isLiked: false, _count: { likes: 0 }, children: [] };
const post = {
  id: "post-1", author, createdAt: new Date("2026-10-14T00:00:00Z"), category: "workflow", title: "测试话题", content: "话题正文 :enhe_01:",
  coverAttachmentId: "image-1",
  attachments: [{ id: "image-1", kind: "image", mimeType: "image/webp", originalName: "image.webp" }], isLiked: true, isBookmarked: true,
  _count: { likes: 1, replies: 2, shares: 3, bookmarks: 1 }, replyCount: 2, replies: [{ ...reply, children: [{ ...reply, id: "reply-2", children: [] }] }],
} as unknown as Parameters<typeof ForumPostContent>[0]["post"];

describe("forum public surfaces", () => {
  it("enables stickers only in topic comments and nested replies, not topic creation", () => {
    for (const locale of ["zh", "en"] as const) {
      const detail = renderToStaticMarkup(<ForumPostContent locale={locale} post={post} isAuthenticated replySubmitted={false} />);
      const replyFields = detail.match(/<textarea[^>]*>/g) ?? [];
      expect(replyFields).toHaveLength(3);
      expect(replyFields.every(field => field.includes('data-emoji-picker="on"'))).toBe(true);
      const newPost = renderToStaticMarkup(<ForumNewPostContent locale={locale} isAuthenticated submitted={false} />);
      expect(newPost).not.toContain('data-emoji-picker="on"');
    }
  });
  it("offers topic deletion on both surfaces only to signed-in administrators", () => {
    const listPosts = [post] as unknown as Parameters<typeof ForumIndexContent>[0]["posts"];
    const adminList = renderToStaticMarkup(<ForumIndexContent locale="zh" posts={listPosts} isAuthenticated isAdmin />);
    const adminDetail = renderToStaticMarkup(<ForumPostContent locale="zh" post={post} isAuthenticated isAdmin replySubmitted={false} />);
    for (const html of [adminList, adminDetail]) {
      expect(html).toContain("删除话题");
      expect(html).toContain('name="postId" value="post-1"');
    }
    for (const [isAuthenticated, isAdmin] of [[true, false], [false, false], [false, true]]) {
      const list = renderToStaticMarkup(<ForumIndexContent locale="zh" posts={listPosts} isAuthenticated={isAuthenticated} isAdmin={isAdmin} />);
      const detail = renderToStaticMarkup(<ForumPostContent locale="zh" post={post} isAuthenticated={isAuthenticated} currentUserId="author" isAdmin={isAdmin} replySubmitted={false} />);
      expect(list).not.toContain("删除话题");
      expect(detail).not.toContain("删除话题");
    }
  });

  it("shows localized deletion feedback on the topic list", () => {
    const chinese = renderToStaticMarkup(<ForumIndexContent locale="zh" posts={[]} isAuthenticated isAdmin postDeleted />);
    expect(chinese).toContain("话题已删除，话题及回复不再公开显示。");
    const english = renderToStaticMarkup(<ForumIndexContent locale="en" posts={[]} isAuthenticated isAdmin postDeleted />);
    expect(english).toContain("Topic deleted. The topic and its replies are no longer public.");
  });

  it("shows the chosen topic cover without rendering post media in the list", () => {
    const html = renderToStaticMarkup(<ForumIndexContent locale="zh" posts={[post] as unknown as Parameters<typeof ForumIndexContent>[0]["posts"]} isAuthenticated />);
    expect(html).toContain("forum-cover-logo4.png");
    expect(html).toContain('data-nimg="fill"');
    expect(html).toContain('class="forum-topic-card__cover"');
    expect(html).toContain('/api/forum/media/image-1');
    expect(html).not.toContain('class="forum-media-display"');
    expect(html).toContain('class="forum-post-header"');
    expect(html).toContain('class="forum-category-tag"');
    expect(html).not.toContain("举报");
    expect(html).toContain('class="enhe-inline-emoji"');
  });

  it("uses a generated topic cover instead of leaking body images into the list", () => {
    const bodyImageOnlyPost = { ...post, coverAttachmentId: null } as typeof post;
    const html = renderToStaticMarkup(<ForumIndexContent locale="zh" posts={[bodyImageOnlyPost] as unknown as Parameters<typeof ForumIndexContent>[0]["posts"]} isAuthenticated />);

    expect(html).toContain("forum-topic-cover--generated");
    expect(html).toContain("/images/home/flowing-menu/productivity.webp");
    expect(html).toContain("测试话题");
    expect(html).not.toContain("/api/forum/media/image-1");
    expect(html).not.toContain("class=\"forum-media-display");
  });

  it("selects generated artwork from the topic body even within the same category", () => {
    const posts = [{ ...post, title: "My experiment", content: "A short video generated from still images.", coverAttachmentId: null }] as unknown as Parameters<typeof ForumIndexContent>[0]["posts"];
    expect(renderToStaticMarkup(<ForumIndexContent locale="en" posts={posts} isAuthenticated />)).toContain("/images/home/flowing-menu/content-creation.webp");
  });

  it("orders icon actions consistently and keeps topic deletion after them", () => {
    const listPosts = [post] as unknown as Parameters<typeof ForumIndexContent>[0]["posts"];
    const list = renderToStaticMarkup(<ForumIndexContent locale="zh" posts={listPosts} isAuthenticated isAdmin />);
    const detail = renderToStaticMarkup(<ForumPostContent locale="zh" post={post} isAuthenticated isAdmin replySubmitted={false} />);
    for (const html of [list, detail]) {
      const replyIndex = html.indexOf('data-forum-action="reply"');
      const shareIndex = html.indexOf('data-forum-action="share"');
      const likeIndex = html.indexOf('data-forum-action="like"');
      const bookmarkIndex = html.indexOf('data-forum-action="bookmark"');
      expect(replyIndex).toBeGreaterThan(-1);
      expect(shareIndex).toBeGreaterThan(replyIndex);
      expect(likeIndex).toBeGreaterThan(shareIndex);
      expect(bookmarkIndex).toBeGreaterThan(likeIndex);
      expect(html.indexOf('data-delete-kind="forum-post"')).toBeGreaterThan(bookmarkIndex);
      expect(html).toContain('aria-label="转发：3"');
      expect(html).toContain('aria-label="取消收藏"');
      expect(html).toContain('class="forum-topic-delete"');
      expect(html).toContain('hold-button--md forum-delete-post');
    }
    const deleteIndex = list.indexOf('data-delete-kind="forum-post"');
    const editIndex = list.indexOf('href="/admin/forum/post-1/edit"');
    expect(editIndex).toBeGreaterThan(deleteIndex);
    expect(list).toContain('class="forum-primary-button forum-topic-edit"');
    expect(list).toContain('--hb-bg:#0462c2');
    expect(list).toContain('href="/forum/post-1#replies"');
    expect(detail).toContain('href="#replies"');
  });

  it("keeps account actions behind sign-in with the localized return path", () => {
    const html = renderToStaticMarkup(<ForumIndexContent locale="en" posts={[post] as unknown as Parameters<typeof ForumIndexContent>[0]["posts"]} isAuthenticated={false} />);
    expect(html).toContain('/en/login?returnTo=%2Fen%2Fforum%2Fpost-1');
    expect(html).toContain('aria-label="Sign in to like: 1"');
    expect(html).toContain('aria-label="Sign in to bookmark"');
    expect(html).toContain('aria-label="Share: 3"');
  });

  it("places the full nested reply count with post actions and preserves the reply controls", () => {
    const html = renderToStaticMarkup(<ForumPostContent locale="zh" post={post} isAuthenticated currentUserId="author" replySubmitted={false} />);
    expect(html).toContain('aria-label="回复：2"');
    expect(html).toContain('aria-pressed="true"');
    const replyFormLabels = Array.from(
      html.matchAll(/<summary class="forum-primary-button">([^<]+)<\/summary>/g),
      (match) => match[1],
    );
    expect(replyFormLabels).toEqual(["评论", "回复", "回复"]);
    expect(html).not.toContain("<h2>回复</h2>");
    expect(html).toContain("◀");
    expect(html).not.toContain("←");
    expect(html).not.toContain("举报");
    expect(html).not.toContain('accept="video/mp4,video/webm"');
    expect(html).toContain('/api/forum/media/image-1');
    expect(html.match(/data-delete-kind="forum-reply"/g) ?? []).toHaveLength(2);
  });

  it("keeps a deleted reply as a tombstone so nested replies remain in context", () => {
    const deletedPost = { ...post, replies: [{ ...reply, content: "", children: [{ ...reply, id: "reply-child", content: "仍然保留的后续回复", children: [] }] }] } as typeof post;
    const html = renderToStaticMarkup(<ForumPostContent locale="zh" post={deletedPost} isAuthenticated currentUserId="author" replySubmitted={false} />);
    expect(html).toContain("这条回复已删除。");
    expect(html).toContain("仍然保留的后续回复");
    expect(html.match(/data-delete-kind="forum-reply"/g) ?? []).toHaveLength(1);
  });

  it("offers images and video for topics and explains immediate public posting", () => {
    const html = renderToStaticMarkup(<ForumNewPostContent locale="en" submitted={false} isAuthenticated />);
    expect(html).toContain('accept="video/mp4,video/webm"');
    expect(html).toContain('accept="image/jpeg,image/png,image/webp,image/gif"');
    expect(html).toContain("Posts appear publicly right after publishing.");
    expect(html).toContain("Up to 10 images, 10MB each");
    expect(html).toContain("Publish topic");
    const guest = renderToStaticMarkup(<ForumNewPostContent locale="en" submitted={false} isAuthenticated={false} />);
    expect(guest).toContain("Sign in to join the discussion");
    expect(guest).not.toContain('type="file"');
  });

  it("uses rich text tools and supports a generated cover when no image is selected", () => {
    const html = renderToStaticMarkup(<ForumNewPostContent locale="zh" submitted={false} isAuthenticated />);
    expect(html).toContain('role="toolbar"');
    expect(html).toContain("加粗");
    expect(html).toContain("字号");
    expect(html).toContain("背景色");
    expect(html).toContain("插入表格");
    expect(html).toContain('name="coverAttachmentId"');
    expect(html).toContain('class="forum-form-select-control"');
    expect(html).toContain("最多 10 张图片，每张 10MB");
    const contentField = html.match(/<textarea[^>]*id="forum-post-content"[^>]*>/)?.[0] ?? "";
    expect(contentField).not.toMatch(/maxlength/i);
  });
});
