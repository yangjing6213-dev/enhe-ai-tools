import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ToolRichContent } from "@/components/tool-rich-content";

function extractOrderedMarkers(html: string) {
  return Array.from(
    html.matchAll(/<span class="flex h-7 w-7[^"]*">(\d+)<\/span>/g),
    (match) => match[1]
  );
}

describe("ToolRichContent", () => {
  it("keeps ordered markers increasing when descriptions split numbered items", () => {
    vi.stubGlobal("React", React);

    const content = [
      "Features:",
      "1. Text to speech TTS",
      "Generate natural audio for courses, videos, and voiceovers.",
      "",
      "2. Voice cloning",
      "Create a consistent voice style from authorized samples.",
      "",
      "3. Voice design",
      "Describe a target voice and generate a matching style."
    ].join("\n");

    const html = renderToStaticMarkup(React.createElement(ToolRichContent, { content }));

    expect(extractOrderedMarkers(html)).toEqual(["1", "2", "3"]);
  });
});
