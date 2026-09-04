import type {
  EbosCommandHealthResult,
  EbosCommandHealthStatus,
  EbosCommandHealthSummary,
  EbosWebsiteHealthCheckKey
} from "./health-types";

const CHECK_LABELS: Record<EbosWebsiteHealthCheckKey, string> = {
  lint: "Lint",
  typecheck: "Typecheck",
  build: "Build",
  ebos_tests: "EBOS Tests",
  unit_tests: "Unit Tests",
  playwright_smoke: "Playwright Smoke",
  lighthouse: "Lighthouse",
  sitemap: "Sitemap",
  robots: "Robots",
  homepage: "Homepage",
  key_product_pages: "Key Product Pages"
};

export type NormalizeCommandResultInput = {
  exitCode?: number | null;
  skipped?: boolean;
};

export type CreateCommandHealthResultInput = NormalizeCommandResultInput & {
  key: EbosWebsiteHealthCheckKey;
  command: string;
  stdout?: string | null;
  stderr?: string | null;
  durationMs?: number | null;
  checkedAt?: Date;
};

export function normalizeCommandResult(input: NormalizeCommandResultInput): EbosCommandHealthStatus {
  if (input.skipped) return "skipped";
  if (input.exitCode === 0) return "passed";
  if (typeof input.exitCode === "number") return "failed";
  return "unknown";
}

export function createCommandHealthResult(input: CreateCommandHealthResultInput): EbosCommandHealthResult {
  const status = normalizeCommandResult(input);
  const stdoutSummary = summarizeOutput(input.stdout);
  const stderrSummary = summarizeOutput(input.stderr);
  const label = CHECK_LABELS[input.key];
  const exitCode = typeof input.exitCode === "number" ? input.exitCode : null;

  return {
    key: input.key,
    label,
    command: input.command,
    status,
    exitCode,
    stdoutSummary,
    stderrSummary,
    durationMs: input.durationMs ?? null,
    checkedAt: input.checkedAt ?? new Date(),
    summary: buildSummary({
      key: input.key,
      label,
      command: input.command,
      status,
      exitCode,
      stdoutSummary,
      stderrSummary
    })
  };
}

export function summarizeCommandHealthResults(results: EbosCommandHealthResult[]): EbosCommandHealthSummary {
  const failedChecks = results.filter((result) => result.status === "failed");

  return {
    total: results.length,
    passed: countStatus(results, "passed"),
    failed: failedChecks.length,
    skipped: countStatus(results, "skipped"),
    unknown: countStatus(results, "unknown"),
    failureSummary: failedChecks.map((result) => `${result.key}: ${result.summary}`),
    failedChecks
  };
}

function countStatus(results: EbosCommandHealthResult[], status: EbosCommandHealthStatus) {
  return results.filter((result) => result.status === status).length;
}

function summarizeOutput(value?: string | null) {
  if (!value) return "";
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-8)
    .join(" ")
    .slice(0, 600);
}

function buildSummary(input: {
  key: EbosWebsiteHealthCheckKey;
  label: string;
  command: string;
  status: EbosCommandHealthStatus;
  exitCode: number | null;
  stdoutSummary: string;
  stderrSummary: string;
}) {
  if (input.status === "passed") {
    return `${input.label} passed: ${input.command}`;
  }

  if (input.status === "skipped") {
    return `${input.label} skipped: ${input.command}`;
  }

  if (input.status === "failed") {
    const detail = input.stderrSummary || input.stdoutSummary || "no output";
    return `${input.label} failed: ${input.command} exited ${input.exitCode}; ${detail}`;
  }

  return `${input.label} unknown: ${input.command}`;
}
