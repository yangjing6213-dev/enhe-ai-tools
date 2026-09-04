import type {
  EbosServerDeploymentResultInput,
  EbosServerDeploymentResultValidation
} from "./deployment-server-intake-types";

export function validateServerDeploymentResultInput(input: unknown): EbosServerDeploymentResultValidation {
  const missingFields: string[] = [];
  const warnings: string[] = [];
  const blockers: string[] = [];

  if (!input || typeof input !== "object") {
    return {
      valid: false,
      canTransitionToDeployedPendingVerification: false,
      missingFields: ["input"],
      warnings: [],
      blockers: ["input must be an object."]
    };
  }

  const value = input as Partial<EbosServerDeploymentResultInput>;
  requireStringLiteral(value.inputType, "server_deployment_result_input", "inputType", missingFields, blockers);
  requireString(value.targetDate, "targetDate", missingFields, blockers);
  requireBoolean(value.serverCommandsCompleted, "serverCommandsCompleted", missingFields, blockers);
  requireBoolean(value.dockerCommandsCompleted, "dockerCommandsCompleted", missingFields, blockers);
  requireBoolean(value.nginxCommandsCompleted, "nginxCommandsCompleted", missingFields, blockers);
  requireStringArray(value.commandSummaries, "commandSummaries", missingFields, blockers);
  requireStringArray(value.failures, "failures", missingFields, blockers);
  requireStringArray(value.evidence, "evidence", missingFields, blockers);
  requireString(value.notes, "notes", missingFields, blockers);

  if (typeof value.filledAt !== "undefined" && typeof value.filledAt !== "string") {
    blockers.push("filledAt must be string when provided.");
  }
  if (typeof value.deployedAt !== "undefined" && value.deployedAt !== null && typeof value.deployedAt !== "string") {
    blockers.push("deployedAt must be string or null.");
  }

  if (blockers.length > 0 || missingFields.length > 0) {
    return {
      valid: false,
      canTransitionToDeployedPendingVerification: false,
      missingFields,
      warnings,
      blockers
    };
  }

  if (value.serverCommandsCompleted !== true) blockers.push("serverCommandsCompleted is false.");
  if (value.dockerCommandsCompleted !== true) blockers.push("dockerCommandsCompleted is false.");
  if (value.nginxCommandsCompleted !== true) blockers.push("nginxCommandsCompleted is false.");
  if (!value.deployedAt) blockers.push("deployedAt is required before transition.");
  if ((value.failures ?? []).length > 0) blockers.push("failures must be empty before transition.");
  if ((value.evidence ?? []).length === 0) warnings.push("evidence is empty; prefer non-secret server output summaries.");

  const canTransition = value.serverCommandsCompleted === true
    && value.dockerCommandsCompleted === true
    && value.nginxCommandsCompleted === true
    && Boolean(value.deployedAt)
    && (value.failures ?? []).length === 0;

  return {
    valid: true,
    canTransitionToDeployedPendingVerification: canTransition,
    missingFields,
    warnings,
    blockers
  };
}

export function canTransitionToDeployedPendingVerification(input: unknown) {
  return validateServerDeploymentResultInput(input).canTransitionToDeployedPendingVerification;
}

function requireStringLiteral(
  value: unknown,
  expected: string,
  field: string,
  missingFields: string[],
  blockers: string[]
) {
  if (typeof value === "undefined") {
    missingFields.push(field);
    return;
  }
  if (value !== expected) blockers.push(`${field} must be ${expected}.`);
}

function requireString(
  value: unknown,
  field: string,
  missingFields: string[],
  blockers: string[]
) {
  if (typeof value === "undefined") {
    missingFields.push(field);
    return;
  }
  if (typeof value !== "string") blockers.push(`${field} must be string.`);
}

function requireBoolean(
  value: unknown,
  field: string,
  missingFields: string[],
  blockers: string[]
) {
  if (typeof value === "undefined") {
    missingFields.push(field);
    return;
  }
  if (typeof value !== "boolean") blockers.push(`${field} must be boolean.`);
}

function requireStringArray(
  value: unknown,
  field: string,
  missingFields: string[],
  blockers: string[]
) {
  if (typeof value === "undefined") {
    missingFields.push(field);
    return;
  }
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    blockers.push(`${field} must be string array.`);
  }
}
