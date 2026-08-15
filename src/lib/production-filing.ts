export type ProductionFiling = {
  icp?: { label: string; href?: string };
  publicSecurity?: { label: string; href?: string };
};

type VerifiedProductionFiling = ProductionFiling & {
  publicSecurityAlt: string;
};

export const PRODUCTION_FILING = {
  zh: {
    icp: {
      label: "闽ICP备2025092404号-2",
      href: "https://beian.miit.gov.cn/",
    },
    publicSecurity: {
      label: "闽公网安备 35030302900035号",
      href: "https://beian.mps.gov.cn/#/query/webSearch?code=35030302900035",
    },
    publicSecurityAlt: "备案图标",
  },
  en: {
    icp: {
      label: "ICP Filing: Min ICP No. 2025092404-2",
      href: "https://beian.miit.gov.cn/",
    },
    publicSecurity: {
      label: "Fujian Public Security Record No. 35030302900035",
      href: "https://beian.mps.gov.cn/#/query/webSearch?code=35030302900035",
    },
    publicSecurityAlt: "Public security filing icon",
  },
} as const satisfies Record<"zh" | "en", VerifiedProductionFiling>;
