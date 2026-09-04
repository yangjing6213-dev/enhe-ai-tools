# EBOS Codex Skill Library

## Role

The EBOS Codex Skill Library gives Codex fixed operating methods for ENHE Business OS work. It prevents one-off improvisation when the task is SEO/GEO inspection, product opportunity research, competitor review, landing page conversion, digital product launch planning, weekly execution, monthly strategy, or evidence gap analysis.

## Why Codex Should Not Improvise

Business recommendations are risky when they are generated from memory, incomplete evidence, or unstated assumptions. EBOS skills force Codex to:

- Declare required evidence.
- Mark missing evidence.
- Separate facts from assumptions.
- Produce repeatable outputs.
- Convert only concrete next steps into Codex tasks.
- Preserve safety rules around secrets, migrations, admin UI, and external systems.

## Skill Inventory

- `technical-seo-auditor`: technical SEO audit and SEO task generation.
- `geo-visibility-auditor`: generative engine visibility planning and AI search probe setup tasks.
- `growth-product-manager`: product priority and revenue validation planning.
- `digital-product-researcher`: AI digital product opportunity research.
- `competitor-watch-analyst`: competitor structure, offer, pricing, SEO, and differentiation analysis.
- `landing-page-conversion-auditor`: product page conversion audit and UI task planning.
- `weekly-business-reviewer`: weekly report evidence to weekly execution plan.
- `monthly-strategy-reviewer`: monthly review evidence to next-month strategy and OKRs.
- `ai-digital-product-launcher`: launch package for AI digital products.
- `ebos-evidence-analyst`: Evidence Catalog gap analysis and data source priority.

## Skill Registry Fields

Each registry item includes:

- `id`: stable machine-readable skill id.
- `name`: human-readable name.
- `category`: operating category.
- `description`: purpose and trigger summary.
- `skillPath`: path to the executable skill instructions.
- `primaryUseCases`: situations where the skill applies.
- `requiredEvidenceKinds`: evidence that must be present for high-confidence output.
- `optionalEvidenceKinds`: evidence that improves confidence.
- `outputs`: expected artifacts.
- `riskLevel`: low, medium, or high.
- `owner`: always `codex` for EBOS v1.
- `status`: active.
- `version`: skill contract version.

## Skill Selection Rules

Use `selectEbosSkills(context)` from `src/lib/ebos/skills` for deterministic recommendations.

Common mappings:

- `no_traffic`: `technical-seo-auditor`, `geo-visibility-auditor`.
- `no_revenue`: `growth-product-manager`, `landing-page-conversion-auditor`.
- `product_opportunity`: `digital-product-researcher`, `growth-product-manager`.
- `conversion_problem`: `landing-page-conversion-auditor`.
- `competitor_research`: `competitor-watch-analyst`.
- `weekly_planning`: `weekly-business-reviewer`.
- `monthly_planning`: `monthly-strategy-reviewer`.
- `evidence_gap`: `ebos-evidence-analyst`.

## How To Call In Codex

Start by describing the business problem and available evidence:

```text
Use EBOS skills to diagnose why ENHE has traffic but no revenue.
Available evidence: weekly_report, monthly_review, health_snapshot.
Return selected skills, missing evidence, and next Codex tasks.
```

Then read the selected `SKILL.md` files and follow their checklists.

## Evidence Catalog Usage

Skills should prefer Evidence Catalog entries from `reports/ebos/evidence/**` and the EBOS evidence catalog APIs. If evidence is missing, the skill must report the gap before making strategic claims. Optional evidence may be requested but must not be treated as confirmed.

## External Skill Installation

External skills may be added later only after review. They must not download unknown scripts, execute remote code, read secrets, mutate production systems, or bypass EBOS evidence requirements. External skills should be wrapped by EBOS selection rules before use in recurring operations.

## Safety Rules

- Do not read or print secret values.
- Do not write `.env` content into outputs.
- Do not fabricate traffic, revenue, market, SEO, GEO, or competitor facts.
- Do not modify `/admin/ebos` unless a future stage explicitly asks for UI.
- Do not create Prisma migrations unless a future stage explicitly asks for schema changes.
- Do not convert vague advice into Codex tasks.

## Step 5 SEO/GEO Evidence Usage

Step 5 should use:

- `technical-seo-auditor` for `seo_evidence` generation rules.
- `geo-visibility-auditor` for `geo_evidence` and AI search probe planning.
- `ebos-evidence-analyst` to decide which missing evidence blocks confidence.

The SEO/GEO evidence generators should emit EBOS evidence envelopes and update the catalog instead of creating standalone, incompatible report shapes.
