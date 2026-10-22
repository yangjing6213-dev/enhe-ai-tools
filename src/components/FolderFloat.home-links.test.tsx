import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import FolderFloat from "./FolderFloat";

Object.assign(globalThis, { React });
afterEach(() => vi.unstubAllGlobals());

describe("FolderFloat homepage links", () => {
  it("renders actual anchors inside a native details disclosure", () => {
    const html = renderToStaticMarkup(<FolderFloat
      label="AI skills"
      items={[{ label: "AI workflows", value: "/en/ai-workflows", href: "/en/ai-workflows" }]}
      trigger="hover"
    />);

    expect(html).toContain("<details class=\"folder-float\"");
    expect(html).toContain("<summary class=\"folder-float__trigger\"");
    expect(html).toMatch(/<a\b[^>]*href="\/en\/ai-workflows"/);
  });
});
