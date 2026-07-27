import type { Locale } from "@/lib/dictionaries";

type PricingOfferCopy = {
  name: string;
  description: string;
  category: string;
  delivery: string;
};

export type PricingOfferItem = {
  slug: string;
  path: string;
  price: number;
  type: "software" | "account_service" | "course";
  zh: PricingOfferCopy;
  en: PricingOfferCopy;
};

export const pricingOfferItems: PricingOfferItem[] = [
  {
    slug: "windows-ai",
    path: "/software/windows-ai",
    price: 50,
    type: "software",
    zh: {
      name: "Lumi-OS｜AI情感智能体",
      description:
        "把记忆、工具调用和桌面工作台放在一起，适合想用 AI 辅助整理任务、陪伴创作和推进下一步的用户。",
      category: "AI软件应用",
      delivery: "付款审核后开放下载与使用说明",
    },
    en: {
      name: "Lumi-OS AI companion workspace",
      description:
        "A desktop AI companion workspace for memory, tool use, task support, and private creative workflows.",
      category: "AI software app",
      delivery: "Download and setup notes after payment review",
    },
  },
  {
    slug: "local-ai-voice-generator-for-voiceover-materials",
    path: "/software/local-ai-voice-generator-for-voiceover-materials",
    price: 30,
    type: "software",
    zh: {
      name: "AI语音生成｜本地配音素材工作台",
      description:
        "适合需要旁白、配音和多角色对话素材的创作者，在本地电脑生成可复用的音频素材。",
      category: "AI软件应用",
      delivery: "付款审核后开放下载与使用说明",
    },
    en: {
      name: "Local AI voice generator",
      description:
        "A local voiceover material workspace for narration, dubbing, and reusable dialogue assets.",
      category: "AI software app",
      delivery: "Download and setup notes after payment review",
    },
  },
  {
    slug: "ultimate-edition-ai-video-generation-suite",
    path: "/software/ultimate-edition-ai-video-generation-suite",
    price: 35,
    type: "software",
    zh: {
      name: "AI生成视频应用",
      description:
        "适合想稳定生成视频素材的创作者，在本地电脑完成文生视频、图生视频和素材管理，减少上传敏感素材的顾虑。",
      category: "AI软件应用",
      delivery: "付款审核后开放下载与使用说明",
    },
    en: {
      name: "AI video generation suite",
      description:
        "A local video-generation workflow for creators who need text-to-video, image-to-video, and material management.",
      category: "AI software app",
      delivery: "Download and setup notes after payment review",
    },
  },
  {
    slug: "gmail-google",
    path: "/account-services/gmail-google",
    price: 30.8,
    type: "account_service",
    zh: {
      name: "Gmail 使用与Google生态咨询",
      description:
        "帮助用户了解 Gmail 与 Google 生态的基础使用场景、注意事项、访问路径和服务边界。",
      category: "AI账号服务咨询",
      delivery: "付款审核后开放服务说明与支持入口",
    },
    en: {
      name: "Gmail and Google ecosystem guidance",
      description:
        "Usage guidance for Gmail and Google ecosystem access paths, service boundaries, and practical setup notes.",
      category: "AI account service guidance",
      delivery: "Service notes and support entry after payment review",
    },
  },
  {
    slug: "chatgpt-codex-dalle",
    path: "/account-services/chatgpt-codex-dalle",
    price: 58.8,
    type: "account_service",
    zh: {
      name: "ChatGPT 多功能入口使用咨询",
      description:
        "帮助用户先弄清 ChatGPT、Codex、DALL-E 的能力入口、适合场景、使用边界和注意事项。",
      category: "AI账号服务咨询",
      delivery: "付款审核后开放服务说明与支持入口",
    },
    en: {
      name: "ChatGPT, Codex, and DALL-E guidance",
      description:
        "Guidance for understanding ChatGPT, Codex, and DALL-E access paths, use cases, boundaries, and support scope.",
      category: "AI account service guidance",
      delivery: "Service notes and support entry after payment review",
    },
  },
  {
    slug: "ai-monetization-side-hustle-course",
    path: "/skill-learning/ai-monetization-side-hustle-course",
    price: 0,
    type: "course",
    zh: {
      name: "AI副业实操课｜从工具到项目",
      description:
        "通过项目练习建立从工具使用到实际执行的路径，适合想把 AI 方法落到真实副业任务的用户。",
      category: "AI技能学习",
      delivery: "免费获取课程内容",
    },
    en: {
      name: "Practical AI side project course",
      description:
        "A practical course for turning AI tool use into executable side-project tasks and reusable workflows.",
      category: "AI skill course",
      delivery: "Free course access",
    },
  },
  {
    slug: "high-frequency-ai-prompts-for-work-learning-and-teaching",
    path: "/skill-learning/high-frequency-ai-prompts-for-work-learning-and-teaching",
    price: 0,
    type: "course",
    zh: {
      name: "高频AI提示词｜日常工作学习教学",
      description:
        "把写作、学习、教学和办公任务整理成可复用提示词，适合希望快速提升日常效率的用户。",
      category: "AI技能学习",
      delivery: "免费获取课程内容",
    },
    en: {
      name: "High-frequency AI prompts",
      description:
        "Reusable prompt patterns for writing, learning, teaching, and everyday productivity tasks.",
      category: "AI skill course",
      delivery: "Free course access",
    },
  },
];

export function getPricingOfferItems(locale: Locale) {
  return pricingOfferItems.map((item) => ({
    ...item,
    path: locale === "en" ? `/en${item.path}` : item.path,
    localized: item[locale],
  }));
}
