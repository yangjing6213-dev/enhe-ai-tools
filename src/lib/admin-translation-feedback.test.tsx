import { readFileSync } from "node:fs";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({ state: { ok: true, message: "Local synthetic translation result" }, pending: false }));
vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useActionState: () => [fixture.state, undefined, fixture.pending],
  useEffect: () => undefined
}));
vi.mock("@/app/admin/actions", () => ({ generateAiNewsEnglishDraftAction: vi.fn(() => { throw new Error("Translation must not run in this test."); }) }));

import { AiNewsTranslationPanel } from "@/app/admin/ai-news-translation-panel";
import { generateAiNewsEnglishDraftAction } from "@/app/admin/actions";

describe("admin translation feedback", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    fixture.state = { ok: true, message: "Local synthetic translation result" };
    fixture.pending = false;
    vi.mocked(generateAiNewsEnglishDraftAction).mockClear();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("renders a success message with the light-shell success text color", () => {
    const markup = renderToStaticMarkup(<AiNewsTranslationPanel onTranslated={() => undefined} />);
    expect(markup).toContain("Local synthetic translation result");
    expect(markup).toContain("enhe-admin-translation-success");
    const css = readFileSync("src/styles/redesign/shell.css", "utf8");
    const colorToken = css.match(/\.enhe-admin-translation-success\s*\{[^}]*color:\s*var\((--[\w-]+)\)/)?.[1];
    expect(colorToken).toBeDefined();
    const tokens = readFileSync("src/styles/redesign/tokens.css", "utf8");
    const hex = tokens.match(new RegExp(`${colorToken}:\\s*(#[a-fA-F0-9]{6})`))?.[1];
    expect(hex).toBeDefined();
    const rgb = (value: string) => [1, 3, 5].map((index) => parseInt(value.slice(index, index + 2), 16));
    const base = rgb(tokens.match(/--enhe-page-bg:\s*(#[a-fA-F0-9]{6})/)![1]);
    // Admin feedback now sits on the shared white surface, so verify the
    // success text against the page surface instead of the retired dark glass.
    const background = base;
    const luminance = (channels: number[]) => channels.map((value) => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    }).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
    expect((luminance(background) + 0.05) / (luminance(rgb(hex!)) + 0.05)).toBeGreaterThanOrEqual(4.5);
  });

  it("does not apply success styling to a failed result", () => {
    fixture.state = { ok: false, message: "Local synthetic failure" };
    const markup = renderToStaticMarkup(<AiNewsTranslationPanel onTranslated={() => undefined} />);
    expect(markup).toContain("Local synthetic failure");
    expect(markup).not.toContain("enhe-admin-translation-success");
  });

  it("disables the submit button and shows the current pending label without running translation", () => {
    fixture.state = { ok: false, message: "" };
    fixture.pending = true;
    const markup = renderToStaticMarkup(<AiNewsTranslationPanel onTranslated={() => undefined} />);
    const button = markup.match(/<button\b([^>]*)>([\s\S]*?)<\/button>/);
    expect(button).not.toBeNull();
    expect(button?.[1]).toMatch(/(?:^|\s)disabled=""(?:\s|$)/);
    expect(button?.[2]).toBe("Generating...");
    expect(generateAiNewsEnglishDraftAction).not.toHaveBeenCalled();
  });
});
