import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ToolCard } from "@/components/tool-card";

Object.assign(globalThis, { React });

vi.mock("@/components/prefetch-link", () => ({
  PrefetchLink: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

const sideProjectCourse = {
  name: "AI副业实操课｜从工具到项目",
  englishName: "Practical AI Side Project Course",
  slug: "ai-ai-ilo5a5",
  type: "skill_learning" as const,
  shortDescription:
    "[[zh]]旧的课程简介较长。[[/zh]][[en]]Practice AI image, writing, video, and traffic workflows through project-based lessons that clarify the path from tool use to execution.[[/en]]",
  valueProposition: "通过项目练习，用 AI 制作图文和视频内容。",
  englishValueProposition: "Learn to create written content, images, and videos through practical AI projects.",
  isVipRequired: false,
  downloadCount: 0,
  usageCount: 0,
};

const promptCourse = {
  ...sideProjectCourse,
  name: "高频AI提示词｜日常工作学习教学",
  englishName: "High-Frequency AI Prompts for Work, Learning, and Teaching",
  slug: "ai-at8nui",
  shortDescription:
    "[[zh]]旧的提示词课程简介。[[/zh]][[en]]Turn common writing, learning, teaching, and office tasks into reusable prompt patterns for beginners who want less trial and error.[[/en]]",
  valueProposition: "把工作、学习和教学中的常见任务整理成可复用提示词。",
  englishValueProposition: "Build reusable prompts for work, learning, and teaching.",
};

describe("skill-learning card value copy", () => {
  it.each([
    ["en", sideProjectCourse, "Learn to create written content, images, and videos through practical AI projects", "Practice AI image, writing, video, and traffic workflows"],
    ["zh", sideProjectCourse, "通过项目练习，用 AI 制作图文和视频内容", "旧的课程简介较长"],
    ["en", promptCourse, "Build reusable prompts for work, learning, and teaching", "Turn common writing, learning, teaching, and office tasks"],
    ["zh", promptCourse, "把工作、学习和教学中的常见任务整理成可复用提示词", "旧的提示词课程简介"],
  ] as const)("uses the dedicated %s value proposition for the course card", (locale, course, expected, oldDescription) => {
    const html = renderToStaticMarkup(<ToolCard locale={locale} tool={course} />);

    expect(html).toContain(expected);
    expect(html).not.toContain(oldDescription);
  });
});
