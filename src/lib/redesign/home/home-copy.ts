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
    h1: "让 AI 创意，落地为真实成果",
    subtitle: "发现值得使用的 AI 工具、实用方法与行业动态，让工作更高效，让创作更自由。",
    cta: { label: "探索 AI 工具", href: "/software" },
    review: {
      heading: "产品用户评价",
      disclosure: "以下人物与评价内容由 AI 生成，仅作页面展示示意，并非真实用户评价。",
    },
    value: {
      heading: "让每一个普通人，都能借助 AI，创造过去做不到的事。",
      cta: { label: "探索 AI 工具", href: "/software" },
    },
  },
  en: {
    label: "Give your life an AI superpower",
    h1: "Turn AI ideas into real results.",
    subtitle: "Discover practical AI tools, skills, and industry signals to work faster and create with confidence.",
    cta: { label: "Explore AI tools", href: "/en/software" },
    review: {
      heading: "Product user reviews",
      disclosure: "These people and review texts are AI-generated illustrations, not real customer reviews.",
    },
    value: {
      heading: "Let everyone use AI to create what once felt out of reach.",
      cta: { label: "Explore AI tools", href: "/en/software" },
    },
  },
};
