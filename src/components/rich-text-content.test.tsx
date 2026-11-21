import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RichTextContent } from "./rich-text-content";

Object.assign(globalThis, { React });

describe("RichTextContent", () => {
  it("renders supported inline formatting, links, and inserted media", () => {
    const html = renderToStaticMarkup(<RichTextContent
      content={'**bold** [[size=24]]large[[/size]] [[bg=#dbeafe]]marked[[/bg]] [site](/forum) `code`\n\n[[media=image-1]]'}
      attachments={[{ id: "image-1", kind: "image", originalName: "demo.webp", mimeType: "image/webp" }]}
    />);

    expect(html).toContain("<strong><span>bold</span></strong>");
    expect(html).toContain('font-size:24px');
    expect(html).toContain("background-color:#dbeafe");
    expect(html).toContain('href="/forum"');
    expect(html).toContain("<code><span>code</span></code>");
    expect(html).toContain('class="forum-inline-media"');
    expect(html).toContain('/api/forum/media/image-1');
  });

  it("does not render raw HTML or unsafe links", () => {
    const html = renderToStaticMarkup(<RichTextContent content={'<img src=x onerror=alert(1)> [bad](javascript:alert(1))'} />);
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain('href="javascript:');
  });
});
