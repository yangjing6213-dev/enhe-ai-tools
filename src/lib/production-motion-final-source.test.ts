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
const d4BlockedHead = "dfa5d8b8fe277129934c8d1ec13eda2851d3e970";
const d4rHistoricalHead = "78357d74962276d3036975d2197e9c284eb053b1";

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

const combinedSourceRangePaths = new Set([
  ...productionMotionPaths,
  "src/components/redesign/public-shell-candidate.test.ts",
  "src/components/redesign/software/software-responsive.test.ts",
  "tests/category-motion.test.ts",
  "tests/e2e/category-motion.spec.ts",
  "tests/e2e/mobile-nav-motion.spec.ts",
  "tests/e2e/product-stage-motion.spec.ts",
  "tests/mobile-nav-motion.test.ts",
  "tests/product-stage-motion.test.ts",
  "docs/enhe-redesign/phase-2c3d/00-PHASE-2C3D1-MANIFEST.md",
  "docs/enhe-redesign/phase-2c3d/01-COMPONENT-AND-IMPLEMENTATION.md",
  "docs/enhe-redesign/phase-2c3d/02-VALIDATION-EVIDENCE.md",
  "docs/enhe-redesign/phase-2c3d/03-REVIEW-ANIMATIONS-RESULT.md",
  "docs/enhe-redesign/phase-2c3d/04-FINAL-RECEIPT.md",
  "docs/enhe-redesign/phase-2c3d/05-PHASE-2C3D2-MANIFEST.md",
  "docs/enhe-redesign/phase-2c3d/06-PRODUCT-STAGE-COMPONENT-AND-IMPLEMENTATION.md",
  "docs/enhe-redesign/phase-2c3d/07-PRODUCT-STAGE-VALIDATION-EVIDENCE.md",
  "docs/enhe-redesign/phase-2c3d/08-PRODUCT-STAGE-REVIEW-ANIMATIONS-RESULT.md",
  "docs/enhe-redesign/phase-2c3d/09-PRODUCT-STAGE-FINAL-RECEIPT.md",
  "docs/enhe-redesign/phase-2c3d/10-MOBILE-NAV-IMPLEMENTATION.md",
  "docs/enhe-redesign/phase-2c3d/11-MOBILE-NAV-VALIDATION-EVIDENCE.md",
  "docs/enhe-redesign/phase-2c3d/12-MOBILE-NAV-REVIEW-ANIMATIONS-RESULT.md",
  "docs/enhe-redesign/phase-2c3d/13-MOBILE-NAV-FINAL-RECEIPT.md",
  "docs/enhe-redesign/phase-2c3d/mobile-nav-screenshots/en-mobile-nav-open-320.png",
  "docs/enhe-redesign/phase-2c3d/mobile-nav-screenshots/en-mobile-nav-open-390.png",
  "docs/enhe-redesign/phase-2c3d/mobile-nav-screenshots/en-mobile-nav-support-boundary-484.png",
  "docs/enhe-redesign/phase-2c3d/mobile-nav-screenshots/zh-mobile-nav-open-320.png",
  "docs/enhe-redesign/phase-2c3d/mobile-nav-screenshots/zh-mobile-nav-open-390.png",
  "docs/enhe-redesign/phase-2c3d/mobile-nav-screenshots/zh-mobile-nav-support-boundary-483.png",
  "docs/enhe-redesign/phase-2c3d/mobile-nav-videos/en-directional-drawer-390.webm",
  "docs/enhe-redesign/phase-2c3d/mobile-nav-videos/zh-directional-drawer-390.webm",
]);

const finalAcceptanceTestPaths = new Set([
  "src/lib/production-motion-final-source.test.ts",
  "tests/e2e/production-motion-final-acceptance.spec.ts",
  "tests/e2e/production-motion-final-performance.spec.ts",
]);

const targetedCorrectionProductionPaths = [
  "src/components/redesign/home/EnheRedesignProductShowcase.tsx",
  "src/components/redesign/software/EnheRedesignSoftwareCategorySelector.tsx",
  "src/styles/redesign/shell.css",
] as const;

const targetedCorrectionTestPaths = [
  "src/components/redesign/home/home-products.test.ts",
  "src/lib/production-motion-final-source.test.ts",
  "tests/category-motion.test.ts",
  "tests/e2e/production-motion-final-acceptance.spec.ts",
  "tests/e2e/production-motion-final-performance.spec.ts",
] as const;

const d4rEvidencePaths = [
  "docs/enhe-redesign/phase-2c3d-final-r1/00-PHASE-2C3D4R-MANIFEST.md",
  "docs/enhe-redesign/phase-2c3d-final-r1/01-D4-BLOCKED-EVIDENCE-BASELINE.md",
  "docs/enhe-redesign/phase-2c3d-final-r1/02-HOME-PRODUCT-SSR-ROOT-CAUSE.md",
  "docs/enhe-redesign/phase-2c3d-final-r1/03-HOME-PRODUCT-SSR-CORRECTION.md",
  "docs/enhe-redesign/phase-2c3d-final-r1/04-CATEGORY-SUPPORT-ROOT-CAUSE.md",
  "docs/enhe-redesign/phase-2c3d-final-r1/05-CATEGORY-SUPPORT-CORRECTION.md",
  "docs/enhe-redesign/phase-2c3d-final-r1/06-RED-GREEN-EVIDENCE.md",
  "docs/enhe-redesign/phase-2c3d-final-r1/07-SSR-AND-HYDRATION-EVIDENCE.md",
  "docs/enhe-redesign/phase-2c3d-final-r1/08-CROSS-MODULE-INTERACTION-MATRIX.md",
  "docs/enhe-redesign/phase-2c3d-final-r1/09-FINAL-REVIEW-ANIMATIONS-RESULT.md",
  "docs/enhe-redesign/phase-2c3d-final-r1/10-BRAND-MOTION-COHESION-REVIEW.md",
  "docs/enhe-redesign/phase-2c3d-final-r1/11-FULL-TEST-STABILITY.md",
  "docs/enhe-redesign/phase-2c3d-final-r1/12-BROWSER-AND-VISUAL-ACCEPTANCE.md",
  "docs/enhe-redesign/phase-2c3d-final-r1/13-PERFORMANCE-AND-CLEANUP.md",
  "docs/enhe-redesign/phase-2c3d-final-r1/14-DOCKER-BUILD-AND-STANDALONE.md",
  "docs/enhe-redesign/phase-2c3d-final-r1/15-SOURCE-SCOPE.md",
  "docs/enhe-redesign/phase-2c3d-final-r1/16-ROLLBACK.md",
  "docs/enhe-redesign/phase-2c3d-final-r1/17-PHASE-2C3D-FINAL-READINESS.md",
  "docs/enhe-redesign/phase-2c3d-final-r1/18-COMMAND-LOG.md",
  "docs/enhe-redesign/phase-2c3d-final-r1/19-FINAL-RECEIPT.md",
  "docs/enhe-redesign/phase-2c3d-final-r1/screenshots/en-final-home-nav-390.png",
  "docs/enhe-redesign/phase-2c3d-final-r1/screenshots/en-final-home-product-1440.png",
  "docs/enhe-redesign/phase-2c3d-final-r1/screenshots/en-final-mobile-nav-category-route-390.png",
  "docs/enhe-redesign/phase-2c3d-final-r1/screenshots/en-final-software-category-1440.png",
  "docs/enhe-redesign/phase-2c3d-final-r1/screenshots/en-final-software-category-390.png",
  "docs/enhe-redesign/phase-2c3d-final-r1/screenshots/en-final-support-boundary-484.png",
  "docs/enhe-redesign/phase-2c3d-final-r1/screenshots/zh-final-home-nav-390.png",
  "docs/enhe-redesign/phase-2c3d-final-r1/screenshots/zh-final-home-product-1440.png",
  "docs/enhe-redesign/phase-2c3d-final-r1/screenshots/zh-final-mobile-nav-category-route-390.png",
  "docs/enhe-redesign/phase-2c3d-final-r1/screenshots/zh-final-software-category-1440.png",
  "docs/enhe-redesign/phase-2c3d-final-r1/screenshots/zh-final-software-category-390.png",
  "docs/enhe-redesign/phase-2c3d-final-r1/screenshots/zh-final-support-boundary-483.png",
  "docs/enhe-redesign/phase-2c3d-final-r1/videos/en-final-home-product-and-nav-390.webm",
  "docs/enhe-redesign/phase-2c3d-final-r1/videos/en-final-software-category-and-nav-390.webm",
  "docs/enhe-redesign/phase-2c3d-final-r1/videos/zh-final-home-product-and-nav-390.webm",
  "docs/enhe-redesign/phase-2c3d-final-r1/videos/zh-final-software-category-and-nav-390.webm",
] as const;

const historicalD4EvidencePaths = new Set([
  "docs/enhe-redesign/phase-2c3d-final/00-PHASE-2C3D4-MANIFEST.md",
  "docs/enhe-redesign/phase-2c3d-final/01-FINAL-MOTION-CONTRACT-MATRIX.md",
  "docs/enhe-redesign/phase-2c3d-final/02-COMBINED-SOURCE-SCOPE.md",
  "docs/enhe-redesign/phase-2c3d-final/03-STATIC-MOTION-QUALITY-AUDIT.md",
  "docs/enhe-redesign/phase-2c3d-final/04-SSR-AND-PROTOTYPE-ISOLATION.md",
  "docs/enhe-redesign/phase-2c3d-final/05-CROSS-MODULE-INTERACTION-MATRIX.md",
  "docs/enhe-redesign/phase-2c3d-final/06-ACCESSIBILITY-AND-REDUCED-MOTION.md",
  "docs/enhe-redesign/phase-2c3d-final/07-PERFORMANCE-AND-RESPONSIVE-EVIDENCE.md",
  "docs/enhe-redesign/phase-2c3d-final/08-BRAND-MOTION-COHESION-REVIEW.md",
  "docs/enhe-redesign/phase-2c3d-final/09-FINAL-REVIEW-ANIMATIONS-RESULT.md",
  "docs/enhe-redesign/phase-2c3d-final/10-FINAL-TEST-STABILITY.md",
  "docs/enhe-redesign/phase-2c3d-final/11-BROWSER-AND-VISUAL-ACCEPTANCE.md",
  "docs/enhe-redesign/phase-2c3d-final/12-DOCKER-BUILD-AND-STANDALONE.md",
  "docs/enhe-redesign/phase-2c3d-final/13-SOURCE-SCOPE.md",
  "docs/enhe-redesign/phase-2c3d-final/14-ROLLBACK.md",
  "docs/enhe-redesign/phase-2c3d-final/15-PHASE-2C3D-FINAL-READINESS.md",
  "docs/enhe-redesign/phase-2c3d-final/16-COMMAND-LOG.md",
  "docs/enhe-redesign/phase-2c3d-final/17-FINAL-RECEIPT.md",
  "docs/enhe-redesign/phase-2c3d-final-r1/00-PHASE-2C3D4R-MANIFEST.md",
  "docs/enhe-redesign/phase-2c3d-final-r1/01-D4-BLOCKED-EVIDENCE-BASELINE.md",
  "docs/enhe-redesign/phase-2c3d-final-r1/02-HOME-PRODUCT-SSR-ROOT-CAUSE.md",
  "docs/enhe-redesign/phase-2c3d-final-r1/03-HOME-PRODUCT-SSR-CORRECTION.md",
  "docs/enhe-redesign/phase-2c3d-final-r1/04-CATEGORY-SUPPORT-ROOT-CAUSE.md",
  "docs/enhe-redesign/phase-2c3d-final-r1/05-CATEGORY-SUPPORT-CORRECTION.md",
  "docs/enhe-redesign/phase-2c3d-final-r1/06-RED-GREEN-EVIDENCE.md",
  "docs/enhe-redesign/phase-2c3d-final-r1/07-SSR-AND-HYDRATION-EVIDENCE.md",
  "docs/enhe-redesign/phase-2c3d-final-r1/08-CROSS-MODULE-INTERACTION-MATRIX.md",
  "docs/enhe-redesign/phase-2c3d-final-r1/09-FINAL-REVIEW-ANIMATIONS-RESULT.md",
  "docs/enhe-redesign/phase-2c3d-final-r1/10-BRAND-MOTION-COHESION-REVIEW.md",
  "docs/enhe-redesign/phase-2c3d-final-r1/11-FULL-TEST-STABILITY.md",
  "docs/enhe-redesign/phase-2c3d-final-r1/12-BROWSER-AND-VISUAL-ACCEPTANCE.md",
  "docs/enhe-redesign/phase-2c3d-final-r1/13-PERFORMANCE-AND-CLEANUP.md",
  "docs/enhe-redesign/phase-2c3d-final-r1/14-DOCKER-BUILD-AND-STANDALONE.md",
  "docs/enhe-redesign/phase-2c3d-final-r1/15-SOURCE-SCOPE.md",
  "docs/enhe-redesign/phase-2c3d-final-r1/16-ROLLBACK.md",
  "docs/enhe-redesign/phase-2c3d-final-r1/17-PHASE-2C3D-FINAL-READINESS.md",
  "docs/enhe-redesign/phase-2c3d-final-r1/18-COMMAND-LOG.md",
  "docs/enhe-redesign/phase-2c3d-final-r1/19-FINAL-RECEIPT.md",
  "docs/enhe-redesign/phase-2c3d-final-r1/screenshots/en-final-home-nav-390.png",
  "docs/enhe-redesign/phase-2c3d-final-r1/screenshots/en-final-home-product-1440.png",
  "docs/enhe-redesign/phase-2c3d-final-r1/screenshots/en-final-mobile-nav-category-route-390.png",
  "docs/enhe-redesign/phase-2c3d-final-r1/screenshots/en-final-software-category-1440.png",
  "docs/enhe-redesign/phase-2c3d-final-r1/screenshots/en-final-software-category-390.png",
  "docs/enhe-redesign/phase-2c3d-final-r1/screenshots/en-final-support-boundary-484.png",
  "docs/enhe-redesign/phase-2c3d-final-r1/screenshots/zh-final-home-nav-390.png",
  "docs/enhe-redesign/phase-2c3d-final-r1/screenshots/zh-final-home-product-1440.png",
  "docs/enhe-redesign/phase-2c3d-final-r1/screenshots/zh-final-mobile-nav-category-route-390.png",
  "docs/enhe-redesign/phase-2c3d-final-r1/screenshots/zh-final-software-category-1440.png",
  "docs/enhe-redesign/phase-2c3d-final-r1/screenshots/zh-final-software-category-390.png",
  "docs/enhe-redesign/phase-2c3d-final-r1/screenshots/zh-final-support-boundary-483.png",
  "docs/enhe-redesign/phase-2c3d-final-r1/videos/en-final-home-product-and-nav-390.webm",
  "docs/enhe-redesign/phase-2c3d-final-r1/videos/en-final-software-category-and-nav-390.webm",
  "docs/enhe-redesign/phase-2c3d-final-r1/videos/zh-final-home-product-and-nav-390.webm",
  "docs/enhe-redesign/phase-2c3d-final-r1/videos/zh-final-software-category-and-nav-390.webm",
]);

const recoveryBatchPaths = new Set([
  "playwright.config.ts",
  ".ulpi/design/DESIGN.md",
  ".ulpi/design/ai-news.md",
  ".ulpi/design/public-shell.md",
  ".ulpi/design/software.md",
  "docs/exec-plans/MASTER_BACKLOG.md",
  "docs/exec-plans/active/enhe-ai-news-bilingual-landmarks.md",
  "docs/exec-plans/active/enhe-ai-news-claim-wrapping.md",
  "docs/exec-plans/active/enhe-ai-news-dbfree-metadata-copy.md",
  "docs/exec-plans/active/enhe-ai-news-dbfree-topic-copy.md",
  "docs/exec-plans/active/enhe-ai-news-detail-configured-metadata.md",
  "docs/exec-plans/active/enhe-ai-news-detail-dbfree-route-metadata.md",
  "docs/exec-plans/active/enhe-ai-news-detail-metadata-null-fallback.md",
  "docs/exec-plans/active/enhe-ai-news-editorial-surface.md",
  "docs/exec-plans/active/enhe-ai-news-filter-landmarks.md",
  "docs/exec-plans/active/enhe-ai-news-filter-locale-preservation.md",
  "docs/exec-plans/active/enhe-ai-news-focus-boundary.md",
  "docs/exec-plans/active/enhe-ai-news-long-claim-proof.md",
  "docs/exec-plans/active/enhe-ai-news-long-token-wrapping.md",
  "docs/exec-plans/active/enhe-ai-news-runtime-isolation.md",
  "docs/exec-plans/active/enhe-ai-news-skip-link-runtime.md",
  "docs/exec-plans/active/enhe-ai-news-topic-dbfree-seo-schema.md",
  "docs/exec-plans/active/enhe-ai-news-topic-runtime-isolation.md",
  "docs/exec-plans/active/enhe-ai-news-topic-schema-assertion-hardening.md",
  "docs/exec-plans/active/enhe-ai-news-zoom-forced-colors.md",
  "docs/exec-plans/active/enhe-current-head-control-plane-alignment.md",
  "docs/exec-plans/active/enhe-current-head-full-suite-reconciliation.md",
  "docs/exec-plans/active/enhe-local-release-candidate-prep.md",
  "docs/exec-plans/active/enhe-vitest-dbfree-parallel-stability.md",
  "docs/exec-plans/active/enhe-public-shell-deep-route-locale.md",
  "docs/exec-plans/active/enhe-public-shell-accessibility-verification.md",
  "docs/exec-plans/active/enhe-public-shell-menu-target.md",
  "docs/exec-plans/active/enhe-software-filter-target.md",
  "docs/exec-plans/active/enhe-software-card-action-target.md",
  "docs/exec-plans/active/enhe-software-card-title-wrap.md",
  "docs/exec-plans/active/enhe-software-category-sheet-containment.md",
  "docs/exec-plans/active/enhe-software-zoom-boundary.md",
  "docs/exec-plans/active/enhe-software-focus-guard.md",
  "src/components/redesign/software/EnheRedesignSoftwareCategoryMotion.module.css",
  "docs/exec-plans/active/enhe-software-configured-type-contract.md",
  "docs/exec-plans/active/enhe-software-dbfree-state-design.md",
  "docs/exec-plans/active/enhe-software-catalog-dbfree-verification.md",
  "docs/handoffs/ENHE-CODEX-ACCOUNT-HANDOFF-2026-09-21-v2.md",
  "docs/handoffs/ENHE-CODEX-ACCOUNT-HANDOFF-2026-09-21.md",
  "docs/handoffs/ENHE-CODEX-ACCOUNT-HANDOFF-INSTRUCTION-2026-09-21-v2.md",
  "docs/handoffs/ENHE-LOCAL-AUDIT-CONTENT-FIXTURE-DISCOVERY-2026-09-24.md",
  "docs/handoffs/ENHE-LOCAL-BATCH-CONFIGURED-DETAIL-FIXTURE-2026-09-24.md",
  "docs/handoffs/ENHE-LOCAL-BATCH-PUBLIC-SHELL-A11Y-2026-09-24.md",
  "docs/handoffs/ENHE-LOCAL-BATCH-SOFTWARE-CATALOG-DBFREE-2026-09-24.md",
  "docs/handoffs/ENHE-LOCAL-BATCH-SOFTWARE-CONFIGURED-TYPE-2026-09-24.md",
  "docs/handoffs/ENHE-LOCAL-BATCH-SOFTWARE-DBFREE-STATE-DESIGN-2026-09-24.md",
  "docs/handoffs/ENHE-LOCAL-BATCH-TOOL-DETAIL-DBFREE-2026-09-24.md",
  "docs/handoffs/ENHE-LOCAL-CONSOLIDATION-GATE-2026-09-25.md",
  "docs/superpowers/plans/2026-09-24-enhe-recovery-acceleration.md",
  "src/app/(zh-public)/layout.tsx",
  "src/app/ai-news/page-shell.tsx",
  "src/app/ai-news/[slug]/page-shell.tsx",
  "src/app/ai-news/topics/[slug]/page-shell.tsx",
  "src/app/en/layout.tsx",
  "src/app/(zh-public)/ai-news/page.tsx",
  "src/app/en/ai-news/page.tsx",
  "src/lib/ai-news.test.ts",
  "src/lib/ai-news.ts",
  "src/lib/dictionaries.ts",
  "src/lib/ai-news-editorial-token-boundary.test.ts",
  "src/lib/ai-news-topic-editorial-token-boundary.test.ts",
  "src/lib/ai-news-dbfree-metadata.test.ts",
  "src/lib/ai-news-detail-configured.test.ts",
  "src/lib/ai-news-topic-dbfree-module.test.ts",
  "src/lib/ai-news-detail-dbfree.test.ts",
  "src/lib/ai-news-detail-dbfree-module.test.ts",
  "src/lib/public-a11y-smoke-source.test.ts",
  "src/lib/release-workflow-source.test.ts",
  "src/lib/prisma-client-lazy.test.ts",
  "src/lib/public-navigation-search-source.test.ts",
  "src/lib/public-content-canonical-slugs.test.ts",
  "src/lib/redesign/software/software-production-query.test.ts",
  "src/lib/seo-indexing-followup.test.ts",
  "src/lib/search-platform-indexing-remediation.test.ts",
  "src/lib/e1-nb-r20-software-catalog-preview.test.tsx",
  "src/components/redesign/enhe-production-public-shell.tsx",
  "src/components/redesign/enhe-redesign-header.tsx",
  "src/components/redesign/enhe-redesign-mobile-menu.tsx",
  "src/components/redesign/public-shell-candidate.test.ts",
  "src/components/redesign/software/software-responsive.test.ts",
  "src/lib/public-content.ts",
  "src/lib/db.ts",
  "src/lib/redesign/software/software-production.ts",
  "src/lib/redesign/software/software-production.test.ts",
  "src/app/software/page-shell.tsx",
  "src/app/software/page-shell.test.tsx",
  "src/app/software/software-production-wiring.test.tsx",
  "src/app/tools/[slug]/page-shell.tsx",
  "src/app/(zh-public)/software/[slug]/page.tsx",
  "src/app/en/software/[slug]/page.tsx",
  "src/app/(zh-public)/account-services/[slug]/page.tsx",
  "src/app/en/account-services/[slug]/page.tsx",
  "src/app/(zh-public)/skill-learning/[slug]/page.tsx",
  "src/app/en/skill-learning/[slug]/page.tsx",
  "src/app/(zh-public)/ai-skills/[slug]/page.tsx",
  "src/app/en/ai-skills/[slug]/page.tsx",
  "src/lib/tool-detail-dbfree.test.ts",
  "src/components/redesign/software/EnheRedesignSoftwareCatalog.tsx",
  "src/components/redesign/software/EnheRedesignSoftwareCard.tsx",
  "src/styles/redesign/software.css",
  "src/styles/redesign/ai-news.css",
  "src/app/account-services/page-shell.tsx",
  "src/app/ai-skills/page-shell.tsx",
  "src/app/ai-trends/page-shell.tsx",
  "src/app/ai-trends/daily/page-shell.tsx",
  "src/app/online-tools/page-shell.tsx",
  "src/app/product-demos/page-shell.tsx",
  "src/app/product-paths/[slug]/page-shell.tsx",
  "src/app/skill-learning/page-shell.tsx",
  "src/app/tutorials/page-shell.tsx",
  "src/lib/contentless-listing-shell.test.tsx",
  "docs/exec-plans/active/enhe-contentless-public-shell.md",
  "src/components/redesign/contentless-state.test.tsx",
  "src/components/redesign/contentless-state.tsx",
  "tests/e2e/contentless-public-shell.spec.ts",
  "tests/e2e/ai-news-editorial.spec.ts",
  "tests/e2e/ai-news-topic-editorial.spec.ts",
  "tests/e2e/ai-news-detail-dbfree.spec.ts",
  "tests/e2e/ai-news-filter-locale-preservation.spec.ts",
  "tests/e2e/ai-news-zoom-forced-colors.spec.ts",
  "tests/e2e/public-shell-deep-route-locale.spec.ts",
  "tests/e2e/tool-detail-dbfree.spec.ts",
  "tests/e2e/public-shell-accessibility.spec.ts",
  "tests/e2e/software-catalog-dbfree.spec.ts",
  "tests/e2e/software-catalog-preview.spec.ts",
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
    const unauthorized = changedPaths.filter(
      (path) => !combinedSourceRangePaths.has(path),
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

  it("keeps the historical D4 blocked commits inside tests and final evidence", () => {
    expect(() =>
      execFileSync(
        "git",
        ["merge-base", "--is-ancestor", d4BlockedHead, "HEAD"],
        { cwd: projectRoot, stdio: "ignore" },
      ),
    ).not.toThrow();

    const d4Paths = gitLines([
      "diff",
      "--name-only",
      `${finalProductionSource}..${d4BlockedHead}`,
    ]);
    const unauthorized = d4Paths.filter(
      (path) =>
        !finalAcceptanceTestPaths.has(path) &&
        !historicalD4EvidencePaths.has(path),
    );

    expect(unauthorized).toEqual([]);
    expect(d4Paths).toEqual(
      expect.arrayContaining([...finalAcceptanceTestPaths]),
    );
  });

  it("limits the immutable D4R commit range to its production, test, and evidence paths", () => {
    expect(() =>
      execFileSync(
        "git",
        ["merge-base", "--is-ancestor", d4rHistoricalHead, "HEAD"],
        { cwd: projectRoot, stdio: "ignore" },
      ),
    ).not.toThrow();

    const d4rPaths = gitLines([
      "diff",
      "--name-only",
      `${d4BlockedHead}..${d4rHistoricalHead}`,
    ]);
    const approvedPaths = [
      ...targetedCorrectionProductionPaths,
      ...targetedCorrectionTestPaths,
      ...d4rEvidencePaths,
    ].sort();
    const changedProductionPaths = d4rPaths
      .filter((path) =>
        targetedCorrectionProductionPaths.includes(
          path as (typeof targetedCorrectionProductionPaths)[number],
        ),
      )
      .sort();

    expect(d4rPaths).toEqual(approvedPaths);
    expect(changedProductionPaths).toEqual(
      [...targetedCorrectionProductionPaths].sort(),
    );
    expect(changedProductionPaths.length).toBeLessThanOrEqual(6);
    expect(d4rPaths).not.toEqual(
      expect.arrayContaining([
        "package.json",
        "package-lock.json",
        "src/app/sitemap.ts",
        "src/app/robots.ts",
        "src/components/redesign/enhe-redesign-mobile-menu.tsx",
        "src/lib/motion/category-layer-motion.ts",
        "src/lib/motion/mobile-nav-motion.ts",
        "src/lib/motion/product-stage-motion.ts",
      ]),
    );
    expect(
      d4rPaths.filter(
        (path) => path.startsWith("prisma/") || path.startsWith("src/app/admin/"),
      ),
    ).toEqual([]);
  });

  it("limits recovery-batch sensitive paths to the explicit local DB-free boundary", () => {
    const sensitivePaths = [...recoveryBatchPaths].filter(
      (path) =>
        path === "package.json" ||
        path === "package-lock.json" ||
        path === "src/app/sitemap.ts" ||
        path === "src/app/robots.ts" ||
        path === "src/lib/db.ts" ||
        path === ".env" ||
        path.startsWith(".env.") ||
        path.startsWith("scripts/push-and-deploy") ||
        path.startsWith("deploy/") ||
        path.startsWith("prisma/") ||
        path.startsWith("src/app/admin/"),
    );

    expect(sensitivePaths).toEqual(["src/lib/db.ts"]);
    expect(readProjectFile("src/lib/db.ts")).toMatch(/function getPrismaClient\(/);
    expect(readProjectFile("src/lib/db.ts")).toMatch(/new Proxy\(/);
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
    expect(implementation).not.toMatch(/\b(?:spring|bounce)\b/i);
    // Autoplay is now approved only for the homepage product showcase.
    const otherMotion = productionMotionPaths
      .filter((path) => !path.endsWith("EnheRedesignProductShowcase.tsx"))
      .map(readProjectFile).join("\n");
    expect(otherMotion).not.toMatch(/\bautoplay\b/i);
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
    const category = readProjectFile(
      "src/components/redesign/software/EnheRedesignSoftwareCategorySelector.tsx",
    );
    const shell = readProjectFile("src/styles/redesign/shell.css");
    const tokens = readProjectFile("src/styles/redesign/tokens.css");

    expect(category).toContain(
      'data-layer-rendered={layerRendered ? "true" : "false"}',
    );
    expect(shell).toContain("--support-trigger-icon-size: 44px");
    expect(shell).toContain("--support-exclusion-compact: 52px");
    expect(shell).toContain("--support-exclusion-expanded: 52px");
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
    expect(shell).toMatch(
      /@media \(width < 768px\)[\s\S]*?\.enhe-redesign-production:has\(\s*\.redesign-software-category-layer\[data-layer-rendered="true"\]\s*\)\s*\.customer-support-widget\[data-support-open="false"\]\s*{[^}]*display:\s*none[^}]*}/,
    );
    expect(tokens).toContain("--enhe-z-layer: 40");
  });
});
