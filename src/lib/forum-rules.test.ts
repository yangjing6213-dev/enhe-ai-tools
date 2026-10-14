import { describe, expect, it } from "vitest";
import {
  canCreateForumContent,
  canLikeForumContent,
  canReportForumContent,
  forumPostInputSchema,
  forumReplyInputSchema,
  getForumReplyDepth,
} from "@/lib/forum-rules";

describe("forum rules", () => {
  it("accepts the four fixed categories and enforces post text limits", () => {
    expect(forumPostInputSchema.safeParse({ category: "question", title: "请教", content: "求建议" }).success).toBe(true);
    expect(forumPostInputSchema.safeParse({ category: "other", title: "请教", content: "求建议" }).success).toBe(false);
    expect(forumPostInputSchema.safeParse({ category: "question", title: "x".repeat(121), content: "求建议" }).success).toBe(false);
    expect(forumPostInputSchema.safeParse({ category: "question", title: "有效标题", content: "x".repeat(5001) }).success).toBe(false);
  });

  it("enforces reply text limits and stops reply trees at depth five", () => {
    expect(forumReplyInputSchema.safeParse({ content: "好的" }).success).toBe(true);
    expect(forumReplyInputSchema.safeParse({ content: "x".repeat(2001) }).success).toBe(false);
    expect(getForumReplyDepth(0)).toBe(1);
    expect(getForumReplyDepth(4)).toBe(5);
    expect(getForumReplyDepth(5)).toBeNull();
  });

  it("limits account activity to five submissions, thirty likes, and five reports in their windows", () => {
    expect(canCreateForumContent(4)).toBe(true);
    expect(canCreateForumContent(5)).toBe(false);
    expect(canLikeForumContent(29)).toBe(true);
    expect(canLikeForumContent(30)).toBe(false);
    expect(canReportForumContent(4)).toBe(true);
    expect(canReportForumContent(5)).toBe(false);
  });
});
