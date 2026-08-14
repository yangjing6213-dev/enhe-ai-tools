import type { RedesignLocale } from "@/components/redesign/types";

export type SoftwareSectionCopy = {
  heading: string;
  description: string;
};

export type SoftwarePageCopy = {
  label: string;
  h1: string;
  intro: string;
};

export type SoftwareActionCopy = {
  detail: string;
  loadMore: string;
  pageTwo: string;
};

export type SoftwareCopy = {
  page: SoftwarePageCopy;
  sections: {
    newReleases: SoftwareSectionCopy;
    featuredProducts: SoftwareSectionCopy;
    allProducts: SoftwareSectionCopy;
  };
  actions: SoftwareActionCopy;
};

export const SOFTWARE_COPY: Record<RedesignLocale, SoftwareCopy> = {
  zh: {
    page: {
      label: "给人生加一个 AI 外挂",
      h1: "AI工具",
      intro: "按真实任务找到已公开的 ENHE AI 工具、课程和效率入口，再进入对应详情页了解价格与使用边界。",
    },
    sections: {
      newReleases: {
        heading: "新品推荐",
        description: "公开页面中最近呈现的四个工具入口。",
      },
      featuredProducts: {
        heading: "精选产品",
        description: "三项适合对比浏览的代表性公开产品。",
      },
      allProducts: {
        heading: "全部产品",
        description: "按分类浏览十二个已冻结的公开产品与课程入口。",
      },
    },
    actions: {
      detail: "查看详情",
      loadMore: "加载更多",
      pageTwo: "第 2 页",
    },
  },
  en: {
    page: {
      label: "An AI upgrade for everyday life",
      h1: "AI tools",
      intro: "Find public ENHE AI tools, courses, and a free audit by task, then open the matching detail page for price and boundaries.",
    },
    sections: {
      newReleases: {
        heading: "New releases",
        description: "Four entries recently presented in the public catalog.",
      },
      featuredProducts: {
        heading: "Featured products",
        description: "Three public products chosen for side-by-side browsing.",
      },
      allProducts: {
        heading: "All products",
        description: "Browse the full set of twelve frozen public products and course entries.",
      },
    },
    actions: {
      detail: "View details",
      loadMore: "Load more",
      pageTwo: "Page 2",
    },
  },
};
