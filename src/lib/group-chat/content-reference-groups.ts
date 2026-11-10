export type ChatContentReferenceGroupItem = {
  type: "tool" | "news";
  category?: string | null;
};

export type ChatContentReferenceGroup<T extends ChatContentReferenceGroupItem> = {
  key: string;
  label: string;
  items: T[];
};

const labels: Record<string, string> = {
  software: "桌面软件",
  online: "在线服务",
  skill_learning: "技能学习",
  ai_skill: "AI Skill",
  ai_workflow: "AI 工作流",
  news: "AI 资讯",
  product: "产品",
};

const order = ["software", "online", "skill_learning", "ai_skill", "ai_workflow", "news", "product"];

export function groupChatContentReferences<T extends ChatContentReferenceGroupItem>(items: readonly T[]): ChatContentReferenceGroup<T>[] {
  const groups = new Map<string, ChatContentReferenceGroup<T>>();

  for (const item of items) {
    const key = item.type === "news" ? "news" : item.category && labels[item.category] ? item.category : "product";
    const group = groups.get(key) ?? { key, label: labels[key], items: [] };
    group.items.push(item);
    groups.set(key, group);
  }

  return [...groups.values()].sort((left, right) => order.indexOf(left.key) - order.indexOf(right.key));
}
