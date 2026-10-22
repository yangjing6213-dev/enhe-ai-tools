import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ failedSource: null as string | null }));
vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useState: () => [state.failedSource, (value: string) => { state.failedSource = value; }],
}));

import { AiWorkflowCoverImage } from "./workflow-cover-image";

describe("workflow cover image recovery", () => {
  beforeEach(() => { state.failedSource = null; vi.stubGlobal("React", React); });
  afterEach(() => vi.unstubAllGlobals());

  it("replaces an unreachable upstream cover with this project's generated cover", () => {
    const props = { slug: "ai-workflow-123-design", coverImage: "https://raw.githubusercontent.com/example/design/main/cover.png", alt: "Design" };
    const image = AiWorkflowCoverImage(props);
    expect(image.props.src).toBe(props.coverImage);
    image.props.onError();
    const fallback = AiWorkflowCoverImage(props);
    expect(fallback.props.src).toBe("/api/ai-workflows/covers/ai-workflow-123-design");
    fallback.props.onError();
    expect(AiWorkflowCoverImage(props).props.src).toBe(fallback.props.src);
  });

  it("tries a changed upstream cover even after the previous one failed", () => {
    const props = { slug: "ai-workflow-123-design", coverImage: "https://raw.githubusercontent.com/example/design/main/cover.png", alt: "Design" };
    AiWorkflowCoverImage(props).props.onError();
    const next = AiWorkflowCoverImage({ ...props, coverImage: "https://raw.githubusercontent.com/example/design/main/new-cover.png" });
    expect(next.props.src).toBe("https://raw.githubusercontent.com/example/design/main/new-cover.png");
  });

  it("shows a generated background while the upstream image is still loading", () => {
    const image = AiWorkflowCoverImage({ slug: "ai-workflow-123-design", coverImage: "https://raw.githubusercontent.com/example/design/main/cover.png", alt: "Design", style: { borderRadius: 12 } });
    expect(image.props.style).toMatchObject({ backgroundImage: 'url("/api/ai-workflows/covers/ai-workflow-123-design")', backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat", borderRadius: 12 });
  });

  it("uses the private admin preview fallback without requesting a public draft cover", () => {
    const props = { slug: "draft", coverImage: "https://raw.githubusercontent.com/example/design/main/cover.png", fallbackImage: "data:image/svg+xml;base64,PHN2Zy8+", alt: "Draft" };
    const image = AiWorkflowCoverImage(props);
    expect(image.props.style.backgroundImage).toContain(props.fallbackImage);
    image.props.onError();
    expect(AiWorkflowCoverImage(props).props.src).toBe(props.fallbackImage);
  });
});
