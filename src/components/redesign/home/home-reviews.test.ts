import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  HOME_REVIEWS,
  REVIEW_AUTO_INTERVAL_MS,
  REVIEW_MANUAL_RESUME_MS,
} from "@/lib/redesign/home/home-reviews";

const reviewSource = readFileSync(
  join(process.cwd(), "src/components/redesign/home/EnheRedesignExperienceReviews.tsx"),
  "utf8",
);
const homeStyles = readFileSync(join(process.cwd(), "src/styles/redesign/home.css"), "utf8");

describe("homepage experience review candidate", () => {
  it("keeps the approved five-record order and exact bilingual review content", () => {
    expect(HOME_REVIEWS).toHaveLength(5);
    expect(HOME_REVIEWS.map((review) => review.productId)).toEqual([
      "ultimate-edition",
      "infinitetalk",
      "ai-voice",
      "lumi-os",
      "faceswap-studio",
    ]);
    expect(HOME_REVIEWS.map((review) => review.stars)).toEqual([5, 4, 5, 5, 4]);
    expect(HOME_REVIEWS.map((review) => review.exampleLabel)).toEqual([
      { zh: "示例体验反馈", en: "Example experience feedback" },
      { zh: "示例体验反馈", en: "Example experience feedback" },
      { zh: "示例体验反馈", en: "Example experience feedback" },
      { zh: "示例体验反馈", en: "Example experience feedback" },
      { zh: "示例体验反馈", en: "Example experience feedback" },
    ]);
    expect(HOME_REVIEWS.map((review) => review.displayName)).toEqual([
      { zh: "林小满", en: "Lin Xiaoman" },
      { zh: "周一然", en: "Zhou Yiran" },
      { zh: "陈知夏", en: "Chen Zhixia" },
      { zh: "Mia Carter", en: "Mia Carter" },
      { zh: "Ethan Brooks", en: "Ethan Brooks" },
    ]);
    expect(HOME_REVIEWS.map((review) => review.productLabel)).toEqual([
      { zh: "无所不能版｜AI生成视频应用", en: "Ultimate Edition | AI Video Generation Suite" },
      { zh: "InfiniteTalk", en: "InfiniteTalk" },
      { zh: "AI语音生成", en: "AI Voice Generator" },
      { zh: "Lumi-OS", en: "LumiOS" },
      { zh: "FaceSwap Studio", en: "FaceSwap Studio" },
    ]);
    expect(HOME_REVIEWS.map((review) => review.avatarAlt)).toEqual([
      { zh: "插画头像：林小满", en: "Illustrated avatar for Lin Xiaoman" },
      { zh: "插画头像：周一然", en: "Illustrated avatar for Zhou Yiran" },
      { zh: "插画头像：陈知夏", en: "Illustrated avatar for Chen Zhixia" },
      { zh: "插画头像：Mia Carter", en: "Illustrated avatar for Mia Carter" },
      { zh: "插画头像：Ethan Brooks", en: "Illustrated avatar for Ethan Brooks" },
    ]);
    expect(HOME_REVIEWS.map((review) => review.avatarSrc)).toEqual([
      "/redesign/home/avatar-1.svg",
      "/redesign/home/avatar-2.svg",
      "/redesign/home/avatar-3.svg",
      "/redesign/home/avatar-4.svg",
      "/redesign/home/avatar-5.svg",
    ]);
    expect(HOME_REVIEWS.map((review) => review.quote)).toEqual([
      {
        zh: "以前看到本地 AI 视频工具就觉得很复杂，按照教程操作了一遍，第一次就生成出了可以使用的视频。最明显的感受是，不需要在多个平台之间来回切换，创作自由了很多。",
        en: "Local AI video tools used to look complicated. I followed the guide and created a usable video on the first try. Not having to move between several platforms made the creative process much freer.",
      },
      {
        zh: "上传一张人物图片和准备好的音频，就能生成数字人口播视频。整个流程比我原来想象得简单，做产品介绍和短视频内容方便了很多。",
        en: "Upload a person image and prepared audio, and a digital-presenter video comes together. The flow was simpler than expected and made product introductions much easier.",
      },
      {
        zh: "我平时要为短视频制作旁白，以前经常需要反复更换平台。现在可以在本地完成配音和多角色对话，调整起来更直接，也不用担心生成次数突然不够。",
        en: "I make voiceovers for short videos and used to switch platforms repeatedly. Local voiceover and multi-character dialogue are more direct, without worrying about a quota running out.",
      },
      {
        zh: "它不只是一个回答问题的 AI。平时可以陪我聊聊，也能帮助整理待办、记录重要信息。使用一段时间后，更像是电脑里一直在身边的 AI 助手。",
        en: "It is more than an AI that answers questions. It can chat, organize tasks, and keep important notes — more like an assistant that stays beside you.",
      },
      {
        zh: "导入素材后就能在本地预览和调整效果，不需要反复上传文件。操作路径比较清楚，对经常制作人物类图片和视频内容的人很实用。",
        en: "After importing material I can preview and adjust locally without repeated uploads. The path is clear and useful for portrait-oriented image and video work.",
      },
    ]);
    expect(HOME_REVIEWS[0]).toMatchObject({
      displayName: { zh: "林小满", en: "Lin Xiaoman" },
      productLabel: {
        zh: "无所不能版｜AI生成视频应用",
        en: "Ultimate Edition | AI Video Generation Suite",
      },
      avatarSrc: "/redesign/home/avatar-1.svg",
      avatarAlt: { zh: "插画头像：林小满", en: "Illustrated avatar for Lin Xiaoman" },
      quote: {
        zh: "以前看到本地 AI 视频工具就觉得很复杂，按照教程操作了一遍，第一次就生成出了可以使用的视频。最明显的感受是，不需要在多个平台之间来回切换，创作自由了很多。",
        en: "Local AI video tools used to look complicated. I followed the guide and created a usable video on the first try. Not having to move between several platforms made the creative process much freer.",
      },
    });
    expect(HOME_REVIEWS.every((review) => review.stars === 4 || review.stars === 5)).toBe(true);
  });

  it("keeps the approved automatic and manual-resume timings", () => {
    expect(REVIEW_AUTO_INTERVAL_MS).toBe(5000);
    expect(REVIEW_MANUAL_RESUME_MS).toBe(6000);
  });

  it("hides inactive review articles from assistive technology only", () => {
    expect(reviewSource).toMatch(/const isActive = offset === 0;[\s\S]*aria-hidden=\{!isActive\}/);
  });

  it("clears a pending manual resume before explicit pause and continue", () => {
    const togglePauseSource = reviewSource.slice(
      reviewSource.indexOf("const togglePause"),
      reviewSource.indexOf("\n\n  useEffect"),
    );

    expect(togglePauseSource).toContain("clearPendingResume");
    expect(togglePauseSource).toMatch(/if \(nextPaused\) \{[\s\S]*clearPendingResume\(\)[\s\S]*pause\(\)/);
    expect(togglePauseSource).toMatch(/else \{[\s\S]*clearPendingResume\(\)[\s\S]*resume\(\)/);
  });

  it("keeps horizontal pointer drags directional and manually resumed", () => {
    const pointerDownSource = reviewSource.slice(
      reviewSource.indexOf("const handlePointerDown"),
      reviewSource.indexOf("const handleVisibilityChange"),
    );
    const pointerUpSource = reviewSource.slice(
      reviewSource.indexOf("const handlePointerUp"),
      reviewSource.indexOf("const handleVisibilityChange"),
    );
    const pointerCancelSource = reviewSource.slice(
      reviewSource.indexOf("const handlePointerCancel"),
      reviewSource.indexOf("const handleReducedMotionChange"),
    );

    expect(reviewSource).toContain("REVIEW_DRAG_THRESHOLD_PX");
    expect(pointerDownSource).toContain("pointerStartX = event.clientX");
    expect(pointerDownSource).toContain("pause()");
    expect(pointerUpSource).toContain("event.clientX");
    expect(pointerUpSource).toContain("Math.abs(deltaX) > REVIEW_DRAG_THRESHOLD_PX");
    expect(pointerUpSource).toContain("deltaX > 0 ? -1 : 1");
    expect(pointerUpSource).toContain("setIndex");
    expect(pointerUpSource).toContain("scheduleManualResume");
    expect(pointerUpSource).toMatch(/scheduleManualResume\(\)[\s\S]*resume\(\)/);
    expect(pointerCancelSource).toContain("pointerStartX = null");
    expect(pointerCancelSource).toContain("hasPointer = false");
    expect(pointerCancelSource).toContain("resume()");
  });

  it("keeps the review island accessible and timer-controlled", () => {
    expect(reviewSource).toContain('"use client"');
    expect(reviewSource).toContain("useEffect");
    expect(reviewSource).toContain("setInterval");
    expect(reviewSource).toContain("setTimeout");
    expect(reviewSource).toContain("clearInterval");
    expect(reviewSource).toContain("clearTimeout");
    expect(reviewSource).toContain("matchMedia");
    expect(reviewSource).toContain("prefers-reduced-motion: reduce");
    expect(reviewSource).toContain("visibilitychange");
    expect(reviewSource).toContain("mouseenter");
    expect(reviewSource).toContain("focusin");
    expect(reviewSource).toContain("pointerdown");
    expect(reviewSource).toContain("ArrowLeft");
    expect(reviewSource).toContain("ArrowRight");
    expect(reviewSource).toContain("aria-label");
    expect(reviewSource).toContain("aria-pressed");
    expect(reviewSource).toContain("REVIEW_INITIAL_INDEX");
    expect(reviewSource).toContain("tabIndex={0}");
    expect(reviewSource).toContain('role="region"');
    expect((reviewSource.match(/\buseEffect\(/g) ?? []).length).toBe(1);
    expect(reviewSource).toContain("REVIEW_MANUAL_RESUME_MS");
    expect(reviewSource).toContain('mediaQuery.removeEventListener("change"');
    expect(reviewSource).not.toMatch(/AggregateRating|Review\s*JSON-LD|verified purchase/i);
    expect(homeStyles).toContain(".redesign-home-reviews-window");
    expect(homeStyles).toContain("opacity");
    expect(homeStyles).toContain("transform");
    expect(homeStyles).toContain("min-width: 44px");
  });
});
