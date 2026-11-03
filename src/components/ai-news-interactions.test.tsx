import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AiNewsInteractions } from "@/components/ai-news-interactions";

Object.assign(globalThis, { React });

describe("AI news detail interaction toolbar", () => {
  it("uses accessible icon-only controls for all five actions", () => {
    const labels = {
      like: "Like",
      favorite: "Save",
      share: "Share",
      copyLink: "Copy link",
      backToTop: "Back to top",
      loginRequired: "Please sign in",
      articleSupportLabel: "Article support links",
    };
    const html = renderToStaticMarkup(<AiNewsInteractions slug="fixture" labels={labels} />);

    for (const label of [labels.like, labels.favorite, labels.share, labels.copyLink, labels.backToTop]) {
      expect(html).toContain(`aria-label="${label}"`);
      expect(html).toContain(`title="${label}"`);
    }
    expect(html.match(/<button\b/g)).toHaveLength(5);
    expect(html).toContain('role="group" aria-label="Article support links"');
    expect(html).toContain("<svg");
    expect(html).not.toContain(">Like</button>");
    expect(html).not.toContain(">Save</button>");
    expect(html).not.toContain(">Share</button>");
    expect(html).not.toContain(">Copy link</button>");
    expect(html).not.toContain(">Back to top</button>");
  });
});
