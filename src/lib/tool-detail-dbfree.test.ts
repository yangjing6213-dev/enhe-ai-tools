import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  toolFindMany: vi.fn(),
  toolFindUnique: vi.fn(),
}));

const navigation = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  permanentRedirect: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: () => undefined })),
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("next/navigation", () => navigation);

vi.mock("@/lib/db", () => ({
  prisma: {
    tool: {
      findMany: db.toolFindMany,
      findUnique: db.toolFindUnique,
    },
  },
}));

const root = join(process.cwd(), "src");

function read(relativePath: string) {
  const path = join(root, relativePath);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

describe("public tool detail DB-free boundary", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("DATABASE_URL", undefined);
    db.toolFindMany.mockResolvedValue([]);
    db.toolFindUnique.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("short-circuits the public tool slug index without DATABASE_URL", async () => {
    const { resolvePublicToolSlug } = await import("@/lib/public-content");

    await expect(resolvePublicToolSlug("db-free-probe")).resolves.toBeNull();
    expect(db.toolFindMany).not.toHaveBeenCalled();
  });

  it("returns an unverified noindex metadata boundary without database access", async () => {
    const { generateToolDetailPageMetadata } = await import(
      "@/app/tools/[slug]/page-shell"
    );
    const metadata = await generateToolDetailPageMetadata(
      "en",
      "db-free-probe",
      "/software",
    );

    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.description).toContain("UNVERIFIED");
    expect(db.toolFindMany).not.toHaveBeenCalled();
    expect(db.toolFindUnique).not.toHaveBeenCalled();
  }, 15_000);

  it.each([
    "/software",
    "/account-services",
    "/skill-learning",
    "/ai-skills",
  ])(
    "keeps a configured missing-tool canonical under %s",
    async (routeBasePath) => {
      vi.stubEnv("DATABASE_URL", "postgresql://configured.invalid/enhe");

      const { generateToolDetailPageMetadata } = await import(
        "@/app/tools/[slug]/page-shell"
      );
      const metadata = await generateToolDetailPageMetadata(
        "en",
        "missing-tool",
        routeBasePath,
      );

      expect(String(metadata.alternates?.canonical)).toContain(
        `/en${routeBasePath}/missing-tool`,
      );
      if (routeBasePath !== "/software") {
        expect(String(metadata.alternates?.canonical)).not.toContain(
          "/en/software/missing-tool",
        );
      }
      expect(db.toolFindMany).toHaveBeenCalledOnce();
      expect(db.toolFindUnique).not.toHaveBeenCalled();
    },
  );

  it("keeps configured published software metadata indexable with a fixture row", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://configured.invalid/enhe");
    db.toolFindMany.mockResolvedValueOnce([
      {
        id: "verified-software",
        slug: "verified-software",
        name: "Verified Software",
        englishName: "Verified Software",
      },
    ]);
    db.toolFindUnique.mockResolvedValueOnce({
      slug: "verified-software",
      name: "Verified Software",
      englishName: "Verified Software",
      shortDescription:
        "A verified software catalog listing for teams managing documented workflows.",
      content:
        "Verified software helps teams organize daily workflows, review tasks, and complete repeatable operations with clear guidance and support.",
      coverImage: null,
      status: "published",
      type: "software",
    });

    const { generateToolDetailPageMetadata } = await import(
      "@/app/tools/[slug]/page-shell"
    );
    const metadata = await generateToolDetailPageMetadata(
      "en",
      "verified-software",
      "/software",
    );

    expect(metadata.title).toContain("Verified Software");
    expect(String(metadata.alternates?.canonical)).toContain(
      "/en/software/verified-software",
    );
    expect(metadata.robots).toBeUndefined();
    expect(db.toolFindMany).toHaveBeenCalledOnce();
    expect(db.toolFindUnique).toHaveBeenCalledOnce();
  });

  it("does not enter the session or tool query path for a DB-free detail route", async () => {
    const { ToolDetailPageShell } = await import(
      "@/app/tools/[slug]/page-shell"
    );

    await expect(
      ToolDetailPageShell({
        slug: "db-free-probe",
        forceLocale: "en",
        expectedType: "software",
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(db.toolFindMany).not.toHaveBeenCalled();
    expect(db.toolFindUnique).not.toHaveBeenCalled();
  });

  it("keeps the explicit guard in the shared detail shell", () => {
    const page = read("app/tools/[slug]/page-shell.tsx");

    expect(page).toContain("if (!process.env.DATABASE_URL?.trim()) notFound();");
  });
});
