import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { groupChatContentReferences } from "@/lib/group-chat/content-reference-groups";

const source = readFileSync(new URL("./ChatRoom.tsx", import.meta.url), "utf8");
const actions = readFileSync(new URL("./ChatMessageActions.tsx", import.meta.url), "utf8");
const avatar = readFileSync(new URL("./ChatProfileAvatar.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../../styles/redesign/chat.css", import.meta.url), "utf8");

describe("chat room presentation", () => {
  it("keeps the animated background around both the member list and the chat window", () => {
    expect(source).toMatch(/className="enhe-chat-room-shell"[\s\S]*?className="enhe-chat-room-list[\s\S]*?className="enhe-chat-room-main/);
    expect(source).toMatch(/className="enhe-chat-room-shell"[\s\S]*?<Aurora/);
    expect(styles).toMatch(/\.enhe-chat-room-shell\s*\{[^}]*position:\s*relative/);
    expect(styles).toMatch(/\.enhe-chat-room-shell\s*>\s*\.aurora-container\s*\{[^}]*position:\s*absolute/);
  });

  it("renders compact message actions as accessible icon buttons", () => {
    for (const label of ["回复", "复制文字", "撤回"]) expect(actions).toContain(`aria-label="${label}"`);
    expect(actions).toMatch(/aria-label=\{isPinned \? "取消置顶" : "置顶"\}/);
    expect(actions).toMatch(/<Reply\s/);
    expect(actions).toMatch(/<Copy\s/);
    expect(actions).toMatch(/<Pin\s/);
    expect(actions).toMatch(/<Undo2\s/);
    expect(styles).toMatch(/\.enhe-chat-message-actions\s*\{[^}]*display:\s*flex/);
  });

  it("provides an avatar fallback when a profile image cannot load", () => {
    expect(source).toContain("ChatProfileAvatar");
    expect(avatar).toContain("onError");
    expect(avatar).toContain("failedSrc === src");
  });

  it("keeps chat member information on one horizontal row and aligns composer controls", () => {
    expect(styles).toMatch(/\.enhe-chat-member\s*\{[^}]*align-items:\s*center/);
    expect(styles).toMatch(/\.enhe-chat-composer-tools\s*>\s*\.enhe-chat-button\s*,[\s\S]*?height:\s*42px/);
    expect(styles).toMatch(/\.enhe-chat-composer-tools\s*\{[^}]*align-items:\s*center/);
  });

  it("keeps the message search input and filter button in one consistent toolbar row", () => {
    expect(styles).toMatch(/\.enhe-chat-search\s*\{[^}]*display:\s*flex/);
    expect(styles).toMatch(/\.enhe-chat-search\s*>\s*input\s*\{[^}]*flex:\s*1/);
    expect(styles).toMatch(/\.enhe-chat-search\s*>\s*\.enhe-chat-button\s*\{[^}]*min-height:\s*42px/);
    expect(styles).toMatch(/\.enhe-chat-filter-row\s*\{[^}]*display:\s*flex/);
  });

  it("shows the group introduction beside the title without a separate card surface", () => {
    expect(source).toContain('className="enhe-chat-hero-summary"');
    expect(source).toContain('className="enhe-chat-hero-description"');
    expect(styles).toMatch(/\.enhe-chat-room-shell\s*>\s*\.enhe-chat-hero\s*\{[^}]*border:\s*0[^}]*background:\s*transparent/);
    expect(styles).toMatch(/\.enhe-chat-room-shell\s+\.enhe-chat-hero-content\s*\{[^}]*display:\s*grid/);
    expect(styles).toMatch(/grid-template-columns:\s*minmax\(0,\s*2fr\)\s+minmax\(0,\s*1fr\)/);
  });

  it("gives compact controls consistent spacing and distinguishes quiet mode", () => {
    expect(styles).toMatch(/\.enhe-chat-room-shell\s+\.enhe-chat-toolbar\s*\{[^}]*gap:\s*10px/);
    expect(styles).toMatch(/\.enhe-chat-composer-tools\s*\{[^}]*gap:\s*8px/);
    expect(styles).toMatch(/\.enhe-chat-room-shell\s+\.enhe-chat-dnd-button\[aria-pressed="false"\][^{]*\{[^}]*background:\s*#e8f7ed/);
    expect(styles).toMatch(/\.enhe-chat-room-shell\s+\.enhe-chat-dnd-button\[aria-pressed="true"\][^{]*\{[^}]*background:\s*#f1f3f5/);
    expect(source).toContain('aria-pressed={quiet}');
  });

  it("renders linked-content results in labeled, separated groups", () => {
    expect(source).toContain("groupChatContentReferences(contentResults)");
    expect(source).toContain('className="enhe-chat-reference-group"');
    expect(source).toContain('className="enhe-chat-result"');
    expect(styles).toMatch(/\.enhe-chat-reference-group\s*\{[^}]*display:\s*grid/);
    expect(styles).toMatch(/\.enhe-chat-result\s*\{[^}]*display:\s*block/);
  });
});

describe("chat linked-content result grouping", () => {
  it("separates products by their actual product type and keeps news distinct", () => {
    const groups = groupChatContentReferences([
      { type: "tool", category: "ai_skill", id: "skill" },
      { type: "tool", category: "software", id: "software" },
      { type: "news", id: "news" },
      { type: "tool", category: "ai_skill", id: "skill-2" },
    ]);

    expect(groups.map(({ label, items }) => [label, items.map(({ id }) => id)])).toEqual([
      ["桌面软件", ["software"]],
      ["AI Skill", ["skill", "skill-2"]],
      ["AI 资讯", ["news"]],
    ]);
  });

  it("keeps unknown product types in a general product group", () => {
    expect(groupChatContentReferences([{ type: "tool", category: "legacy", id: "legacy" }])).toEqual([
      { key: "product", label: "产品", items: [{ type: "tool", category: "legacy", id: "legacy" }] },
    ]);
  });
});
