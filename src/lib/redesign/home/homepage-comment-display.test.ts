import { describe, expect, it } from "vitest";
import { mapHomepageCommentCards } from "./homepage-comment-display";

describe("mapHomepageCommentCards", () => {
  it("shows at most five approved comments with their public profile and rating", () => {
    const comments = Array.from({ length: 6 }, (_, index) => ({
      id: `comment-${index}`,
      content: `Approved comment ${index}`,
      toolName: `Tool ${index}`,
      nickname: `User ${index}`,
      avatar: `/uploads/avatar-${index}.png`,
      rating: 4,
      email: `private-${index}@example.test`
    }));

    expect(mapHomepageCommentCards(comments, "zh")).toEqual([
      {
        id: "comment-0",
        displayName: "User 0",
        productLabel: "Tool 0",
        quote: "Approved comment 0",
        avatarSrc: "/uploads/avatar-0.png",
        avatarAlt: "User 0",
        stars: 4
      },
      {
        id: "comment-1",
        displayName: "User 1",
        productLabel: "Tool 1",
        quote: "Approved comment 1",
        avatarSrc: "/uploads/avatar-1.png",
        avatarAlt: "User 1",
        stars: 4
      },
      {
        id: "comment-2",
        displayName: "User 2",
        productLabel: "Tool 2",
        quote: "Approved comment 2",
        avatarSrc: "/uploads/avatar-2.png",
        avatarAlt: "User 2",
        stars: 4
      },
      {
        id: "comment-3",
        displayName: "User 3",
        productLabel: "Tool 3",
        quote: "Approved comment 3",
        avatarSrc: "/uploads/avatar-3.png",
        avatarAlt: "User 3",
        stars: 4
      },
      {
        id: "comment-4",
        displayName: "User 4",
        productLabel: "Tool 4",
        quote: "Approved comment 4",
        avatarSrc: "/uploads/avatar-4.png",
        avatarAlt: "User 4",
        stars: 4
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
