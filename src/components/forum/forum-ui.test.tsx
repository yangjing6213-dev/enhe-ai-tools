import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ForumIndexContent, ForumNewPostContent, ForumPostContent } from "./forum-ui";

Object.assign(globalThis, { React });
vi.mock("@/app/forum/actions", () => ({ createForumPostAction: vi.fn(), createForumReplyAction: vi.fn(), deleteForumPostAction: vi.fn(), deleteForumReplyAction: vi.fn(), toggleForumLikeAction: vi.fn() }));

const author = { id: "author", displayName: "用户 :enhe_01:", nickname: "用户", avatar: "/images/default-avatars/avatar-01.webp" };
const reply = { id: "reply-1", postId: "post-1", parentId: null, authorId: "author", status: "approved", author, createdAt: new Date("2026-10-14T00:00:00Z"), updatedAt: new Date("2026-10-14T00:00:00Z"), content: "回复正文", attachments: [], isLiked: false, _count: { likes: 0 }, children: [] };
const post = {
  id: "post-1", author, createdAt: new Date("2026-10-14T00:00:00Z"), category: "workflow", title: "测试话题", content: "话题正文 :enhe_01:",
  attachments: [{ id: "image-1", kind: "image", mimeType: "image/webp", originalName: "image.webp" }], isLiked: true,
  _count: { likes: 1, replies: 2 }, replyCount: 2, replies: [{ ...reply, children: [{ ...reply, id: "reply-2", children: [] }] }],
} as unknown as Parameters<typeof ForumPostContent>[0]["post"];

describe("forum public surfaces", () => {
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

  it("keeps the cover's full image dimensions and separates the topic tag from the author", () => {
    const html = renderToStaticMarkup(<ForumIndexContent locale="zh" posts={[post] as unknown as Parameters<typeof ForumIndexContent>[0]["posts"]} isAuthenticated />);
    expect(html).toContain('width="1448" height="620"');
    expect(html).toContain('class="forum-post-header"');
    expect(html).toContain('class="forum-category-tag"');
    expect(html).not.toContain("举报");
    expect(html).toContain('class="enhe-inline-emoji"');
  });

  it("places the full nested reply count with post likes and provides blue replies without arrows", () => {
    const html = renderToStaticMarkup(<ForumPostContent locale="zh" post={post} isAuthenticated currentUserId="author" replySubmitted={false} />);
    expect(html).toContain('href="#replies">2 条回复</a>');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('<summary class="forum-primary-button">回复</summary>');
    expect(html).not.toContain("<h2>回复</h2>");
    expect(html).toContain("◀");
    expect(html).not.toContain("←");
    expect(html).not.toContain("举报");
    expect(html).not.toContain('accept="video/mp4,video/webm"');
    expect(html).toContain('/api/forum/media/image-1');
    expect(html.match(/删除回复/g) ?? []).toHaveLength(2);
  });

  it("keeps a deleted reply as a tombstone so nested replies remain in context", () => {
    const deletedPost = { ...post, replies: [{ ...reply, content: "", children: [{ ...reply, id: "reply-child", content: "仍然保留的后续回复", children: [] }] }] } as typeof post;
    const html = renderToStaticMarkup(<ForumPostContent locale="zh" post={deletedPost} isAuthenticated currentUserId="author" replySubmitted={false} />);
    expect(html).toContain("这条回复已删除。");
    expect(html).toContain("仍然保留的后续回复");
    expect(html.match(/删除回复/g) ?? []).toHaveLength(1);
  });

  it("offers images and video for topics and explains immediate public posting", () => {
    const html = renderToStaticMarkup(<ForumNewPostContent locale="en" submitted={false} isAuthenticated />);
    expect(html).toContain('accept="video/mp4,video/webm"');
    expect(html).toContain('accept="image/jpeg,image/png,image/webp,image/gif"');
    expect(html).toContain("Posts appear publicly right after publishing.");
    expect(html).toContain("Publish topic");
    const guest = renderToStaticMarkup(<ForumNewPostContent locale="en" submitted={false} isAuthenticated={false} />);
    expect(guest).toContain("Sign in to join the discussion");
    expect(guest).not.toContain('type="file"');
  });
});
