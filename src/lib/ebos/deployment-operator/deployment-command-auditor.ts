import type {
  EbosDeploymentAuditedCommand,
  EbosDeploymentCommandAudit,
  EbosDeploymentCommandCategory
} from "./deployment-operator-types";

export function auditDeploymentCommands(options: {
  targetDate: string | Date;
  deploymentPlanMarkdown?: string;
  executionRunbookMarkdown?: string;
}): EbosDeploymentCommandAudit {
  const commands = [
    ...parseDeploymentPlanMarkdown(options.deploymentPlanMarkdown ?? ""),
    ...parseExecutionRunbookMarkdown(options.executionRunbookMarkdown ?? "")
  ].map((command, index): EbosDeploymentAuditedCommand => {
    const dangerous = detectDangerousDeploymentCommand(command.command);
    const migration = detectMigrationCommand(command.command);
    const secretExposure = detectSecretExposureRisk(command.command);
    const manualRequired = ["server", "docker", "nginx"].includes(command.category);
    const warnings = [
      ...(manualRequired ? ["Must be executed by the user in the server context or after explicit executable environment confirmation."] : []),
      ...(dangerous ? ["Dangerous deployment command detected."] : []),
      ...(migration ? ["Prisma migration command is forbidden in this stage."] : []),
      ...(secretExposure ? ["Command may expose secret values and must not be printed or executed by EBOS."] : [])
    ];

    return {
      id: `${command.category}-${index + 1}`,
      title: command.title,
      command: command.command,
      category: command.category,
      source: command.source,
      manualRequired,
      dangerous,
      migration,
      secretExposure,
      warnings
    };
  });

  const dangerousCommandsDetected = commands.filter((command) => command.dangerous).map((command) => command.command);
  const migrationCommandsDetected = commands.filter((command) => command.migration).map((command) => command.command);
  const secretExposureRisks = commands.filter((command) => command.secretExposure).map((command) => command.command);
  const manualRequiredCommands = commands.filter((command) => command.manualRequired);
  const warnings = [
    ...unique(commands.flatMap((command) => command.warnings)),
    ...(commands.length === 0 ? ["No deployment commands were found in the provided plan or runbook."] : [])
  ];

  return {
    commandsAudited: commands.length,
    localCommands: commands.filter((command) => command.category === "local"),
    serverCommands: commands.filter((command) => command.category === "server"),
    dockerCommands: commands.filter((command) => command.category === "docker"),
    nginxCommands: commands.filter((command) => command.category === "nginx"),
    verificationCommands: commands.filter((command) => command.category === "verification"),
    rollbackCommands: commands.filter((command) => command.category === "rollback"),
    dangerousCommandsDetected,
    migrationCommandsDetected,
    secretExposureRisks,
    manualRequiredCommands,
    safeToProceed: dangerousCommandsDetected.length === 0
      && migrationCommandsDetected.length === 0
      && secretExposureRisks.length === 0,
    warnings
  };
}

export function classifyDeploymentCommand(command: string): EbosDeploymentCommandCategory {
  const normalized = command.trim().toLowerCase();
  if (normalized.includes("docker ")) return "docker";
  if (normalized.includes("nginx ")) return "nginx";
  if (normalized.includes("check-ebos-validation-post-launch")) return "verification";
  if (normalized.startsWith("ssh ") || normalized.startsWith("cd ") || normalized.includes(" git pull")) return "server";
  if (normalized.includes("rollback") || normalized.includes("revert ")) return "rollback";
  return "local";
}

export function detectDangerousDeploymentCommand(command: string) {
  const normalized = command.toLowerCase();
  return /\brm\s+-rf\b/.test(normalized)
    || /\bdel\s+\/s\b/.test(normalized)
    || detectMigrationCommand(command)
    || /drop\s+database/i.test(command)
    || detectSecretExposureRisk(command)
    || /\bdocker\s+volume\s+rm\b/.test(normalized);
}

export function detectMigrationCommand(command: string) {
  return /prisma\s+migrate\s+(reset|deploy)/i.test(command);
}

export function detectSecretExposureRisk(command: string) {
  const normalized = command.trim();
  return /\bcat\s+\.env\b/i.test(normalized)
    || /\btype\s+\.env\b/i.test(normalized)
    || /\bget-content\s+\.env\b/i.test(normalized)
    || /^printenv\b/i.test(normalized)
    || /^env$/i.test(normalized);
}

function parseDeploymentPlanMarkdown(markdown: string) {
  return [
    ...parsePlanSection(markdown, "Local Commands", "local"),
    ...parsePlanSection(markdown, "Server Commands", "server"),
    ...parsePlanSection(markdown, "Docker Commands", "docker"),
    ...parsePlanSection(markdown, "Nginx Commands", "nginx"),
    ...parsePlanSection(markdown, "Verification Commands", "verification"),
    ...parsePlanSection(markdown, "Rollback Steps", "rollback")
  ];
}

function parsePlanSection(markdown: string, heading: string, category: EbosDeploymentCommandCategory) {
  return readSectionListItems(markdown, heading).map((line, index) => {
    const parts = line.split("|").map((part) => part.trim());
    const title = parts.length >= 3 ? parts[1] : `${heading} ${index + 1}`;
    const command = parts.length >= 3 ? parts.slice(2).join(" | ") : line;
    return {
      title,
      command,
      category,
      source: `deployment-plan:${heading}`
    };
  });
}

function parseExecutionRunbookMarkdown(markdown: string) {
  const commands: Array<{
    title: string;
    command: string;
    category: EbosDeploymentCommandCategory;
    source: string;
  }> = [];

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith("- ")) continue;
    const content = line.slice(2).trim();
    const parts = content.split("|").map((part) => part.trim());
    if (parts.length < 3) continue;
    const category = readRunbookCategory(parts[0]);
    if (!category) continue;
    commands.push({
      title: `${parts[0]} command`,
      command: parts[2],
      category,
      source: "deployment-execution-runbook"
    });
  }

  return commands;
}

function readRunbookCategory(value: string): EbosDeploymentCommandCategory | null {
  if (value === "local") return "local";
  if (value === "server") return "server";
  if (value === "docker") return "docker";
  if (value === "nginx") return "nginx";
  if (value === "verification") return "verification";
  return null;
}

function readSectionListItems(markdown: string, heading: string) {
  const lines = markdown.split(/\r?\n/);
  const items: string[] = [];
  let inSection = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith("## ")) {
      inSection = line.toLowerCase().includes(heading.toLowerCase());
      continue;
    }
    if (!inSection || !line.startsWith("- ")) continue;
    items.push(line.slice(2).trim());
  }

  return items;
}

function unique(values: string[]) {
  return [...new Set(values)];
}
