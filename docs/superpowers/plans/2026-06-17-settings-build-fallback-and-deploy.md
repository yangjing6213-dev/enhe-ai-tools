# Settings Build Fallback And Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the public site buildable and deployable when build-time database access is unavailable by falling back to default site settings, then verify and redeploy the production stack.

**Architecture:** Add a narrow recovery path inside the cached site-settings loader so public layouts can render with default copy and branding when Prisma cannot reach the database during prerender. Lock the behavior with a mocked regression test that proves recoverable database failures resolve to an empty settings map while unexpected failures still surface normally.

**Tech Stack:** Next.js App Router, Prisma, Vitest, PowerShell deploy wrapper, Docker Compose on Tencent Cloud

---

### Task 1: Add a regression test for recoverable settings reads

**Files:**
- Create: `src/lib/settings-db-fallback.test.ts`
- Read: `src/lib/settings.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  findMany: vi.fn()
}));

vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    siteSetting: {
      findMany: db.findMany
    }
  }
}));

describe("settings data access fallback", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns an empty settings map when Prisma cannot reach the database", async () => {
    const error = Object.assign(new Error("Can't reach database server at `db:5432`"), { code: "P1001" });
    db.findMany.mockRejectedValue(error);

    const { getSettingsMap } = await import("@/lib/settings");

    await expect(getSettingsMap()).resolves.toEqual({});
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/settings-db-fallback.test.ts`
Expected: `FAIL` because `getSettingsMap()` still rejects when Prisma cannot reach the database.

### Task 2: Add the recoverable fallback in the cached settings loader

**Files:**
- Modify: `src/lib/settings.ts`
- Test: `src/lib/settings-db-fallback.test.ts`

- [ ] **Step 1: Implement the smallest recoverable-error guard**

```ts
function isRecoverableSettingsReadError(error: unknown) {
  if (!(error instanceof Error)) return false;

  const code = typeof (error as { code?: unknown }).code === "string" ? (error as { code: string }).code : "";
  const message = error.message;

  return (
    code === "P1001" ||
    /Can't reach database server/i.test(message) ||
    /ECONNREFUSED/i.test(message)
  );
}

const getCachedSettingsMap = unstable_cache(
  async () => {
    try {
      const settings = await prisma.siteSetting.findMany();
      return Object.fromEntries(settings.map((setting) => [setting.key, setting.value]));
    } catch (error) {
      if (isRecoverableSettingsReadError(error)) {
        return {};
      }
      throw error;
    }
  },
  ["site-settings"],
  { revalidate: 300, tags: ["site-settings"] }
);
```

- [ ] **Step 2: Expand the regression coverage**

```ts
it("returns the settings map when Prisma responds normally", async () => {
  db.findMany.mockResolvedValue([{ key: "site_name", value: "ENHE" }]);

  const { getSettingsMap } = await import("@/lib/settings");

  await expect(getSettingsMap()).resolves.toEqual({ site_name: "ENHE" });
});

it("rethrows unexpected settings failures", async () => {
  db.findMany.mockRejectedValue(new Error("unexpected"));

  const { getSettingsMap } = await import("@/lib/settings");

  await expect(getSettingsMap()).rejects.toThrow("unexpected");
});
```

- [ ] **Step 3: Run the focused regression test**

Run: `npm test -- src/lib/settings-db-fallback.test.ts`
Expected: `PASS`

### Task 3: Verify the full deployment path and redeploy

**Files:**
- Verify: `src/app/layout.tsx`
- Verify: `scripts/push-and-deploy.ps1`
- Verify: `deploy.sh`

- [ ] **Step 1: Run local verification**

Run:
- `npm run typecheck`
- `npm test`
- `npm run lint`
- `npm run build`

Expected: all commands exit `0`

- [ ] **Step 2: Push and redeploy**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File ".\scripts\push-and-deploy.ps1" -RunBuild -CommitMessage "fix: fall back when build-time settings DB is unavailable"
```

Expected:
- Git commit created if changes are present
- `git push origin main` succeeds
- Remote `deploy.sh` finishes without the Prisma `db:5432` prerender failure

- [ ] **Step 3: Verify production**

Run checks for:
- homepage loads on [www.enhe-tech.com.cn](https://www.enhe-tech.com.cn/)
- health endpoint returns `{"status":"ok"}`
- cursor glow still behaves correctly on desktop
- no broken public navigation after deploy
