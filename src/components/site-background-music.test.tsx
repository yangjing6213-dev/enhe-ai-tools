import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SiteBackgroundMusicCard, SiteBackgroundMusicProvider } from "./site-background-music";
import { SITE_BACKGROUND_MUSIC_TRACKS } from "@/lib/site-background-music";

describe("site background music controls", () => {
  it("defaults to Uplifting Acoustic while keeping the five-percent volume default", () => {
    const html = renderToStaticMarkup(
      <SiteBackgroundMusicProvider>
        <SiteBackgroundMusicCard locale="zh" />
      </SiteBackgroundMusicProvider>
    );

    expect(html).toContain("轻快原声 · Wavecont");
    expect(html).toContain("/audio/background-music/uplifting-acoustic.mp3");
    expect(html).toContain('aria-pressed="false"');
    expect(html).not.toMatch(/<audio[^>]*autoplay/);
    expect(html).toContain('aria-valuenow="5"');
    expect(html).toContain('aria-label="音量"');
    expect(html).toContain("播放音乐");
  });

  it("ships all ten approved background tracks as compact public MP3 files", () => {
    expect(SITE_BACKGROUND_MUSIC_TRACKS).toHaveLength(10);
    for (const track of SITE_BACKGROUND_MUSIC_TRACKS) {
      const assetPath = join(process.cwd(), "public", track.src.replace(/^\//, ""));
      expect(existsSync(assetPath), track.src).toBe(true);
      expect(statSync(assetPath).size, track.src).toBeLessThan(10 * 1024 * 1024);
    }
  });
});
