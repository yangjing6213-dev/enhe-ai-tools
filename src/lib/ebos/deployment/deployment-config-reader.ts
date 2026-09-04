import { access, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import type {
  EbosDeploymentConfigSummary,
  EbosDeploymentScriptKey
} from "./deployment-types";

const REQUIRED_SCRIPTS: EbosDeploymentScriptKey[] = [
  "lint",
  "typecheck",
  "build",
  "start",
  "test",
  "prisma:generate"
];

export async function readDeploymentConfig(options: {
  rootDir?: string;
} = {}): Promise<EbosDeploymentConfigSummary> {
  const rootDir = options.rootDir ?? process.cwd();
  const packageJson = await readPackageJson(rootDir);
  const next = await detectNextConfig(rootDir);
  const docker = await detectDockerConfig(rootDir);
  const nginx = await detectNginxConfig(rootDir);
  const deployDocs = await detectDeployDocs(rootDir);

  return {
    packageManagerDetected: await detectPackageManager(rootDir),
    scriptsDetected: detectPackageScripts(packageJson),
    nextConfigDetected: next.nextConfigDetected,
    dockerfileDetected: docker.dockerfileDetected,
    dockerComposeDetected: docker.dockerComposeDetected,
    nginxConfigDetected: nginx.nginxConfigDetected,
    deployDocsDetected: deployDocs.deployDocsDetected,
    standaloneOutputDetected: next.standaloneOutputDetected,
    warnings: [
      ...buildScriptWarnings(detectPackageScripts(packageJson)),
      ...next.warnings,
      ...docker.warnings,
      ...nginx.warnings,
      ...deployDocs.warnings
    ]
  };
}

export function detectPackageScripts(packageJson: unknown): Record<EbosDeploymentScriptKey, boolean> {
  const record = packageJson && typeof packageJson === "object" ? packageJson as Record<string, unknown> : {};
  const scripts = record.scripts && typeof record.scripts === "object" ? record.scripts as Record<string, unknown> : {};
  return Object.fromEntries(REQUIRED_SCRIPTS.map((key) => [key, typeof scripts[key] === "string"])) as Record<EbosDeploymentScriptKey, boolean>;
}

export async function detectDockerConfig(rootDir: string) {
  const dockerfilePaths = [
    join(rootDir, "Dockerfile"),
    join(rootDir, "deploy", "enhe-ai-tools", "Dockerfile")
  ];
  const composePaths = [
    join(rootDir, "docker-compose.yml"),
    join(rootDir, "docker-compose.yaml"),
    join(rootDir, "compose.yml"),
    join(rootDir, "deploy", "docker-compose.local.yml"),
    join(rootDir, "deploy", "enhe-ai-tools", "docker-compose.yml")
  ];
  const dockerfileDetected = await anyFileExists(dockerfilePaths);
  const dockerComposeDetected = await anyFileExists(composePaths);

  return {
    dockerfileDetected,
    dockerComposeDetected,
    warnings: [
      ...(!dockerfileDetected ? ["Dockerfile not detected."] : []),
      ...(!dockerComposeDetected ? ["Docker Compose config not detected."] : [])
    ]
  };
}

export async function detectNginxConfig(rootDir: string) {
  const candidateNames = await listFileNames(rootDir, 4);
  const nginxConfigDetected = candidateNames.some((name) => /nginx|\.conf$/i.test(name));

  return {
    nginxConfigDetected,
    warnings: nginxConfigDetected ? [] : ["Nginx config was not detected; keep this as a manual production reverse-proxy check."]
  };
}

export async function detectNextConfig(rootDir: string) {
  const filePaths = [
    join(rootDir, "next.config.ts"),
    join(rootDir, "next.config.js"),
    join(rootDir, "next.config.mjs")
  ];
  const filePath = await firstExistingFile(filePaths);
  if (!filePath) {
    return {
      nextConfigDetected: false,
      standaloneOutputDetected: false,
      warnings: ["Next config not detected."]
    };
  }

  const source = await readFile(filePath, "utf8");
  const standaloneOutputDetected = /output\s*:\s*["']standalone["']/.test(source);

  return {
    nextConfigDetected: true,
    standaloneOutputDetected,
    warnings: standaloneOutputDetected ? [] : ["Next config does not explicitly set output: standalone."]
  };
}

export async function detectDeployDocs(rootDir: string) {
  const deployDir = join(rootDir, "deploy");
  const deployDirExists = await fileExists(deployDir);
  const docsDetected = await anyFileExists([
    join(deployDir, "README.md"),
    join(deployDir, "enhe-ai-tools", "README.md")
  ]);

  return {
    deployDocsDetected: deployDirExists && docsDetected,
    warnings: deployDirExists && docsDetected ? [] : ["Deploy directory or deploy README was not detected."]
  };
}

export async function readEnvExampleKeyNames(rootDir: string) {
  const paths = [
    join(rootDir, ".env.example"),
    join(rootDir, "deploy", "enhe-ai-tools", ".env.example")
  ];
  const keys = new Set<string>();

  for (const filePath of paths) {
    try {
      const source = await readFile(filePath, "utf8");
      for (const line of source.split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Z0-9_]+)\s*=/);
        if (match?.[1]) keys.add(match[1]);
      }
    } catch {
      // Env examples are optional for preflight; missing files are reflected by env checks.
    }
  }

  return [...keys].sort();
}

async function readPackageJson(rootDir: string) {
  try {
    return JSON.parse(await readFile(join(rootDir, "package.json"), "utf8")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function detectPackageManager(rootDir: string): Promise<EbosDeploymentConfigSummary["packageManagerDetected"]> {
  if (await fileExists(join(rootDir, "pnpm-lock.yaml"))) return "pnpm";
  if (await fileExists(join(rootDir, "yarn.lock"))) return "yarn";
  if (await fileExists(join(rootDir, "package-lock.json"))) return "npm";
  if (await fileExists(join(rootDir, "package.json"))) return "npm";
  return "unknown";
}

function buildScriptWarnings(scripts: Record<EbosDeploymentScriptKey, boolean>) {
  return REQUIRED_SCRIPTS
    .filter((key) => !scripts[key])
    .map((key) => `package.json script is missing: ${key}`);
}

async function anyFileExists(paths: string[]) {
  for (const filePath of paths) {
    if (await fileExists(filePath)) return true;
  }
  return false;
}

async function firstExistingFile(paths: string[]) {
  for (const filePath of paths) {
    if (await fileExists(filePath)) return filePath;
  }
  return null;
}

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function listFileNames(rootDir: string, maxDepth: number) {
  const names: string[] = [];
  await walk(rootDir, 0);
  return names;

  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue;
      const fullPath = join(dir, entry.name);
      names.push(fullPath);
      if (entry.isDirectory()) await walk(fullPath, depth + 1);
    }
  }
}
