import type { RedesignLocale } from "@/components/redesign/types";

export type RedesignHomeCta = {
  label: string;
  href: string;
};

export type RedesignHomeCopy = {
  label: string;
  h1: string;
  subtitle: string;
  cta: RedesignHomeCta;
  review: {
    heading: string;
    disclosure: string;
  };
  value: {
    heading: string;
    cta: RedesignHomeCta;
  };
};

export const HOME_COPY: Record<RedesignLocale, RedesignHomeCopy> = {
  zh: {
    label: "给你的人生添加AI外挂",
    h1: "懂你的AI一站式平台，你需要的，都在这里。",
    subtitle: "发现值得使用的 AI 工具、实用方法与行业动态，让工作更高效，让创作更自由。",
    cta: { label: "探索 AI 工具", href: "/software" },
    review: {
      heading: "客户的心得",
      disclosure: "AI 生成示例（非真实用户反馈）",
    },
    value: {
      heading: "让每一个普通人，都能借助 AI，创造过去做不到的事。",
      cta: { label: "探索 AI 工具", href: "/software" },
    },
  },
  en: {
    label: "Give your life an AI superpower",
    h1: "A one-stop AI platform that gets you. Everything you need, all in one place.",
    subtitle: "Discover practical AI tools, skills, and industry signals to work faster and create with confidence.",
    cta: { label: "Explore AI tools", href: "/en/software" },
    review: {
      heading: "Customer stories",
      disclosure: "AI-generated examples (not real customer feedback).",
    },
    value: {
      heading: "Let everyone use AI to create what once felt out of reach.",
      cta: { label: "Explore AI tools", href: "/en/software" },
    },
  },
};
