import {
  mkdir,
  readdir,
  readFile,
  writeFile
} from "node:fs/promises";
import { basename, join } from "node:path";
import {
  EBOS_EVIDENCE_KINDS,
  type EbosEvidenceEnvelope,
  type EbosEvidenceKind
} from "./evidence-contract";
import {
  createEmptyEvidenceCatalog,
  createEvidenceCatalog,
  createEvidenceCatalogEntry,
  createInvalidEvidenceCatalogEntry
} from "./evidence-catalog";
import type {
  EbosEvidenceCatalog,
  EbosEvidenceCatalogEntry
} from "./evidence-catalog-types";
import { validateEvidenceEnvelope } from "./evidence-validator";

const DEFAULT_EVIDENCE_ROOT = "reports/ebos/evidence";

export type EbosEvidenceFileRef = {
  filePath: string;
  fileName: string;
  evidenceKind: EbosEvidenceKind;
};

export type EbosEvidenceIndexerOptions = {
  rootDir?: string;
  generatedAt?: string | Date;
};

export type EbosEvidenceCatalogWriteOptions = {
  outputDir?: string;
  dateKey?: string;
};

export type EbosEvidenceCatalogWriteResult = {
  datedPath: string;
  latestPath: string;
};

export async function scanEvidenceFiles(
  options: EbosEvidenceIndexerOptions = {}
): Promise<EbosEvidenceFileRef[]> {
  const rootDir = options.rootDir ?? DEFAULT_EVIDENCE_ROOT;
  let entries: Array<{ name: string; isDirectory(): boolean }>;

  try {
    entries = await readdir(rootDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const files: EbosEvidenceFileRef[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name === "catalog") continue;
    if (!isEvidenceKind(entry.name)) continue;

    const kindDir = join(rootDir, entry.name);
    let fileNames: string[];

    try {
      fileNames = await readdir(kindDir);
    } catch {
      continue;
    }

    for (const fileName of fileNames) {
      if (!fileName.endsWith(".json")) continue;

      files.push({
        filePath: normalizePath(join(kindDir, fileName)),
        fileName,
        evidenceKind: entry.name
      });
    }
  }

  return files.sort((a, b) => a.filePath.localeCompare(b.filePath));
}

export async function buildEvidenceCatalog(
  options: EbosEvidenceIndexerOptions = {}
): Promise<EbosEvidenceCatalog> {
  const rootDir = options.rootDir ?? DEFAULT_EVIDENCE_ROOT;
  const files = await scanEvidenceFiles({ rootDir });

  if (files.length === 0) {
    return createEmptyEvidenceCatalog({
      rootDir,
      generatedAt: options.generatedAt
    });
  }

  const entries = await Promise.all(files.map((file) => readEvidenceCatalogEntry(file, options.generatedAt)));

  return createEvidenceCatalog({
    rootDir,
    generatedAt: options.generatedAt,
    entries
  });
}

export { createEvidenceCatalogEntry };

export async function writeEvidenceCatalog(
  catalog: EbosEvidenceCatalog,
  options: EbosEvidenceCatalogWriteOptions = {}
): Promise<EbosEvidenceCatalogWriteResult> {
  const outputDir = options.outputDir ?? join(catalog.rootDir, "catalog");
  const dateKey = options.dateKey ?? catalog.generatedAt.slice(0, 10);
  const datedPath = normalizePath(join(outputDir, `${dateKey}-evidence-catalog.json`));
  const latestPath = normalizePath(join(outputDir, "latest-evidence-catalog.json"));
  const content = `${JSON.stringify(catalog, null, 2)}\n`;

  await mkdir(outputDir, { recursive: true });
  await writeFile(datedPath, content, "utf8");
  await writeFile(latestPath, content, "utf8");

  return { datedPath, latestPath };
}

export async function readEvidenceCatalog(options: {
  catalogPath?: string;
  rootDir?: string;
} = {}): Promise<EbosEvidenceCatalog | null> {
  const catalogPath = options.catalogPath ?? join(
    options.rootDir ?? DEFAULT_EVIDENCE_ROOT,
    "catalog",
    "latest-evidence-catalog.json"
  );

  try {
    return JSON.parse(await readFile(catalogPath, "utf8")) as EbosEvidenceCatalog;
  } catch {
    return null;
  }
}

async function readEvidenceCatalogEntry(
  file: EbosEvidenceFileRef,
  generatedAt: string | Date | undefined
): Promise<EbosEvidenceCatalogEntry> {
  try {
    const envelope = JSON.parse(await readFile(file.filePath, "utf8")) as EbosEvidenceEnvelope<unknown>;
    validateEvidenceEnvelope(envelope);
    return createEvidenceCatalogEntry(file.filePath, envelope);
  } catch (error) {
    return createInvalidEvidenceCatalogEntry({
      filePath: file.filePath,
      evidenceKind: file.evidenceKind,
      generatedAt,
      issue: {
        path: basename(file.filePath),
        code: "parse_error",
        message: error instanceof Error ? error.message : "Failed to read evidence JSON file.",
        severity: "critical"
      }
    });
  }
}

function isEvidenceKind(value: string): value is EbosEvidenceKind {
  return EBOS_EVIDENCE_KINDS.includes(value as EbosEvidenceKind);
}

function normalizePath(filePath: string) {
  return filePath.replace(/\\/g, "/");
}
