# EBOS Agent Architecture

## Architecture Principle

EBOS should be an agent-assisted operating system, not an uncontrolled autonomous operator. Agents may inspect, summarize, score, and recommend. They should not publish content, alter payments, edit products, change users, or deploy without an explicit task and verification plan.

## High-Level Flow

1. Orchestrator selects report type and date window.
2. Data adapters collect internal metrics.
3. Inspectors analyze each domain.
4. Recommendation engine ranks opportunities.
5. Report writer produces weekly/monthly artifacts.
6. QA guard checks unsupported claims, missing data, and action quality.
7. Operator reviews and executes selected actions.

## Agent Roles

### EBOS Orchestrator

Responsibilities:

- choose weekly or monthly workflow,
- resolve date windows,
- call domain inspectors,
- combine findings,
- enforce output schema.

Inputs:

- report type,
- date range,
- configured data sources.

Outputs:

- complete EBOS report object.

### Data Integrity Inspector

Responsibilities:

- detect missing or stale data,
- flag low sample sizes,
- validate date windows,
- separate observed data from assumptions.

### Traffic And Funnel Inspector

Responsibilities:

- read analytics events,
- summarize page views and funnel steps,
- classify source/medium behavior,
- identify drop-offs.

### Revenue Inspector

Responsibilities:

- summarize orders, payments, activations, refunds, and review backlogs,
- separate cash movement from operational backlog,
- flag unusual conversion or refund patterns.

### Product Performance Inspector

Responsibilities:

- rank software, account-service, and skill-learning products,
- compare views, usage, downloads, purchases, and revenue,
- identify weak product cards, stale media, missing FAQs, or weak CTAs.

### Content Inspector

Responsibilities:

- review AI news and AI trend briefing performance,
- identify articles that should connect to products or tutorials,
- flag stale or thin content.

### SEO/GEO Inspector

Responsibilities:

- read SEO insights,
- read GEO monitoring reports,
- summarize visibility gaps,
- recommend answer blocks, FAQ/schema, internal links, or topic pages.

### Market Opportunity Inspector

Responsibilities:

- use AI trend briefings and approved external research artifacts,
- translate public demand signals into site-specific actions,
- label confidence and source type.

### Planning Agent

Responsibilities:

- convert findings into next-week actions,
- include owner role, target surface, expected impact, effort, verification, and risk,
- limit plans to the highest-leverage actions.

### Report Writer

Responsibilities:

- produce readable weekly and monthly reports,
- preserve evidence links,
- make assumptions explicit,
- keep recommendations actionable.

### QA Guard

Responsibilities:

- reject fabricated metrics,
- reject recommendations without a target surface,
- reject actions without verification checks,
- flag missing source labels,
- flag unsafe automation.

## Data Boundary

Internal data should be preferred when available. External research should be attached as a sourced snapshot, not silently mixed with internal metrics.

Recommended source labels:

- `observed_internal`
- `derived_internal`
- `manual_external`
- `api_external`
- `agent_research`
- `assumption`

## Storage Boundary

Early EBOS work should generate local artifacts first. Database persistence should wait until the report schema is stable.

Future persistence should store:

- report run metadata,
- section findings,
- source snapshots,
- recommendations,
- status changes after operator review.

## Safety Rules

- EBOS may recommend publishing but must not auto-publish by default.
- EBOS may recommend payment/refund review but must not change payment state.
- EBOS may recommend user/account actions but must not change users.
- EBOS may generate content drafts but must mark them as drafts.
- EBOS may run local analysis scripts but must not deploy production changes without explicit instruction.

