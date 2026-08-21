import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  CATEGORY_LAYER_MOTION_VARIANTS,
  resolveCategoryMotionEnterTransform,
  type CategoryLayerMotionCustom,
} from "@/lib/motion/category-layer-motion";
import { resolveMobileNavMotion } from "@/lib/motion/mobile-nav-motion";
import { resolveProductStageMotion } from "@/lib/motion/product-stage-motion";

const projectRoot = process.cwd();
const preMotionBaseline = "ad603985e40f1142e3ddff821e984abc14ebc207";
const finalProductionSource = "ac39487ecec451f2ef9408884fa17f8cffdf9ff3";

const implementationCommits = [
  "5938b2f6da0c50a2dac08ea4d0bf31f367e169f3",
  "6f36cc1403c4a4404ac23cf049e20f3c97a124fd",
  "a7392be8b94e752eb46cd70ac80b54cc4f0fcba3",
  "f895dbee6434eb07ec1414e06997353973b2c1c4",
  "49bbd837edbd5a5d39b13485ad628b477e09490c",
  "ac39487ecec451f2ef9408884fa17f8cffdf9ff3",
] as const;

const productionMotionPaths = [
  "src/components/redesign/enhe-redesign-mobile-menu.tsx",
  "src/components/redesign/home/EnheRedesignProductShowcase.tsx",
  "src/components/redesign/home/EnheRedesignProductStageMotion.module.css",
  "src/components/redesign/software/EnheRedesignSoftwareCategoryMotion.module.css",
  "src/components/redesign/software/EnheRedesignSoftwareCategorySelector.tsx",
  "src/lib/motion/category-layer-motion.ts",
  "src/lib/motion/mobile-nav-motion.ts",
  "src/lib/motion/product-stage-motion.ts",
] as const;

const finalAcceptanceTestPaths = new Set([
  "src/lib/production-motion-final-source.test.ts",
  "tests/e2e/production-motion-final-acceptance.spec.ts",
  "tests/e2e/production-motion-final-performance.spec.ts",
]);

function readProjectFile(relativePath: string) {
  return readFileSync(join(projectRoot, relativePath), "utf8");
}

function gitLines(args: string[]) {
  return execFileSync("git", args, {
    cwd: projectRoot,
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .filter(Boolean);
}

function resolveCategoryVariant(
  variant: unknown,
  custom: CategoryLayerMotionCustom,
) {
  expect(variant).toBeTypeOf("function");
  return (
    variant as (value: CategoryLayerMotionCustom) => {
      opacity: number;
      transform?: string;
      transition: {
        duration: number;
        ease: string | [number, number, number, number];
      };
    }
  )(custom);
}

describe("final production motion source contract", () => {
  it("keeps the six implementation commits in the approved order", () => {
    expect(
      gitLines([
        "rev-list",
        "--reverse",
        `${preMotionBaseline}..${finalProductionSource}`,
      ]),
    ).toEqual(implementationCommits);
  });

  it("limits the combined source range to the approved production, test, and evidence paths", () => {
    const changedPaths = gitLines([
      "diff",
      "--name-only",
      `${preMotionBaseline}..${finalProductionSource}`,
    ]);
    const approvedProduction = new Set<string>(productionMotionPaths);
    const unauthorized = changedPaths.filter(
      (path) =>
        !approvedProduction.has(path) &&
        path !== "src/components/redesign/public-shell-candidate.test.ts" &&
        !path.startsWith("tests/") &&
        !path.startsWith("docs/enhe-redesign/phase-2c3d/"),
    );

    expect(changedPaths).toHaveLength(37);
    expect(unauthorized).toEqual([]);
    expect(changedPaths).not.toEqual(
      expect.arrayContaining([
        "package.json",
        "package-lock.json",
        "src/app/sitemap.ts",
        "src/app/robots.ts",
      ]),
    );
    expect(
      changedPaths.filter(
        (path) => path.startsWith("prisma/") || path.startsWith("src/app/admin/"),
      ),
    ).toEqual([]);
  });

  it("keeps the current D4 commit and worktree delta inside tests and final evidence", () => {
    expect(() =>
      execFileSync(
        "git",
        ["merge-base", "--is-ancestor", finalProductionSource, "HEAD"],
        { cwd: projectRoot, stdio: "ignore" },
      ),
    ).not.toThrow();

    const committedPaths = gitLines([
      "diff",
      "--name-only",
      `${finalProductionSource}..HEAD`,
    ]);
    const worktreePaths = gitLines([
      "status",
      "--porcelain=v1",
      "--untracked-files=all",
    ]).map((line) => {
      const path = line.slice(3);
      return path.includes(" -> ") ? path.split(" -> ").at(-1) ?? path : path;
    });
    const d4Paths = [...new Set([...committedPaths, ...worktreePaths])];
    const unauthorized = d4Paths.filter(
      (path) =>
        !finalAcceptanceTestPaths.has(path) &&
        !path.startsWith("docs/enhe-redesign/phase-2c3d-final/"),
    );

    expect(unauthorized).toEqual([]);
    expect(d4Paths).toEqual(
      expect.arrayContaining([...finalAcceptanceTestPaths]),
    );
  });

  it("locks the category, product-stage, and mobile-navigation motion profiles", () => {
    const categoryComponent = readProjectFile(
      "src/components/redesign/software/EnheRedesignSoftwareCategorySelector.tsx",
    );
    expect(categoryComponent).toMatch(/desktop:\s*190/);
    expect(categoryComponent).toMatch(/mobile:\s*230/);
    expect(categoryComponent).toMatch(/keyboard:\s*100/);
    expect(categoryComponent).toMatch(/reduced:\s*80/);
    expect(resolveCategoryMotionEnterTransform("pointer", false)).toBe(
      "translateY(4px) scale(0.98)",
    );
    expect(resolveCategoryMotionEnterTransform("pointer", true)).toBe(
      "translateY(12px) scale(1)",
    );
    const reducedCategory = resolveCategoryVariant(
      CATEGORY_LAYER_MOTION_VARIANTS.hidden,
      {
        durationMs: 80,
        enterTransform: resolveCategoryMotionEnterTransform("reduced", true),
        profile: "reduced",
      },
    );
    expect(reducedCategory).toEqual({
      opacity: 0,
      transition: { duration: 0.08, ease: "linear" },
    });

    expect(resolveProductStageMotion("pointer", 1)).toEqual({
      durationMs: 240,
      ease: [0.16, 1, 0.3, 1],
      incoming: {
        opacity: [0, 1],
        transform: ["translateX(12px)", "translateX(0)"],
      },
      outgoing: { opacity: 0, transform: "translateX(-12px)" },
    });
    expect(resolveProductStageMotion("keyboard", 1).durationMs).toBe(0);
    expect(resolveProductStageMotion("reduced", -1)).toEqual({
      durationMs: 80,
      ease: "linear",
      incoming: { opacity: [0, 1] },
      outgoing: { opacity: 0 },
    });

    expect(resolveMobileNavMotion("pointer", "open")).toEqual({
      drawer: {
        durationMs: 230,
        ease: [0.16, 1, 0.3, 1],
        transform: ["translateX(100%)", "translateX(0)"],
      },
      overlay: {
        durationMs: 180,
        ease: [0.16, 1, 0.3, 1],
        opacity: [0, 1],
      },
    });
    expect(resolveMobileNavMotion("pointer", "close")).toEqual({
      drawer: {
        durationMs: 190,
        ease: [0.16, 1, 0.3, 1],
        transform: ["translateX(0)", "translateX(100%)"],
      },
      overlay: {
        durationMs: 160,
        ease: [0.16, 1, 0.3, 1],
        opacity: [1, 0],
      },
    });
    for (const phase of ["open", "close"] as const) {
      expect(resolveMobileNavMotion("keyboard", phase).drawer).toMatchObject({
        durationMs: 100,
        ease: "linear",
      });
      expect(resolveMobileNavMotion("reduced", phase).drawer).toMatchObject({
        durationMs: 80,
        ease: "linear",
      });
      expect(resolveMobileNavMotion("keyboard", phase).drawer).not.toHaveProperty(
        "transform",
      );
      expect(resolveMobileNavMotion("reduced", phase).drawer).not.toHaveProperty(
        "transform",
      );
    }
  });

  it("contains no forbidden motion pattern in the approved production motion files", () => {
    const implementation = productionMotionPaths.map(readProjectFile).join("\n");

    expect(implementation).not.toMatch(/transition\s*:\s*all/i);
    expect(implementation).not.toMatch(/scale\(0\)(?!\.)/i);
    expect(implementation).not.toMatch(/will-change/i);
    expect(implementation).not.toMatch(/\bease-in\b/i);
    expect(implementation).not.toMatch(/\b(?:spring|bounce|autoplay)\b/i);
    expect(implementation).not.toMatch(/setInterval\s*\(/);
    expect(implementation).not.toMatch(
      /\b(?:width|height|margin|padding|top|left)\s*:\s*\[/i,
    );
    expect(implementation).not.toContain("redesign-preview/motion");
    expect(implementation).not.toContain("motion-prototype");
  });

  it("keeps prototype routes out of production navigation, sitemap, and robots", () => {
    const productionSurfaces = [
      "src/components/redesign/navigation.ts",
      "src/app/sitemap.ts",
      "src/app/robots.ts",
    ]
      .map(readProjectFile)
      .join("\n");

    expect(productionSurfaces).not.toContain("redesign-preview");
    expect(productionSurfaces).not.toContain("motion-prototype");
  });

  it("preserves the approved support exclusion and stacking contract", () => {
    const shell = readProjectFile("src/styles/redesign/shell.css");
    const tokens = readProjectFile("src/styles/redesign/tokens.css");

    expect(shell).toContain("--support-trigger-icon-size: 44px");
    expect(shell).toContain("--support-exclusion-compact: 52px");
    expect(shell).toContain("--support-exclusion-expanded: 104px");
    expect(shell).toContain("--support-text-mode-min-width: 484px");
    expect(shell).toContain("@media (width < 484px)");
    expect(shell).toMatch(
      /\.redesign-menu-overlay\s*{[\s\S]*?z-index:\s*calc\(var\(--enhe-z-layer\) - 1\)/,
    );
    expect(shell).toMatch(
      /\.redesign-mobile-drawer\s*{[\s\S]*?z-index:\s*var\(--enhe-z-layer\)/,
    );
    expect(shell).toMatch(
      /\.customer-support-widget\s*{[\s\S]*?z-index:\s*10/,
    );
    expect(tokens).toContain("--enhe-z-layer: 40");
  });
});
