export function getAdminToolBasePath(type: "software" | "online" | "skill_learning") {
  if (type === "software") return "/admin/software";
  if (type === "online") return "/admin/online-tools";
  return "/admin/skill-learning";
}

export function getAdminToolEditPath(type: "software" | "online" | "skill_learning", id: string) {
  return `${getAdminToolBasePath(type)}/${id}`;
}

export function getAdminToolNewPath(type: "software" | "online" | "skill_learning") {
  return getAdminToolEditPath(type, "new");
}
