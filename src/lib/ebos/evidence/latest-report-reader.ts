import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import type { EbosWebsiteHealthSnapshot } from "../health";
import type { EbosIntegrationReadinessReport } from "../integrations";
import type { EbosWarning } from "../types";
import type { EbosEvidenceEnvelope, EbosEvidenceKind } from "./evidence-contract";
import { getEvidenceDirectory } from "./evidence-file-naming";
import type {
  EbosEvidenceFileSystem,
  EbosEvidenceReadResult,
  EbosLatestJsonReport
} from "./evidence-types";
import { validateEvidenceEnvelope } from "./evidence-validator";

const nodeFs: EbosEvidenceFileSystem = {
  readdir,
  readFile,
  stat
};

export type FindLatestJsonReportOptions = {
  directory: string;
  suffix: string;
  fs?: EbosEvidenceFileSystem;
};

export type ReadLatestEvidenceOptions = {
  reportsRoot?: string;
  fs?: EbosEvidenceFileSystem;
};

export async function findLatestJsonReport(
  options: FindLatestJsonReportOptions
): Promise<EbosLatestJsonReport | null> {
  const fs = options.fs ?? nodeFs;
  let fileNames: string[];

  try {
    fileNames = await fs.readdir(options.directory);
  } catch {
    return null;
  }

  const reports = await Promise.all(
    fileNames
      .filter((fileName) => fileName.endsWith(options.suffix))
      .map(async (fileName): Promise<EbosLatestJsonReport | null> => {
        const filePath = join(options.directory, fileName).replace(/\\/g, "/");
        try {
          const fileStat = await fs.stat(filePath);
          return {
            filePath,
            fileName,
            dateKey: readDateKey(fileName),
            mtimeMs: fileStat.mtimeMs
          };
        } catch {
          return null;
        }
      })
  );

  return reports
    .filter((report): report is EbosLatestJsonReport => report !== null)
    .sort(compareReports)[0] ?? null;
}

export async function safeReadJsonFile<T = unknown>(options: {
  filePath: string;
  fs?: EbosEvidenceFileSystem;
}): Promise<EbosEvidenceReadResult<T>> {
  const fs = options.fs ?? nodeFs;

  try {
    const content = await fs.readFile(options.filePath, "utf8");
    return {
      filePath: options.filePath,
      data: JSON.parse(content) as T
    };
  } catch (error) {
    return {
      filePath: options.filePath,
      data: null,
      warning: createEvidenceWarning(`Failed to parse JSON evidence file ${options.filePath}: ${error instanceof Error ? error.message : "unknown error"}`)
    };
  }
}

export async function readLatestHealthSnapshot(
  options: ReadLatestEvidenceOptions = {}
): Promise<EbosEvidenceReadResult<EbosWebsiteHealthSnapshot> | null> {
  const reportsRoot = options.reportsRoot ?? "reports/ebos";
  const envelope = await readLatestEvidenceEnvelope("health_snapshot", options);
  if (envelope) {
    if (!envelope.data) {
      return {
        filePath: envelope.filePath,
        data: null,
        warning: envelope.warning
      };
    }

    const payload = normalizeEvidencePayload(envelope.data);
    const snapshot = normalizeHealthSnapshot(getRecordValue(payload, "snapshot") ?? payload);
    return {
      filePath: envelope.filePath,
      data: snapshot,
      warning: envelope.warning ?? (snapshot ? undefined : createEvidenceWarning(`Health evidence envelope ${envelope.filePath} does not contain a valid snapshot.`))
    };
  }

  const latest = await findLatestJsonReport({
    directory: `${reportsRoot}/health`,
    suffix: "-health-snapshot.json",
    fs: options.fs
  });

  if (!latest) return null;

  const result = await safeReadJsonFile<{ snapshot?: unknown }>({
    filePath: latest.filePath,
    fs: options.fs
  });

  if (!result.data) {
    return {
      filePath: latest.filePath,
      data: null,
      warning: result.warning
    };
  }

  const snapshot = normalizeHealthSnapshot(result.data.snapshot ?? result.data);
  if (!snapshot) {
    return {
      filePath: latest.filePath,
      data: null,
      warning: createEvidenceWarning(`Health evidence file ${latest.filePath} does not contain a valid snapshot.`)
    };
  }

  return {
    filePath: latest.filePath,
    data: snapshot
  };
}

export async function readLatestDataSourceReadiness(
  options: ReadLatestEvidenceOptions = {}
): Promise<EbosEvidenceReadResult<EbosIntegrationReadinessReport> | null> {
  const reportsRoot = options.reportsRoot ?? "reports/ebos";
  const envelope = await readLatestEvidenceEnvelope("data_source_readiness", options);
  if (envelope) {
    if (!envelope.data) {
      return {
        filePath: envelope.filePath,
        data: null,
        warning: envelope.warning
      };
    }

    return {
      filePath: envelope.filePath,
      data: normalizeDataSourceReadiness(normalizeEvidencePayload(envelope.data) as EbosIntegrationReadinessReport),
      warning: envelope.warning
    };
  }

  const latest = await findLatestJsonReport({
    directory: `${reportsRoot}/data-sources`,
    suffix: "-data-sources.json",
    fs: options.fs
  });

  if (!latest) return null;

  const result = await safeReadJsonFile<EbosIntegrationReadinessReport>({
    filePath: latest.filePath,
    fs: options.fs
  });

  if (!result.data) {
    return {
      filePath: latest.filePath,
      data: null,
      warning: result.warning
    };
  }

  return {
    filePath: latest.filePath,
    data: normalizeDataSourceReadiness(result.data)
  };
}

export async function readLatestWeeklyReportEvidence(
  options: ReadLatestEvidenceOptions = {}
): Promise<EbosEvidenceReadResult<EbosEvidenceEnvelope<unknown>> | null> {
  return readLatestEvidenceEnvelope("weekly_report", options);
}

async function readLatestEvidenceEnvelope(
  kind: EbosEvidenceKind,
  options: ReadLatestEvidenceOptions
): Promise<EbosEvidenceReadResult<EbosEvidenceEnvelope<unknown>> | null> {
  const reportsRoot = options.reportsRoot ?? "reports/ebos";
  const evidenceDirectory = getEvidenceDirectory(kind).replace(/^reports\/ebos/, reportsRoot);
  const latest = await findLatestJsonReport({
    directory: evidenceDirectory,
    suffix: `-${kind}.json`,
    fs: options.fs
  });

  if (!latest) return null;

  const result = await safeReadJsonFile<EbosEvidenceEnvelope<unknown>>({
    filePath: latest.filePath,
    fs: options.fs
  });

  if (!result.data) {
    return {
      filePath: latest.filePath,
      data: null,
      warning: result.warning
    };
  }

  const validation = validateEvidenceEnvelope(result.data);

  return {
    filePath: latest.filePath,
    data: result.data,
    warning: validation.valid ? undefined : createEvidenceWarning(
      `Evidence envelope ${latest.filePath} has validation issues: ${validation.issues.map((issue) => issue.path).join(", ")}`
    )
  };
}

function compareReports(a: EbosLatestJsonReport, b: EbosLatestJsonReport) {
  if (a.dateKey && b.dateKey && a.dateKey !== b.dateKey) {
    return b.dateKey.localeCompare(a.dateKey);
  }

  if (a.dateKey && !b.dateKey) return -1;
  if (!a.dateKey && b.dateKey) return 1;

  return b.mtimeMs - a.mtimeMs;
}

function readDateKey(fileName: string) {
  return fileName.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
}

function normalizeHealthSnapshot(value: unknown): EbosWebsiteHealthSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const snapshot = value as EbosWebsiteHealthSnapshot;
  if (!Array.isArray(snapshot.commands)) return null;

  return {
    generatedAt: new Date(snapshot.generatedAt),
    commands: snapshot.commands.map((command) => ({
      ...command,
      checkedAt: new Date(command.checkedAt)
    }))
  };
}

function normalizeDataSourceReadiness(report: EbosIntegrationReadinessReport): EbosIntegrationReadinessReport {
  return {
    ...report,
    generatedAt: new Date(report.generatedAt),
    checks: report.checks.map((check) => ({
      ...check,
      checkedAt: new Date(check.checkedAt)
    }))
  };
}

function normalizeEvidencePayload(envelope: EbosEvidenceEnvelope<unknown>) {
  return envelope.payload;
}

function getRecordValue(value: unknown, key: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return (value as Record<string, unknown>)[key];
}

function createEvidenceWarning(message: string): EbosWarning {
  return {
    code: "partial_data",
    severity: "warning",
    message
  };
}
