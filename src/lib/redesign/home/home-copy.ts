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
    exampleLabel: string;
  };
  value: {
    heading: string;
    cta: RedesignHomeCta;
  };
};

export const HOME_COPY: Record<RedesignLocale, RedesignHomeCopy> = {
  zh: {
    label: "给人生加一个 AI 外挂",
    h1: "一站式AI平台",
    subtitle: "发现真正好用的 AI 工具、智能体与实战方法，让工作更快、创作更自由，把每个灵感变成看得见的成果。",
    cta: { label: "开始探索AI", href: "/software" },
    review: { heading: "体验反馈", exampleLabel: "示例体验反馈" },
    value: {
      heading: "让每一个普通人，都能借助 AI，创造过去做不到的事。",
      cta: { label: "探索 AI 工具", href: "/software" },
    },
  },
  en: {
    label: "An AI upgrade for everyday life",
    h1: "The All-in-One AI Platform.",
    subtitle: "Find genuinely useful AI tools, agents, and practical methods to work faster, create more freely, and turn every spark into a visible result.",
    cta: { label: "Start exploring AI", href: "/en/software" },
    review: { heading: "Experience feedback", exampleLabel: "Example experience feedback" },
    value: {
      heading: "Let everyone use AI to create what once felt out of reach.",
      cta: { label: "Explore AI tools", href: "/en/software" },
    },
  },
};
