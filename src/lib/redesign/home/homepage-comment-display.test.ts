import { describe, expect, it } from "vitest";
import { mapHomepageCommentCards } from "./homepage-comment-display";

describe("mapHomepageCommentCards", () => {
  it("shows at most five approved comment records without exposing account fields", () => {
    const comments = Array.from({ length: 6 }, (_, index) => ({
      id: `comment-${index}`,
      content: `Approved comment ${index}`,
      toolName: `Tool ${index}`,
      email: `private-${index}@example.test`
    }));

    expect(mapHomepageCommentCards(comments, "zh")).toEqual([
      {
        id: "comment-0",
        displayName: "ENHE AI 用户",
        productLabel: "Tool 0",
        quote: "Approved comment 0"
      },
      {
        id: "comment-1",
        displayName: "ENHE AI 用户",
        productLabel: "Tool 1",
        quote: "Approved comment 1"
      },
      {
        id: "comment-2",
        displayName: "ENHE AI 用户",
        productLabel: "Tool 2",
        quote: "Approved comment 2"
      },
      {
        id: "comment-3",
        displayName: "ENHE AI 用户",
        productLabel: "Tool 3",
        quote: "Approved comment 3"
      },
      {
        id: "comment-4",
        displayName: "ENHE AI 用户",
        productLabel: "Tool 4",
        quote: "Approved comment 4"
      }
    ]);
  });

  it("uses the English generic label without translating user-submitted text", () => {
    expect(
      mapHomepageCommentCards(
        [{ id: "comment-en", content: "原始评论内容", toolName: "产品" }],
        "en"
      )
    ).toEqual([
      {
        id: "comment-en",
        displayName: "ENHE AI user",
        productLabel: "产品",
        quote: "原始评论内容"
      }
    ]);
  });
});
