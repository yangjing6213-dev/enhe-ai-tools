import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EmojiText } from "./emoji-text";

describe("safe sticker text rendering", () => {
  beforeEach(() => vi.stubGlobal("React", React));
  afterEach(() => vi.unstubAllGlobals());

  it("renders a registered shortcode as an accessible inline image", () => {
    const html = renderToStaticMarkup(React.createElement(EmojiText, { text: "你好 :enhe_01:" }));
    expect(html).toContain('src="/images/emojis/enhe_01.webp"');
    expect(html).toContain('alt="[出发]"');
    expect(html).toContain("enhe-inline-emoji");
    expect(html).not.toContain(":enhe_01:");
  });

  it("escapes user markup and preserves unknown shortcodes literally", () => {
    const html = renderToStaticMarkup(React.createElement(EmojiText, { text: "<script>alert(1)</script> :enhe_unknown:" }));
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain(":enhe_unknown:");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
  });
});
