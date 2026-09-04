# AI News CMS HTML SEO Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make ENHE AI news HTML imports populate all admin SEO, Chinese summary fields, English fields, tags, sources, and automation-generated metadata.

**Architecture:** Keep the existing database schema. Add a semantic `cms-fields` HTML contract that the shared HTML importer parses into the existing `AiNewsImportPayload`; admin paste/upload import and token automation import already use that shared importer.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, Prisma, Codex automation, local Codex skill files.

---

### Task 1: Parser Contract

**Files:**
- Modify: `src/lib/ai-news-html-import.test.ts`
- Modify: `src/lib/ai-news-html-import.ts`

- [ ] Add a failing Vitest case with a `<section id="cms-fields">` fixture containing Chinese SEO fields, English content fields, video fields, tags, internal relation IDs, and reference links.
- [ ] Run `npm test -- src/lib/ai-news-html-import.test.ts` and confirm the new expectations fail.
- [ ] Implement field extraction by section `id`, `data-field`, and heading labels while preserving no-CSS safety checks.
- [ ] Exclude `cms-fields`, source sections, and table-of-contents sections from article body conversion.
- [ ] Run the targeted Vitest file and confirm it passes.

### Task 2: Skill Contract

**Files:**
- Modify: `C:/Users/HU/.agents/skills/enhe-ai-news-seo/enhe-ai-news-seo/SKILL.md`
- Modify: `C:/Users/HU/.agents/skills/enhe-ai-news-seo/enhe-ai-news-seo/assets/html-template.html`
- Modify: `C:/Users/HU/.agents/skills/enhe-ai-news-seo/enhe-ai-news-seo/scripts/validate_html.py`

- [ ] Document the `cms-fields` section as required for website publishing.
- [ ] Update the HTML template with all admin editor fields needed for SEO.
- [ ] Update the validator to require SEO meta, canonical, `cms-fields`, Chinese/English SEO fields, tags, and source links.
- [ ] Run the validator against a sample HTML file.

### Task 3: Automation And Release

**Files:**
- Inspect: `C:/Users/HU/.codex/automations/enhe-ai/automation.toml`
- Update automation: `enhe-ai`

- [ ] Update the automation prompt to require the new CMS HTML contract and direct published import.
- [ ] Run `npm test -- src/lib/ai-news-html-import.test.ts src/app/api/admin/ai-news/import/route.test.ts scripts/publish-ai-news-html.test.ts`.
- [ ] Run `npm run typecheck`.
- [ ] Commit, push to `hqwzhu/enhe-ai-tools`, and deploy to Tencent Cloud with the existing deployment command.
