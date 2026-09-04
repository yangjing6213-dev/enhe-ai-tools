import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import type {
  EbosCommandResultsReadResult,
  EbosDeploymentCommandResult,
  EbosManualServerDeploymentResult,
  EbosManualServerDeploymentResultValidation
} from "./deployment-real-execution-types";

export function buildManualServerDeploymentResultExample(): EbosManualServerDeploymentResult {
  return {
    serverCommandsCompleted: false,
    dockerCommandsCompleted: false,
    nginxCommandsCompleted: false,
    deployedAt: null,
    notes: "",
    evidence: []
  };
}

export async function readManualServerDeploymentResult(inputPath: string): Promise<{
  inputPath: string;
  result: EbosManualServerDeploymentResult;
  validation: EbosManualServerDeploymentResultValidation;
}> {
  const input = JSON.parse(await readFile(inputPath, "utf8")) as unknown;
  const validation = validateManualServerDeploymentResult(input);
  if (!validation.valid) {
    throw new Error(`Invalid manual server deployment result: ${validation.blockers.join("; ")}`);
  }

  return {
    inputPath,
    result: input as EbosManualServerDeploymentResult,
    validation
  };
}

export function validateManualServerDeploymentResult(input: unknown): EbosManualServerDeploymentResultValidation {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!input || typeof input !== "object") {
    return {
      valid: false,
      complete: false,
      blockers: ["input must be an object."],
      warnings: []
    };
  }

  const value = input as Partial<EbosManualServerDeploymentResult>;
  if (typeof value.serverCommandsCompleted !== "boolean") blockers.push("serverCommandsCompleted must be boolean.");
  if (typeof value.dockerCommandsCompleted !== "boolean") blockers.push("dockerCommandsCompleted must be boolean.");
  if (typeof value.nginxCommandsCompleted !== "boolean") blockers.push("nginxCommandsCompleted must be boolean.");
  if (typeof value.notes !== "string") blockers.push("notes must be string.");
  if (!Array.isArray(value.evidence) || !value.evidence.every((item) => typeof item === "string")) {
    blockers.push("evidence must be string array.");
  }
  const failures = (value as { failures?: unknown }).failures;
  if (typeof failures !== "undefined" && (!Array.isArray(failures) || !failures.every((item) => typeof item === "string"))) {
    blockers.push("failures must be string array.");
  }
  const normalizedFailures = Array.isArray(failures) && failures.every((item) => typeof item === "string")
    ? failures
    : [];

  if (blockers.length > 0) {
    return {
      valid: false,
      complete: false,
      blockers,
      warnings
    };
  }

  if (!value.serverCommandsCompleted) blockers.push("serverCommandsCompleted is false.");
  if (!value.dockerCommandsCompleted) blockers.push("dockerCommandsCompleted is false.");
  if (!value.nginxCommandsCompleted) blockers.push("nginxCommandsCompleted is false.");
  if (normalizedFailures.length > 0) blockers.push("failures must be empty before transition.");
  if (!value.deployedAt) warnings.push("deployedAt is empty; keep status out of verified until post-launch check.");
  if ((value.evidence ?? []).length === 0) warnings.push("evidence is empty; keep server result conservative.");

  return {
    valid: true,
    complete: value.serverCommandsCompleted === true
      && value.dockerCommandsCompleted === true
      && value.nginxCommandsCompleted === true
      && normalizedFailures.length === 0,
    blockers,
    warnings
  };
}

export async function readCommandResults(options: {
  targetDate: string | Date;
  reportsRoot?: string;
}): Promise<EbosCommandResultsReadResult> {
  const targetDate = toDateKey(options.targetDate);
  const directory = join(
    options.reportsRoot ?? "reports/ebos",
    "deployment",
    "execution",
    "command-results"
  ).replace(/\\/g, "/");
  const result: EbosCommandResultsReadResult = {
    localCommandResults: [],
    serverCommandResults: [],
    dockerCommandResults: [],
    nginxCommandResults: []
  };

  let fileNames: string[] = [];
  try {
    fileNames = await readdir(directory);
  } catch {
    return result;
  }

  for (const fileName of fileNames.filter((name) => name.startsWith(targetDate) && name.endsWith(".json"))) {
    if (fileName.endsWith("-server-deployment-result.example.json")) continue;
    const payload = JSON.parse(await readFile(`${directory}/${fileName}`, "utf8")) as unknown;
    const commandResults = normalizeCommandResults(payload);
    for (const commandResult of commandResults) {
      if (commandResult.environment === "local") result.localCommandResults.push(commandResult);
      if (commandResult.environment === "server") result.serverCommandResults.push(commandResult);
      if (commandResult.environment === "docker") result.dockerCommandResults.push(commandResult);
      if (commandResult.environment === "nginx") result.nginxCommandResults.push(commandResult);
    }
  }

  return result;
}

function normalizeCommandResults(payload: unknown): EbosDeploymentCommandResult[] {
  if (Array.isArray(payload)) return payload.filter(isCommandResult);
  if (!payload || typeof payload !== "object") return [];
  const value = payload as Partial<EbosCommandResultsReadResult>;
  return [
    ...(value.localCommandResults ?? []),
    ...(value.serverCommandResults ?? []),
    ...(value.dockerCommandResults ?? []),
    ...(value.nginxCommandResults ?? [])
  ].filter(isCommandResult);
}

function isCommandResult(value: unknown): value is EbosDeploymentCommandResult {
  return Boolean(value)
    && typeof value === "object"
    && typeof (value as EbosDeploymentCommandResult).command === "string"
    && typeof (value as EbosDeploymentCommandResult).environment === "string"
    && typeof (value as EbosDeploymentCommandResult).status === "string";
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
