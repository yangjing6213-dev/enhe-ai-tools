const homePaths = new Set(["/", "/en"]);

const topLevelParentMap: Record<string, string> = {
  "/account-services": "/",
  "/ai-news": "/",
  "/ai-trends": "/",
  "/ai-trends/daily": "/ai-trends",
  "/login": "/",
  "/online-tools": "/",
  "/pricing": "/",
  "/register": "/",
  "/skill-learning": "/",
  "/software": "/",
  "/tutorials": "/",
  "/user": "/"
};

const adminParentMap: Record<string, string> = {
  "/admin/ai-news/import": "/admin/ai-news",
  "/admin/ai-news/keywords": "/admin/ai-news"
};

type BrowserHistoryContext = {
  currentOrigin: string;
  hasClientHistory: boolean;
  historyLength: number;
  referrer: string;
};

export function shouldUseBrowserHistory({ currentOrigin, hasClientHistory, historyLength, referrer }: BrowserHistoryContext) {
  if (historyLength <= 1) return false;
  if (hasClientHistory) return true;
  if (!referrer) return false;

  try {
    return new URL(referrer).origin === currentOrigin;
  } catch {
    return false;
  }
}

function normalizePathname(pathname: string) {
  const withoutQuery = pathname.split(/[?#]/)[0] ?? "/";
  const normalized = withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
  const trimmed = normalized.replace(/\/+$/, "");
  return trimmed || "/";
}

function splitLocale(pathname: string) {
  const normalized = normalizePathname(pathname);
  if (normalized === "/en") {
    return { localePrefix: "/en", path: "/" };
  }
  if (normalized.startsWith("/en/")) {
    return { localePrefix: "/en", path: normalized.slice(3) || "/" };
  }
  return { localePrefix: "", path: normalized };
}

function withLocale(localePrefix: string, path: string) {
  if (!localePrefix) return path;
  return path === "/" ? localePrefix : `${localePrefix}${path}`;
}

function getAdminParent(path: string) {
  if (path === "/admin") return "/";
  if (adminParentMap[path]) return adminParentMap[path];

  const segments = path.split("/").filter(Boolean);
  if (segments[0] !== "admin" || segments.length <= 1) return null;
  if (segments.length === 2) return "/admin";
  return `/${segments.slice(0, 2).join("/")}`;
}

function getOrderParent(path: string) {
  const segments = path.split("/").filter(Boolean);
  if (segments[0] !== "orders") return null;
  if (segments.length <= 1) return "/user";
  if (segments.length === 2) return "/user";
  return `/${segments.slice(0, -1).join("/")}`;
}

export function shouldShowBackNavigation(pathname: string) {
  return !homePaths.has(normalizePathname(pathname));
}

export function getBackNavigationParentHref(pathname: string) {
  const normalized = normalizePathname(pathname);
  if (homePaths.has(normalized)) return "/";

  const adminParent = getAdminParent(normalized);
  if (adminParent) return adminParent;

  const orderParent = getOrderParent(normalized);
  if (orderParent) return orderParent;

  const { localePrefix, path } = splitLocale(normalized);
  if (path === "/") return "/";
  if (topLevelParentMap[path]) return withLocale(localePrefix, topLevelParentMap[path]);

  const segments = path.split("/").filter(Boolean);
  if (!segments.length) return withLocale(localePrefix, "/");

  if (segments[0] === "ai-news" && segments[1] === "topics") {
    return withLocale(localePrefix, "/ai-news");
  }

  if (segments[0] === "ai-trends" && segments[1] === "daily") {
    return withLocale(localePrefix, "/ai-trends/daily");
  }

  if (segments[0] === "product-paths") {
    return withLocale(localePrefix, "/");
  }

  if (segments[0] === "legal") {
    return withLocale(localePrefix, "/");
  }

  if (segments.length === 1) return withLocale(localePrefix, "/");
  return withLocale(localePrefix, `/${segments.slice(0, -1).join("/")}`);
}
