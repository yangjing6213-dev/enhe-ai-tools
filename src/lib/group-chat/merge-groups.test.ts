import { describe, expect, it } from "vitest";
import { mergeChatGroups } from "./merge-groups";

describe("mergeChatGroups", () => {
  it("keeps a joined group once when it is also returned by discovery", () => {
    const mine = [{ id: "g1", name: "AI本地部署", role: "owner", membershipStatus: "active" }];
    const discover = [{ id: "g1", name: "AI本地部署", role: null, membershipStatus: "active" }, { id: "g2", name: "AI绘图", role: null, membershipStatus: null }];

    expect(mergeChatGroups(mine, discover)).toEqual([
      { ...mine[0], _discover: false },
      { ...discover[1], _discover: true },
    ]);
  });

  it("keeps independent same-name rooms even when they have the same owner and description", () => {
    const result = mergeChatGroups(
      [{ id: "group-owner", ownerId: "owner-1", name: "AI 本地部署", description: "讨论 AI 本地部署", role: "owner" }],
      [{ id: "group-copy", ownerId: "owner-1", name: "AI 本地部署", description: "讨论 AI 本地部署", status: "active" }],
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: "group-owner", role: "owner", _discover: false });
  });

  it("deduplicates repeated joined groups and preserves the admin entry", () => {
    const result = mergeChatGroups(
      [
        { id: "group-1", role: "member" },
        { id: "group-1", role: "owner" },
      ],
      [],
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "group-1", role: "owner", _discover: false });
  });

  it("does not merge same-named groups owned by different users", () => {
    const result = mergeChatGroups(
      [{ id: "group-1", ownerId: "owner-1", name: "AI 本地部署", description: "讨论 AI 本地部署", role: "member" }],
      [{ id: "group-2", ownerId: "owner-2", name: "AI 本地部署", description: "讨论 AI 本地部署", status: "active" }],
    );

    expect(result).toHaveLength(2);
  });
});
