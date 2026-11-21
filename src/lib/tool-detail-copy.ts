import type { Locale } from "@/lib/dictionaries";

export type PublicToolType = "software" | "online" | "skill_learning" | "ai_skill" | "ai_workflow";

export function getToolOverviewHeading(type: PublicToolType, locale: Locale) {
  const copy = {
    zh: {
      software: "工具介绍",
      online: "服务介绍",
      skill_learning: "课程介绍",
      ai_skill: "技能说明",
      ai_workflow: "项目介绍",
    },
    en: {
      software: "Tool Overview",
      online: "Service Overview",
      skill_learning: "Course Overview",
      ai_skill: "Skill Overview",
      ai_workflow: "Project Overview",
    },
  } as const;

  return copy[locale][type];
}

export function getWorkflowDeliveryCopy(locale: Locale) {
  return locale === "en"
    ? {
        originalProject: "View Original Project",
        sourceArchive: "Download Source ZIP — Deployment Required",
        noVerifiedInstaller:
          "No verified installer is provided. Check the upstream repository for setup and deployment requirements.",
        delivery: "Upstream repository and source ZIP; deployment required",
      }
    : {
        originalProject: "查看原项目",
        sourceArchive: "下载上游源码 ZIP（需自行部署）",
        noVerifiedInstaller:
          "未提供已验证安装包；运行方式和部署要求请查看原仓库说明。",
        delivery: "原仓库链接与上游源码 ZIP；需自行部署",
      };
}
