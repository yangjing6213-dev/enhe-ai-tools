import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

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
});
