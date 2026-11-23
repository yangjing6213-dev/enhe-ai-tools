import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SiteBackgroundMusicCard, SiteBackgroundMusicProvider } from "./site-background-music";
import { SITE_BACKGROUND_MUSIC_TRACKS } from "@/lib/site-background-music";

const tracks = [
  { id: "theme-one", label: "Corporate Motivation", src: "/music/theme-one.mp3" },
  { id: "theme-two", label: "Summer Night", src: "/music/theme-two.mp3" }
];

describe("site background music controls", () => {
  it("renders the selected track, playback controls, and a five-percent volume default", () => {
    const html = renderToStaticMarkup(
      <SiteBackgroundMusicProvider tracks={tracks}>
        <SiteBackgroundMusicCard locale="zh" />
      </SiteBackgroundMusicProvider>
    );

    expect(html).toContain("Corporate Motivation");
    expect(html).toContain("Summer Night");
    expect(html).toContain("/music/theme-one.mp3");
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
