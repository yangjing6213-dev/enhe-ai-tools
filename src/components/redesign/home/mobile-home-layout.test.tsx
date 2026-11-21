import * as React from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EnheBrandLockup } from "@/components/redesign/enhe-brand-lockup";
import { EnheRedesignHero } from "./EnheRedesignHero";

Object.assign(globalThis, { React });

const refreshStyles = readFileSync(join(process.cwd(), "src/styles/redesign/site-refresh.css"), "utf8");

describe("mobile homepage reference", () => {
  it("provides a mobile white logo and a three-card route set using site content", () => {
    const logo = renderToStaticMarkup(<EnheBrandLockup href="/" label="ENHE AI 首页" mobileWhite />);
    const hero = renderToStaticMarkup(<EnheRedesignHero locale="zh" />);

    expect(logo).toContain("enhe-standard-white-plain-1024.gif");
    expect(hero).toContain("redesign-home-mobile-title");
    expect(hero).toContain("redesign-home-mobile-mascot");
    expect(hero.match(/class="redesign-home-mobile-card"/g)).toHaveLength(3);
    expect(hero).toContain("探索工具");
    expect(hero).toContain("进入社区");
    expect(hero).toContain("跟进资讯");
  });

  it("sets the dark brand header, blue mobile hero, yellow action, and white stacked cards", () => {
    expect(refreshStyles).toMatch(/@media\s*\(max-width:\s*767px\)[\s\S]*?\.redesign-header\[data-home="true"\][\s\S]*?background:\s*#(?:071|081|0b1|0c1)/i);
    expect(refreshStyles).toContain(".redesign-home-mobile-cards");
    expect(refreshStyles).toContain("#ffd60a");
  });
});
