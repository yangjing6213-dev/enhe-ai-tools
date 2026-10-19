type AdminToolType = "software" | "online" | "skill_learning" | "ai_skill" | "ai_workflow";

export function getAdminToolBasePath(type: AdminToolType) {
  if (type === "software") return "/admin/software";
  if (type === "online") return "/admin/online-tools";
  if (type === "ai_skill") return "/admin/ai-skills";
  if (type === "ai_workflow") return "/admin/ai-workflows";
  return "/admin/skill-learning";
}

export function getAdminToolEditPath(type: AdminToolType, id: string) {
  return `${getAdminToolBasePath(type)}/${id}`;
}

export function getAdminToolNewPath(type: AdminToolType) {
  return getAdminToolEditPath(type, "new");
}
