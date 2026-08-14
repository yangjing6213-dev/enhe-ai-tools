export type RedesignLocale = "zh" | "en";

export type RedesignNavItem = {
  label: string;
  href: string;
  kind?: "link" | "search";
  children?: ReadonlyArray<RedesignNavChild>;
};

export type RedesignNavChild = {
  label: string;
  href: string;
};

export type RedesignAccount =
  | {
      status: "guest";
      loginLabel: string;
      loginHref: string;
    }
  | {
      status: "authenticated";
      displayName: string;
      avatarLabel: string;
      userLabel: string;
      userHref: string;
      isAdmin: boolean;
      adminLabel: string;
      adminHref: string;
    };

export type RedesignFooterLink = {
  label: string;
  href: string;
};

export type RedesignFooterColumn = {
  title: string;
  links: ReadonlyArray<RedesignFooterLink>;
};

export type RedesignFooterCopy = {
  ariaLabel: string;
  brandLine: string;
  brandIntro: ReadonlyArray<string>;
  columns: ReadonlyArray<RedesignFooterColumn>;
  copyright: string;
  filingLabel: string;
};
