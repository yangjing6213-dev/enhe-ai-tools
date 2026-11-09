import React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChatHub } from "./ChatHub";

Object.assign(globalThis, { React });

const chatStyles = readFileSync(new URL("../../styles/redesign/chat.css", import.meta.url), "utf8");

describe("AI buddy chat hero", () => {
  it("uses the centered software-catalog heading and subtitle style", () => {
    const html = renderToStaticMarkup(<ChatHub />);

    expect(html).toContain('class="enhe-chat-hero enhe-chat-hub-hero"');
    expect(html).toContain("AI搭子群聊");
    expect(html).toContain("用于共同沟通、探讨 AI 相关话题。入群申请经管理员审核后开放聊天。");
    expect(chatStyles).toMatch(/\.enhe-chat-hub-hero-content\s*\{[^}]*text-align:\s*center/);
    expect(chatStyles).toMatch(/\.enhe-chat-hub-hero\s*\{[^}]*background:\s*transparent/);
    expect(chatStyles).toMatch(/\.enhe-chat-hub-hero p\s*\{[^}]*color:\s*var\(--enhe-text-muted/);
  });
});
