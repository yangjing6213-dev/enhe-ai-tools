export type SiteBreadcrumb = {
  href: string;
  label: string;
  current: boolean;
};

const sectionLabels: Record<string, { zh: string; en: string }> = {
  about: { zh: "关于我们", en: "About" },
  "account-services": { zh: "AI账号服务", en: "Account services" },
  "ai-news": { zh: "AI资讯", en: "AI News" },
  "ai-skills": { zh: "AI Skills", en: "AI Skills" },
  "ai-topics": { zh: "AI话题", en: "AI Topics" },
  "ai-trends": { zh: "AI趋势", en: "AI Trends" },
  "ai-workflows": { zh: "AI 工作流", en: "AI Workflows" },
  admin: { zh: "后台管理", en: "Admin" },
  "build-your-own-x": { zh: "Build Your Own X", en: "Build Your Own X" },
  forum: { zh: "共创AI论坛", en: "Co-create AI" },
  legal: { zh: "法律信息", en: "Legal" },
  login: { zh: "登录", en: "Log in" },
  "online-tools": { zh: "AI工具", en: "AI Tools" },
  orders: { zh: "订单", en: "Orders" },
  pricing: { zh: "价格", en: "Pricing" },
  "product-demos": { zh: "产品演示", en: "Product demos" },
  "product-paths": { zh: "应用场景", en: "Use cases" },
  register: { zh: "注册", en: "Sign up" },
  search: { zh: "搜索", en: "Search" },
  software: { zh: "AI工具", en: "AI Tools" },
  "skill-learning": { zh: "AI学习", en: "AI Learning" },
  tutorials: { zh: "使用教程", en: "Tutorials" },
  user: { zh: "用户中心", en: "My account" },
  validation: { zh: "验证", en: "Validation" },
};

const adminLabels: Record<string, { zh: string; en: string }> = {
  "ai-news": { zh: "AI资讯", en: "AI News" },
  "ai-skills": { zh: "AI Skills", en: "AI Skills" },
  "ai-workflows": { zh: "AI 工作流", en: "AI Workflows" },
  audit: { zh: "巡检记录", en: "Audits" },
  categories: { zh: "分类", en: "Categories" },
  comments: { zh: "评论", en: "Comments" },
  development: { zh: "开发", en: "Development" },
  faqs: { zh: "常见问题", en: "FAQs" },
  files: { zh: "文件", en: "Files" },
  forum: { zh: "论坛", en: "Forum" },
  "geo-monitoring": { zh: "GEO监测", en: "GEO monitoring" },
  "license-generator": { zh: "授权生成", en: "License generator" },
  manuals: { zh: "手册", en: "Manuals" },
  messages: { zh: "消息", en: "Messages" },
  "online-tools": { zh: "在线工具", en: "Online tools" },
  orders: { zh: "订单", en: "Orders" },
  payments: { zh: "支付审核", en: "Payments" },
  "payment-codes": { zh: "兑换码", en: "Payment codes" },
  "product-demos": { zh: "产品演示", en: "Product demos" },
  refunds: { zh: "退款", en: "Refunds" },
  releases: { zh: "发布", en: "Releases" },
  "seo-audit": { zh: "SEO巡检", en: "SEO audits" },
  "seo-insights": { zh: "SEO洞察", en: "SEO insights" },
  settings: { zh: "设置", en: "Settings" },
  software: { zh: "软件", en: "Software" },
  tags: { zh: "标签", en: "Tags" },
  tutorials: { zh: "教程", en: "Tutorials" },
  users: { zh: "用户", en: "Users" },
};

function normalizePathname(pathname: string) {
  const withoutQuery = pathname.split(/[?#]/)[0] ?? "/";
  const normalized = withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
  return normalized.replace(/\/+$/, "") || "/";
}

function splitLocale(pathname: string) {
  const normalized = normalizePathname(pathname);
  if (normalized === "/en") return { prefix: "/en", path: "/" };
  if (normalized.startsWith("/en/")) return { prefix: "/en", path: normalized.slice(3) || "/" };
  return { prefix: "", path: normalized };
}

function localizedHome(prefix: string, locale: "zh" | "en") {
  return { href: prefix || (locale === "en" ? "/en" : "/"), label: locale === "en" ? "Home" : "首页", current: false };
}

function localizedLabel(segment: string, locale: "zh" | "en", admin = false) {
  const labels = (admin ? adminLabels : sectionLabels)[segment];
  if (labels) return labels[locale];
  if (segment === "topics") return locale === "en" ? "Topics" : "话题";
  if (segment === "daily") return locale === "en" ? "Daily" : "每日趋势";
  if (segment === "page") return locale === "en" ? "Page" : "第";

  const decoded = decodeURIComponent(segment).replace(/[-_]+/g, " ").trim();
  return decoded
    .split(/\s+/)
    .map((word) => word.length <= 3 ? word.toUpperCase() : `${word[0].toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

export function normalizeBreadcrumbTitle(title: string) {
  const normalized = title
    .replace(/\s*[|｜]\s*(?:恩禾\s*)?ENHE\s*AI\s*$/i, "")
    .replace(/\s*[-–—]\s*(?:恩禾\s*)?ENHE\s*AI\s*$/i, "")
    .trim();
  if (/^(?:恩禾\s*)?ENHE\s*AI$/i.test(normalized)) return "";
  return normalized;
}

export function getPageBreadcrumbs(pathname: string, locale: "zh" | "en", pageTitle?: string): SiteBreadcrumb[] {
  const { prefix, path } = splitLocale(pathname);
  if (path === "/") {
    return [{ href: prefix || "/", label: locale === "en" ? "Home" : "首页", current: true }];
  }

  const segments = path.split("/").filter(Boolean);
  const breadcrumbs: SiteBreadcrumb[] = [localizedHome(prefix, locale)];
  const isAdmin = segments[0] === "admin";
  const localizedPrefix = prefix || (locale === "en" ? "/en" : "");
  const routePrefix = isAdmin || segments[0] === "orders" ? prefix : localizedPrefix;

  if (segments[0] === "orders") {
    breadcrumbs.push({ href: `${localizedPrefix}/user`, label: localizedLabel("user", locale), current: false });
  }

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const isLast = index === segments.length - 1;

    if (segment === "page" && index > 0 && segments[0] === "ai-news") {
      const pageNumber = segments[index + 1];
      if (pageNumber) {
        breadcrumbs.push({
          href: `${routePrefix}/ai-news/page/${pageNumber}`,
          label: locale === "en" ? `Page ${pageNumber}` : `第 ${pageNumber} 页`,
          current: true,
        });
        break;
      }
    }

    const hrefPath = `/${segments.slice(0, index + 1).join("/")}`;
    let label = localizedLabel(segment, locale, isAdmin && index > 0);
    if (isAdmin && index === 0) label = localizedLabel("admin", locale);
    const hasStaticLabel = Boolean(
      (isAdmin && adminLabels[segment]) ||
      (!isAdmin && sectionLabels[segment]) ||
      ["daily", "page", "topics"].includes(segment),
    );
    if (isLast && !hasStaticLabel && pageTitle) label = normalizeBreadcrumbTitle(pageTitle) || label;
    breadcrumbs.push({ href: `${routePrefix}${hrefPath}`, label, current: isLast });
  }

  const last = breadcrumbs.at(-1);
  if (last && !last.current) last.current = true;
  return breadcrumbs;
}

function findBreadcrumbLists(value: unknown, matches: unknown[][] = []): unknown[][] {
  if (Array.isArray(value)) {
    for (const item of value) findBreadcrumbLists(item, matches);
    return matches;
  }
  if (!value || typeof value !== "object") return matches;

  const record = value as Record<string, unknown>;
  const type = record["@type"];
  if ((type === "BreadcrumbList" || (Array.isArray(type) && type.includes("BreadcrumbList"))) && Array.isArray(record.itemListElement)) {
    matches.push(record.itemListElement);
  }
  for (const nested of Object.values(record)) findBreadcrumbLists(nested, matches);
  return matches;
}

export function getStructuredBreadcrumbs(
  jsonLdTexts: readonly string[],
  pathname: string,
  currentOrigin: string,
): SiteBreadcrumb[] | null {
  const currentPath = normalizePathname(pathname);
  for (const text of jsonLdTexts) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      continue;
    }

    for (const list of findBreadcrumbLists(parsed)) {
      const items = list
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const item = entry as Record<string, unknown>;
          const name = typeof item.name === "string" ? item.name.trim() : "";
          const rawUrl = typeof item.item === "string" ? item.item : "";
          if (!name || !rawUrl) return null;
          try {
            const url = new URL(rawUrl, currentOrigin);
            if (url.origin !== currentOrigin) return null;
            return { href: `${url.pathname}${url.search}`, label: name, position: Number(item.position) || 0 };
          } catch {
            return null;
          }
        })
        .filter((item): item is { href: string; label: string; position: number } => item !== null)
        .sort((left, right) => left.position - right.position);

      if (!items.length || (items.length < 2 && currentPath !== "/" && currentPath !== "/en")) continue;
      if (normalizePathname(items.at(-1)!.href) !== currentPath) continue;
      return items.map((item, index) => ({ href: item.href, label: item.label, current: index === items.length - 1 }));
    }
  }
  return null;
}
