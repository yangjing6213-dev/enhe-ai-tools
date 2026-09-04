import type {
  EbosDeploymentCommandPlan,
  EbosDeploymentPlannedCommand
} from "./deployment-types";

export function buildDeploymentCommandPlan(options: {
  targetDate: string | Date;
  siteUrl: string;
  hasDeployConfig?: boolean;
  serverProjectPath?: string;
}): EbosDeploymentCommandPlan {
  const targetDate = toDateKey(options.targetDate);
  const siteUrl = normalizeSiteUrl(options.siteUrl);
  const hasDeployConfig = options.hasDeployConfig === true;
  const serverProjectPath = options.serverProjectPath;

  return {
    localCommands: [
      command("local-lint", "Run lint locally", "npm run lint"),
      command("local-typecheck", "Run typecheck locally", "npm run typecheck"),
      command("local-build", "Run production build locally", "npm run build"),
      command("local-launch-readiness", "Regenerate validation launch readiness", `npx tsx scripts/check-ebos-validation-launch-readiness.ts --date ${targetDate}`),
      command("local-launch-execution", "Regenerate validation launch execution", `npx tsx scripts/generate-ebos-validation-launch-execution.ts --date ${targetDate}`),
      command("local-git-status", "Review git status manually", "git status"),
      command("local-git-diff-stat", "Review diff stat manually", "git diff --stat"),
      command("local-git-commit-suggestion", "Create a scoped commit only after review", "git add <reviewed files> && git commit -m \"ebos: add production deployment preflight\"")
    ],
    serverCommands: hasDeployConfig && serverProjectPath
      ? [
          command("server-cd", "Open project directory on server", `cd ${serverProjectPath}`),
          command("server-pull", "Pull reviewed commit on server", "git pull --ff-only")
        ]
      : [
          manualCommand("server-path", "Server project path must be confirmed before SSH or deployment commands are run.")
        ],
    dockerCommands: hasDeployConfig
      ? [
          command("docker-compose-build", "Build and start production compose stack on server", "docker compose -f deploy/enhe-ai-tools/docker-compose.yml up -d --build"),
          command("docker-compose-ps", "Verify production containers on server", "docker compose -f deploy/enhe-ai-tools/docker-compose.yml ps")
        ]
      : [
          manualCommand("docker-deploy-config", "Docker deployment config is not confirmed; do not invent server paths or compose commands.")
        ],
    verificationCommands: [
      command("verify-post-launch", "Run public post-launch validation routes check", `npx tsx scripts/check-ebos-validation-post-launch.ts --date ${targetDate} --site-url ${siteUrl}`)
    ],
    notes: [
      "This is a command plan only; no server command is executed by EBOS.",
      "Git add/commit commands are suggestions and require explicit human review.",
      "Do not print secrets in terminal output or reports."
    ],
    warnings: [
      ...(!hasDeployConfig ? ["Server deployment commands are manual_required because deploy config is not confirmed."] : []),
      "Do not SSH or deploy until the user explicitly confirms production deployment."
    ]
  };
}

function command(
  id: string,
  title: string,
  commandText: string
): EbosDeploymentPlannedCommand {
  return {
    id,
    title,
    status: "ready",
    command: commandText,
    notes: "Prepared command; execute only in the appropriate local/server context."
  };
}

function manualCommand(
  id: string,
  notes: string
): EbosDeploymentPlannedCommand {
  return {
    id,
    title: "Manual confirmation required",
    status: "manual_required",
    notes
  };
}

function normalizeSiteUrl(siteUrl: string) {
  return siteUrl.replace(/\/+$/, "");
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
