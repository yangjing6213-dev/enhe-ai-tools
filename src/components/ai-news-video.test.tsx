import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AiNewsVideo } from "./ai-news-video";

vi.stubGlobal("React", React);

describe("AI article video presentation", () => {
  it("renders native video with manual controls and an always-available source link", () => {
    const html = renderToStaticMarkup(<AiNewsVideo video={{ url: "https://cdn.example.com/demo.mp4", title: "官方演示", description: '{"zh":"操作演示","en":"Walkthrough","presentation":"embedded"}' }} locale="zh" articleTitle="文章" />);
    expect(html).toContain("<video");
    expect(html).toContain('preload="none"');
    expect(html).toContain("controls");
    expect(html).not.toMatch(/autoplay|loop=""/i);
    expect(html).toContain("前往来源网站观看");
    expect(html).toContain('rel="nofollow noopener noreferrer"');
  });

  it("does not contact an embed provider before the reader chooses to load it", () => {
    const html = renderToStaticMarkup(<AiNewsVideo video={{ url: "https://youtu.be/abcdefghijk", title: '{"zh":"官方演示","en":"Official demo"}', description: '{"zh":"操作示范","en":"A workflow walkthrough","presentation":"embedded"}' }} locale="en" articleTitle="Article" />);
    expect(html).not.toContain("<iframe");
    expect(html).toContain("Load video");
    expect(html).toContain("Official demo");
    expect(html).toContain("A workflow walkthrough");
    expect(html).not.toContain("官方演示");
  });

  it("keeps unsupported providers as external links without an iframe", () => {
    const html = renderToStaticMarkup(<AiNewsVideo video={{ url: "https://example.com/demo", title: "Demo" }} locale="en" articleTitle="Article" />);
    expect(html).not.toContain("<video");
    expect(html).not.toContain("<iframe");
    expect(html).toContain("Watch on the source website");
  });

  it.each([undefined, "Legacy plain description", '{"zh":"仅外链","en":"Link only","presentation":"external_link"}'])("requires persisted embedding approval for recognized media: %s", (description) => {
    const html = renderToStaticMarkup(<AiNewsVideo video={{ url: "https://cdn.example.com/demo.mp4", title: "Demo", description }} locale="en" articleTitle="Article" />);
    expect(html).not.toContain("<video");
    expect(html).not.toContain("<iframe");
    expect(html).toContain("Watch on the source website");
  });
});
