export const projectTypes = ["workflow", "automation", "agent", "template", "companion", "source_project", "software", "framework", "learning_material", "skill_pack"] as const;
export type SourceProjectType = (typeof projectTypes)[number];

const labels: Record<SourceProjectType, { zh: string; en: string }> = {
  workflow: { zh: "工作流", en: "Workflow" },
  automation: { zh: "自动化工具", en: "Automation tool" },
  agent: { zh: "智能体项目", en: "Agent project" },
  template: { zh: "模板", en: "Template" },
  companion: { zh: "配套工具", en: "Companion tool" },
  source_project: { zh: "源码项目", en: "Source project" },
  software: { zh: "软件", en: "Software" },
  framework: { zh: "开发框架与库", en: "Framework or library" },
  learning_material: { zh: "学习资料", en: "Learning resource" },
  skill_pack: { zh: "技能包", en: "Skill pack" },
};

export function projectTypeLabel(type: string | null | undefined, locale: "zh" | "en") {
  const entry = type && Object.hasOwn(labels, type) ? labels[type as SourceProjectType] : labels.source_project;
  return entry[locale];
}
