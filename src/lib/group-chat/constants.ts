export const groupChatCopy = {
  name: "AI搭子群聊",
  maxImageCount: 9,
  maxImageBytes: 10 * 1024 * 1024,
  imageLifetimeMs: 24 * 60 * 60 * 1000,
  imageUploadWindowMs: 10 * 60 * 1000,
  imageUploadLimit: 20,
  pendingImageLimit: 30,
  messageLimitPerMinute: 20,
  searchLimitPerMinute: 30,
} as const;

export function groupChatSiteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === "https:" || url.hostname === "localhost" || url.hostname === "127.0.0.1") return url.origin;
    } catch { /* Fall back to the canonical production origin. */ }
  }
  return "https://www.enhe-tech.com.cn";
}

export const defaultChatEmojis = [
  { id: "default-wave", name: "挥手", value: "👋", category: "表情" },
  { id: "default-like", name: "赞", value: "👍", category: "表情" },
  { id: "default-heart", name: "爱心", value: "❤️", category: "表情" },
  { id: "default-laugh", name: "大笑", value: "😄", category: "表情" },
  { id: "default-thinking", name: "思考", value: "🤔", category: "表情" },
  { id: "default-party", name: "庆祝", value: "🎉", category: "表情" },
  { id: "default-fire", name: "火焰", value: "🔥", category: "表情" },
  { id: "default-check", name: "完成", value: "✅", category: "状态" },
  { id: "default-idea", name: "灵感", value: "💡", category: "状态" },
  { id: "default-pray", name: "感谢", value: "🙏", category: "表情" },
] as const;
