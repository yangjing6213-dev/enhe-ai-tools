import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type {
  EbosServerDeploymentResultInput,
  EbosServerDeploymentResultTemplateWriteResult
} from "./deployment-server-intake-types";

export function buildServerDeploymentResultInputTemplate(options: {
  targetDate: string | Date;
}): EbosServerDeploymentResultInput {
  return {
    inputType: "server_deployment_result_input",
    targetDate: toDateKey(options.targetDate),
    serverCommandsCompleted: false,
    dockerCommandsCompleted: false,
    nginxCommandsCompleted: false,
    deployedAt: null,
    commandSummaries: [],
    failures: [],
    evidence: [],
    notes: ""
  };
}

export async function writeServerDeploymentResultInputTemplate(options: {
  targetDate: string | Date;
  filePath: string;
  force?: boolean;
}): Promise<EbosServerDeploymentResultTemplateWriteResult> {
  const template = buildServerDeploymentResultInputTemplate({ targetDate: options.targetDate });

  if (!options.force && await fileExists(options.filePath)) {
    return {
      filePath: options.filePath,
      written: false,
      template,
      skippedReason: "result input already exists; use --force to overwrite."
    };
  }

  await mkdir(dirname(options.filePath), { recursive: true });
  await writeFile(options.filePath, `${JSON.stringify(template, null, 2)}\n`, "utf8");

  return {
    filePath: options.filePath,
    written: true,
    template
  };
}

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
