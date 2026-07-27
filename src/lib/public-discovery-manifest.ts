export type PublicDiscoveryRoute = {
  path: string;
  lastModified: string;
  indexable?: boolean;
  llmsLabel?: string;
  okfFile?: string;
  okfLabel?: string;
};

export type MachineReadableResource = {
  label: string;
  path: string;
};

export const publicSiteBaseUrl = "https://www.enhe-tech.com.cn";

export const publicDiscoveryRoutes: readonly PublicDiscoveryRoute[] = [
  { path: "/", lastModified: "2026-07-24T00:00:00.000Z", llmsLabel: "ENHE AI home" },
  { path: "/en", lastModified: "2026-07-24T00:00:00.000Z" },
  {
    path: "/about",
    lastModified: "2026-07-23T00:00:00.000Z",
    llmsLabel: "About ENHE AI",
    okfFile: "./enhe-ai-overview.md",
    okfLabel: "ENHE AI overview",
  },
  { path: "/en/about", lastModified: "2026-07-23T00:00:00.000Z" },
  { path: "/ai-topics", lastModified: "2026-06-28T00:00:00.000Z" },
  { path: "/en/ai-topics", lastModified: "2026-06-28T00:00:00.000Z" },
  { path: "/ai-topics/ai-content-creation-tools", lastModified: "2026-06-28T00:00:00.000Z" },
  { path: "/en/ai-topics/ai-content-creation-tools", lastModified: "2026-06-28T00:00:00.000Z" },
  { path: "/ai-topics/local-ai-deployment", lastModified: "2026-06-28T00:00:00.000Z" },
  { path: "/en/ai-topics/local-ai-deployment", lastModified: "2026-06-28T00:00:00.000Z" },
  { path: "/ai-topics/ai-account-service-compliance", lastModified: "2026-06-28T00:00:00.000Z" },
  { path: "/en/ai-topics/ai-account-service-compliance", lastModified: "2026-06-28T00:00:00.000Z" },
  { path: "/ai-topics/ai-skill-learning-path", lastModified: "2026-06-28T00:00:00.000Z" },
  { path: "/en/ai-topics/ai-skill-learning-path", lastModified: "2026-06-28T00:00:00.000Z" },
  { path: "/build-your-own-x", lastModified: "2026-06-28T00:00:00.000Z" },
  { path: "/en/build-your-own-x", lastModified: "2026-06-28T00:00:00.000Z" },
  {
    path: "/software",
    lastModified: "2026-06-17T00:00:00.000Z",
    llmsLabel: "AI software apps",
    okfFile: "./software/index.md",
    okfLabel: "AI software apps",
  },
  { path: "/en/software", lastModified: "2026-06-17T00:00:00.000Z" },
  {
    path: "/account-services",
    lastModified: "2026-06-17T00:00:00.000Z",
    llmsLabel: "AI account service guidance",
    okfFile: "./account-services/index.md",
    okfLabel: "AI account service guidance",
  },
  { path: "/en/account-services", lastModified: "2026-06-17T00:00:00.000Z" },
  {
    path: "/skill-learning",
    lastModified: "2026-06-17T00:00:00.000Z",
    llmsLabel: "AI skill learning",
    okfFile: "./skill-learning/index.md",
    okfLabel: "AI skill courses",
  },
  { path: "/en/skill-learning", lastModified: "2026-06-17T00:00:00.000Z" },
  {
    path: "/skill-learning/ai-prompt-management",
    lastModified: "2026-07-15T00:00:00.000Z",
    llmsLabel: "AI Prompt Management System",
    okfFile: "./ai-prompt-management/index.md",
    okfLabel: "AI Prompt Management System",
  },
  {
    path: "/en/skill-learning/ai-prompt-management",
    lastModified: "2026-07-15T00:00:00.000Z",
    llmsLabel: "English AI Prompt Management System",
  },
  { path: "/product-paths/work-efficiency", lastModified: "2026-07-04T00:00:00.000Z" },
  { path: "/en/product-paths/work-efficiency", lastModified: "2026-07-04T00:00:00.000Z" },
  { path: "/product-paths/media-generation", lastModified: "2026-07-04T00:00:00.000Z" },
  { path: "/en/product-paths/media-generation", lastModified: "2026-07-04T00:00:00.000Z" },
  { path: "/product-paths/future-ai", lastModified: "2026-07-04T00:00:00.000Z", indexable: false },
  { path: "/en/product-paths/future-ai", lastModified: "2026-07-04T00:00:00.000Z", indexable: false },
  { path: "/product-demos", lastModified: "2026-07-01T00:00:00.000Z" },
  { path: "/en/product-demos", lastModified: "2026-07-01T00:00:00.000Z" },
  { path: "/product-demos/windows-ai-video-studio", lastModified: "2026-07-01T00:00:00.000Z" },
  { path: "/en/product-demos/windows-ai-video-studio", lastModified: "2026-07-01T00:00:00.000Z" },
  { path: "/product-demos/ai-video", lastModified: "2026-07-01T00:00:00.000Z" },
  { path: "/en/product-demos/ai-video", lastModified: "2026-07-01T00:00:00.000Z" },
  { path: "/product-demos/windows-ai-lumi", lastModified: "2026-07-01T00:00:00.000Z" },
  { path: "/en/product-demos/windows-ai-lumi", lastModified: "2026-07-01T00:00:00.000Z" },
  { path: "/pricing", lastModified: "2026-06-17T00:00:00.000Z", llmsLabel: "Pricing and purchase notes" },
  { path: "/en/pricing", lastModified: "2026-06-17T00:00:00.000Z" },
  { path: "/tutorials", lastModified: "2026-06-17T00:00:00.000Z", llmsLabel: "AI tutorials", okfLabel: "Tutorials" },
  { path: "/en/tutorials", lastModified: "2026-06-17T00:00:00.000Z" },
  {
    path: "/ai-news",
    lastModified: "2026-06-18T00:00:00.000Z",
    llmsLabel: "AI news",
    okfFile: "./ai-news/index.md",
    okfLabel: "AI news and trend insights",
  },
  { path: "/en/ai-news", lastModified: "2026-06-18T00:00:00.000Z" },
  { path: "/ai-trends", lastModified: "2026-06-19T00:00:00.000Z", llmsLabel: "AI trends", okfLabel: "AI demand trends" },
  { path: "/en/ai-trends", lastModified: "2026-06-19T00:00:00.000Z" },
  { path: "/legal/user-agreement", lastModified: "2026-06-17T00:00:00.000Z" },
  { path: "/en/legal/user-agreement", lastModified: "2026-06-17T00:00:00.000Z" },
  { path: "/legal/privacy-policy", lastModified: "2026-06-17T00:00:00.000Z" },
  { path: "/en/legal/privacy-policy", lastModified: "2026-06-17T00:00:00.000Z" },
  { path: "/legal/membership-refund", lastModified: "2026-06-17T00:00:00.000Z" },
  { path: "/en/legal/membership-refund", lastModified: "2026-06-17T00:00:00.000Z" },
  { path: "/legal/disclaimer", lastModified: "2026-06-17T00:00:00.000Z" },
  { path: "/en/legal/disclaimer", lastModified: "2026-06-17T00:00:00.000Z" },
  { path: "/legal/copyright-complaint", lastModified: "2026-06-17T00:00:00.000Z" },
  { path: "/en/legal/copyright-complaint", lastModified: "2026-06-17T00:00:00.000Z" },
  { path: "/legal/minor-protection", lastModified: "2026-06-17T00:00:00.000Z" },
  { path: "/en/legal/minor-protection", lastModified: "2026-06-17T00:00:00.000Z" },
] as const;

export const machineReadableResources: readonly MachineReadableResource[] = [
  { label: "Pricing reference", path: "/pricing.md" },
  { label: "Open Knowledge Format index", path: "/okf/index.md" },
  { label: "ENHE AI overview", path: "/okf/enhe-ai-overview.md" },
  { label: "AI news concept page", path: "/okf/ai-news/index.md" },
  { label: "AI software concept page", path: "/okf/software/index.md" },
  { label: "AI account service knowledge bundle", path: "/okf/account-services/index.md" },
  { label: "AI skill learning knowledge bundle", path: "/okf/skill-learning/index.md" },
  { label: "AI Prompt Management knowledge bundle", path: "/okf/ai-prompt-management/index.md" },
  { label: "Chinese AI prompt data", path: "/data/ai-prompt-management/zh.json" },
  { label: "English AI prompt data", path: "/data/ai-prompt-management/en.json" },
] as const;

function absolutePublicUrl(path: string) {
  return `${publicSiteBaseUrl}${path === "/" ? "/" : path}`;
}

export function renderLlmsImportantPages() {
  return publicDiscoveryRoutes
    .filter((route) => route.llmsLabel)
    .map((route) => `- [${route.llmsLabel}](${absolutePublicUrl(route.path)})`)
    .join("\n");
}

export function renderLlmsMachineReadableResources() {
  return machineReadableResources
    .map((resource) => `- [${resource.label}](${absolutePublicUrl(resource.path)})`)
    .join("\n");
}

export function renderOkfFiles() {
  return publicDiscoveryRoutes
    .filter((route) => route.okfFile)
    .map((route) => `- [${route.okfLabel ?? route.llmsLabel}](${route.okfFile})`)
    .join("\n");
}

export function renderOkfCanonicalSections() {
  return publicDiscoveryRoutes
    .filter((route) => route.okfLabel)
    .map((route) => `- ${route.okfLabel}: ${absolutePublicUrl(route.path)}`)
    .join("\n");
}
