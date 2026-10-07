import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import nextConfig from "../../next.config";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");

function read(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

describe("production release workflow", () => {
  it("keeps lint and test tools out of the runtime image while retaining operational tools", () => {
    const dockerfile = read("deploy/enhe-ai-tools/Dockerfile");
    const manifest = JSON.parse(read("package.json"));
    const runtime = dockerfile.slice(dockerfile.indexOf("FROM node:24-alpine AS runner"));
    expect(dockerfile).toContain("FROM deps AS production-deps");
    expect(dockerfile).toContain("RUN npm prune --omit=dev --ignore-scripts");
    expect(runtime).toContain("COPY --from=production-deps /app/node_modules ./node_modules");
    expect(runtime).not.toContain("COPY --from=deps /app/node_modules");
    expect(manifest.dependencies.prisma).toBeTruthy();
    expect(manifest.dependencies.tsx).toBeTruthy();
    expect(manifest.devDependencies.prisma).toBeUndefined();
    expect(manifest.devDependencies.tsx).toBeUndefined();
  });

  it("copies the local braces archive before installing in both Docker build paths", () => {
    const dockerfiles = [read("Dockerfile"), read("deploy/enhe-ai-tools/Dockerfile")];

    for (const dockerfile of dockerfiles) {
      const archiveCopy = dockerfile.indexOf("COPY vendor/braces-3.0.4-enhe.0.tgz ./vendor/");
      const dependencyInstall = dockerfile.search(/^RUN npm (?:ci|install)$/m);

      expect(archiveCopy).toBeGreaterThan(-1);
      expect(dependencyInstall).toBeGreaterThan(archiveCopy);
    }
  });

  it("blocks release on high severity dependency advisories before build or push", () => {
    const wrapper = read("scripts/push-and-deploy.ps1");
    const audit = wrapper.indexOf('Invoke-Native -FilePath npm -Arguments @("audit", "--include=dev", "--include=optional", "--include=peer", "--audit-level=high", "--registry=https://registry.npmjs.org")');
    expect(audit).toBeGreaterThan(-1);
    expect(audit).toBeLessThan(wrapper.indexOf('"scripts/test-migration-paths.mjs", $Branch'));
    expect(audit).toBeLessThan(wrapper.indexOf('Invoke-Native -FilePath npm -Arguments @("run", "build")'));
    expect(audit).toBeLessThan(wrapper.indexOf('Invoke-Native -FilePath git -Arguments @("push", "origin"'));
  });

  it("generates the local Prisma client before the clean-install test suite", () => {
    const wrapper = read("scripts/push-and-deploy.ps1");
    const testPhase = wrapper.indexOf('Invoke-Native -FilePath npm -Arguments @("test")');
    const generatedClient = wrapper.indexOf(
      'Invoke-Native -FilePath npm -Arguments @("run", "prisma:client")',
    );
    const testDatabaseReset = wrapper.lastIndexOf(
      "$env:DATABASE_URL = $null",
      testPhase,
    );

    expect(testDatabaseReset).toBeGreaterThan(-1);
    expect(generatedClient).toBeGreaterThan(testDatabaseReset);
    expect(generatedClient).toBeLessThan(testPhase);
  });

  it("pins standalone output tracing to the current worktree root", () => {
    expect(nextConfig.output).toBe("standalone");
    expect(nextConfig.outputFileTracingRoot).toBe(root);
  });

  it("restores the caller's database environment after every local check outcome", () => {
    const wrapper = read("scripts/push-and-deploy.ps1");
    const savedDatabaseUrl = wrapper.indexOf("$previousDatabaseUrl = $env:DATABASE_URL");
    const savedTestDatabaseUrl = wrapper.indexOf(
      "$previousSeoAuditTestDatabaseUrl = $env:SEO_AUDIT_TEST_DATABASE_URL",
    );
    const protectedTry = wrapper.indexOf("try {", savedTestDatabaseUrl);
    const databaseOverride = wrapper.indexOf("$env:DATABASE_URL = $TestDatabaseUrl");
    const protectedFinally = wrapper.indexOf("} finally {", protectedTry);

    expect(savedDatabaseUrl).toBeGreaterThan(-1);
    expect(savedTestDatabaseUrl).toBeGreaterThan(-1);
    expect(protectedTry).toBeGreaterThan(savedTestDatabaseUrl);
    expect(databaseOverride).toBeGreaterThan(protectedTry);
    expect(protectedFinally).toBeGreaterThan(databaseOverride);
    expect(wrapper.indexOf("$env:DATABASE_URL = $previousDatabaseUrl", protectedFinally)).toBeGreaterThan(
      protectedFinally,
    );
    expect(
      wrapper.indexOf("$env:SEO_AUDIT_TEST_DATABASE_URL = $previousSeoAuditTestDatabaseUrl", protectedFinally),
    ).toBeGreaterThan(protectedFinally);
  });

  it("keeps PostgreSQL-backed Vitest suites behind a separate explicit opt-in", () => {
    const wrapper = read("scripts/push-and-deploy.ps1");
    const runbook = read("docs/tencent-cloud-push-deploy-workflow.md");
    const testCommand = wrapper.indexOf('Invoke-Native -FilePath npm -Arguments @("test")');
    const vitestGate = wrapper.lastIndexOf("if ($AllowDatabaseMutatingVitest) {", testCommand);
    const testDatabaseReset = wrapper.lastIndexOf("$env:DATABASE_URL = $null", testCommand);
    const testAuditDatabaseReset = wrapper.lastIndexOf("$env:SEO_AUDIT_TEST_DATABASE_URL = $null", testCommand);
    const databaseGate = wrapper.indexOf(
      "$databaseMutationRequested = $AllowDatabaseMutatingVitest -or $AllowDatabaseMutatingE2E",
    );
    const databaseValidation = wrapper.indexOf("Assert-LocalTestDatabaseUrl $TestDatabaseUrl");
    const databaseValidationGate = wrapper.lastIndexOf("if ($databaseMutationRequested) {", databaseValidation);
    const e2eCommand = wrapper.indexOf('Invoke-Native -FilePath npm -Arguments @("run", "test:e2e")');
    const e2eGate = wrapper.lastIndexOf("if ($AllowDatabaseMutatingE2E) {", e2eCommand);
    const e2eDatabaseSet = wrapper.lastIndexOf("$env:DATABASE_URL = $TestDatabaseUrl", e2eCommand);

    expect(wrapper).toContain("[switch]$AllowDatabaseMutatingVitest");
    expect(databaseGate).toBeGreaterThan(-1);
    expect(wrapper).toContain("if ($databaseMutationRequested) {");
    expect(wrapper).toContain("$env:SEO_AUDIT_TEST_DATABASE_URL = $null");
    expect(wrapper).toContain("$env:DATABASE_URL = $null");
    expect(vitestGate).toBeGreaterThan(-1);
    expect(testCommand).toBeGreaterThan(vitestGate);
    expect(testDatabaseReset).toBeGreaterThan(wrapper.indexOf("try {"));
    expect(testDatabaseReset).toBeLessThan(testCommand);
    expect(testAuditDatabaseReset).toBeGreaterThan(wrapper.indexOf("try {"));
    expect(testAuditDatabaseReset).toBeLessThan(testCommand);
    expect(databaseValidationGate).toBeGreaterThan(databaseGate);
    expect(e2eGate).toBeGreaterThan(-1);
    expect(e2eDatabaseSet).toBeGreaterThan(e2eGate);
    expect(runbook).toContain("`-AllowDatabaseMutatingVitest`");
    expect(runbook).toContain("PostgreSQL Vitest suites are skipped by default");
    expect(runbook).toContain("Do not run from a machine with an SSH/local port-forward");
  });

  it("refuses to run Docker checks against a remote daemon", () => {
    const wrapper = read("scripts/push-and-deploy.ps1");
    const runbook = read("docs/tencent-cloud-push-deploy-workflow.md");
    const guardCall = wrapper.lastIndexOf("Assert-LocalDockerContext");
    const firstDockerContainer = wrapper.indexOf('"run", "--rm"');

    expect(wrapper).toContain("function Assert-LocalDockerContext");
    expect(wrapper).toContain("$env:DOCKER_HOST");
    expect(wrapper).toContain("docker context show");
    expect(wrapper).toContain("docker context inspect");
    expect(wrapper).toContain(
      "$localDockerEndpointPattern = '^(?:unix:///(?!/).+|npipe:////\\./pipe/(?:docker_engine|dockerDesktopLinuxEngine)|npipe://\\./pipe/(?:docker_engine|dockerDesktopLinuxEngine))$'",
    );
    expect(wrapper).toContain("if ($dockerEndpoint -notmatch $localDockerEndpointPattern)");
    expect(guardCall).toBeGreaterThan(-1);
    expect(guardCall).toBeLessThan(firstDockerContainer);
    expect(runbook).toContain(
      "Accepted endpoints are a local Unix socket path, Docker Desktop's local Windows engine pipe (`docker_engine`), or Docker Desktop's local Linux engine pipe (`dockerDesktopLinuxEngine`)",
    );
    expect(runbook).toContain(
      "remote TCP endpoints and named pipes containing another host are rejected",
    );
    expect(runbook).toContain("dockerDesktopLinuxEngine");
  });

  it("requires a dedicated test database name before database-mutating release E2E", () => {
    const wrapper = read("scripts/push-and-deploy.ps1");
    const runbook = read("docs/tencent-cloud-push-deploy-workflow.md");

    expect(wrapper).toContain(
      '$databaseName = [System.Uri]::UnescapeDataString($uri.AbsolutePath.Trim("/"))',
    );
    expect(wrapper).toContain(
      "$databaseName -notmatch '(?:^|[_-])(test|e2e)(?:[_-]|$)'",
    );
    expect(wrapper).toContain(
      "$databaseName -match '(?:^|[_-])(prod|production|live)(?:[_-]|$)'",
    );
    const commercialFlow = read("tests/e2e/commercial-flow.spec.ts");
    expect(commercialFlow).toContain(
      "!/(?:^|[_-])(prod|production|live)(?:[_-]|$)/i.test(databaseName)",
    );
    expect(runbook).toContain(
      "database name must contain a delimited `test` or `e2e` marker and no delimited `prod`, `production`, or `live` marker",
    );
    expect(runbook).toContain("`-AllowDatabaseMutatingE2E`");
    expect(runbook).toContain("SSH port-forward");
  });

  it("requires explicit opt-in before enabling database-mutating commercial E2E", () => {
    const wrapper = read("scripts/push-and-deploy.ps1");
    const gate = wrapper.indexOf("if ($AllowDatabaseMutatingE2E) {");
    const enable = wrapper.indexOf('$env:ENHE_E2E_ALLOW_DATABASE_MUTATION = "1"', gate);
    const clear = wrapper.indexOf("$env:ENHE_E2E_ALLOW_DATABASE_MUTATION = $null", gate);

    expect(wrapper).toContain("[switch]$AllowDatabaseMutatingE2E");
    expect(gate).toBeGreaterThan(-1);
    expect(enable).toBeGreaterThan(gate);
    expect(clear).toBeGreaterThan(gate);
  });

  it("requires explicit push and deploy switches before remote release operations", () => {
    const wrapper = read("scripts/push-and-deploy.ps1");
    const runbook = read("docs/tencent-cloud-push-deploy-workflow.md");
    const branchValidation = wrapper.indexOf("& git check-ref-format --branch $Branch");
    const branchFetch = wrapper.indexOf(
      '"refs/heads/${Branch}:refs/remotes/origin/${Branch}"',
    );
    const ancestryCheck = wrapper.indexOf('& git merge-base --is-ancestor "origin/$Branch" $ReleaseRef');
    const migrationCheck = wrapper.indexOf('"scripts/test-migration-paths.mjs", $Branch');

    expect(wrapper).toContain("[switch]$Push");
    expect(wrapper).toContain("[switch]$Deploy");
    expect(wrapper).toContain("if ($Deploy -and $NoDeploy)");
    expect(wrapper).toContain("if ($Deploy -and -not $Push)");
    expect(wrapper).toContain("if ($NoDeploy -and -not $Push)");
    expect(wrapper).toContain("$pushRequested = [bool]$Push");
    expect(wrapper).toContain("$deployRequested = [bool]$Deploy");
    expect(wrapper).toContain("if (-not $deployRequested)");
    expect(wrapper).toContain("if ($deployRequested)");
    expect(wrapper).toContain("remote deployment was not requested.");
    expect(wrapper).toMatch(
      /if \(\$pushRequested\) \{[\s\S]*?Invoke-Native -FilePath git -Arguments @\([\s\S]*?"fetch"[\s\S]*?"--no-tags"[\s\S]*?"origin"[\s\S]*?"refs\/heads\/\$\{Branch\}:refs\/remotes\/origin\/\$\{Branch\}"[\s\S]*?\)/,
    );
    expect(wrapper).toMatch(
      /if \(\$pushRequested\) \{\s*Invoke-Native -FilePath git -Arguments @\("push", "origin", "\$\{ReleaseRef\}:refs\/heads\/\$Branch"\)/,
    );
    expect(wrapper).not.toContain('[string]$Branch = "main"');
    expect(branchValidation).toBeGreaterThan(-1);
    expect(branchFetch).toBeGreaterThan(branchValidation);
    expect(branchFetch).toBeLessThan(ancestryCheck);
    expect(ancestryCheck).toBeLessThan(migrationCheck);
    expect(runbook).toContain(
      "By default it runs local checks only: it does not fetch, push, SSH, or deploy.",
    );
    expect(runbook).toContain("-Push");
    expect(runbook).toContain("`-Deploy`, which requires `-Push`");
    expect(runbook).toContain(
      "The named branch is validated before any fetch. With",
    );
    expect(runbook).not.toContain(
      "By default it pushes the release ref to the explicitly selected GitHub branch and stops there.",
    );
  });

  it("fails closed when a database-writing browser test targets a non-loopback base URL", () => {
    const commercialFlow = read("tests/e2e/commercial-flow.spec.ts");

    expect(commercialFlow).toContain(
      "function getLocalPlaywrightBaseOrigin(rawUrl: string): string | null",
    );
    expect(commercialFlow).toContain(
      'const localBaseOrigin = getLocalPlaywrightBaseOrigin(localBaseUrl);',
    );
    expect(commercialFlow).toContain(
      '["localhost", "127.0.0.1", "::1", "[::1]"]',
    );
    expect(commercialFlow).toContain("url.username ||");
    expect(commercialFlow).toContain("url.password");
    expect(commercialFlow).toContain("localBaseOrigin !== null");
    expect(commercialFlow).toContain("if (!localBaseOrigin) return false;");
  });

  it("protects the existing database and preserves a first-release rollback image", () => {
    const deploy = read("deploy.sh");
    const dockerfile = read("deploy/enhe-ai-tools/Dockerfile");

    expect(deploy).not.toContain('. "$ENV_FILE"');
    expect(deploy).toContain(
      'EXPECTED_DB_VOLUME="enhe-ai-tools_enhe-ai-tools-postgres-data"',
    );
    expect(deploy).toContain('docker volume inspect "$EXPECTED_DB_VOLUME"');
    expect(deploy).toContain("preflight-production-database.sql");
    expect(deploy).toContain('ROLLBACK_IMAGE_TAG="rollback-$RELEASE_REF-$previous_image_short"');
    expect(deploy).toContain('docker image tag "$previous_image_id"');
    expect(deploy).toContain("ROLLBACK_RELEASE_REF");
    expect(deploy).toContain("org.opencontainers.image.revision");
    expect(dockerfile).toContain("org.opencontainers.image.revision");
    expect(deploy.indexOf("enhe-backup-db.sh")).toBeLessThan(
      deploy.indexOf("prisma migrate deploy"),
    );
  });

  it("keeps the rollback image tag separate from the runtime release identity", () => {
    const compose = read("deploy/enhe-ai-tools/docker-compose.yml");
    const rollback = read("deploy/enhe-ai-tools/scripts/enhe-rollback-app.sh");
    const start = read("deploy/enhe-ai-tools/scripts/enhe-start.sh");

    expect(compose).toContain("enhe-ai-tools:${APP_IMAGE_TAG");
    expect(rollback).toContain('APP_IMAGE_TAG="$ROLLBACK_IMAGE"');
    expect(rollback).toContain('RELEASE_REF="$rollback_release_ref"');
    expect(rollback).toContain("ROLLBACK_RELEASE_REF");
    expect(rollback).not.toContain('${ROLLBACK_IMAGE#rollback-}');
    expect(rollback).not.toContain('RELEASE_REF="$ROLLBACK_IMAGE"');
    expect(start).toContain("APP_IMAGE_TAG");
    expect(start).toContain("{{.Config.Image}}");
  });

  it("trusts only OCI labels for verified rollback identity", () => {
    const deploy = read("deploy.sh");
    const rollback = read("deploy/enhe-ai-tools/scripts/enhe-rollback-app.sh");

    expect(deploy).not.toContain(
      "docker image inspect --format '{{range .Config.Env}}{{println .}}{{end}}'",
    );
    expect(rollback).not.toContain(
      "docker image inspect --format '{{range .Config.Env}}{{println .}}{{end}}'",
    );
  });

  it("quiesces every database writer before taking the rollback snapshot", () => {
    const deploy = read("deploy.sh");
    const quiesceIndex = deploy.indexOf(
      "compose stop seo-audit-worker seo-audit-scheduler app",
    );
    const backupIndex = deploy.indexOf("enhe-backup-db.sh");
    const migrateIndex = deploy.indexOf("prisma migrate deploy");

    expect(quiesceIndex).toBeGreaterThan(-1);
    expect(backupIndex).toBeGreaterThan(quiesceIndex);
    expect(migrateIndex).toBeGreaterThan(backupIndex);
  });

  it("cannot accept stale heartbeats or partially healthy runtime services", () => {
    const deploy = read("deploy.sh");

    expect(deploy).toContain("compose stop seo-audit-worker seo-audit-scheduler");
    expect(deploy).toContain("seo-audit-worker-heartbeat.json");
    expect(deploy).toContain("seo-audit-scheduler-heartbeat.json");
    expect(deploy.indexOf("compose stop seo-audit-worker seo-audit-scheduler")).toBeLessThan(
      deploy.indexOf("--force-recreate app seo-audit-worker seo-audit-scheduler"),
    );
    expect(deploy).toContain("enhe-ai-tools-seo-audit-worker");
    expect(deploy).toContain("enhe-ai-tools-seo-audit-scheduler");
    expect(deploy).toContain("Full runtime health check failed.");
  });

  it("runs Playwright against the production build without mutating remote file modes", () => {
    const wrapper = read("scripts/push-and-deploy.ps1");
    const playwright = read("playwright.config.ts");
    const vitest = read("vitest.config.ts");
    const commercialFlow = read("tests/e2e/commercial-flow.spec.ts");
    const hostSaved = wrapper.indexOf("$previousHostname = $env:HOSTNAME");
    const hostBound = wrapper.indexOf('$env:HOSTNAME = "127.0.0.1"');
    const hostRestored = wrapper.indexOf("$env:HOSTNAME = $previousHostname");

    expect(wrapper).toContain("PLAYWRIGHT_USE_PRODUCTION_SERVER");
    expect(wrapper).toContain('$localBaseUrl = "http://127.0.0.1:$E2ePort"');
    expect(wrapper).toContain('npm -Arguments @("run", "test:e2e")');
    expect(wrapper).toContain('$env:ZPAY_MODE = "disabled"');
    expect(wrapper).toContain('$env:ENHE_E2E_ALLOW_DATABASE_MUTATION = "1"');
    expect(wrapper).toContain("NEXT_PUBLIC_SITE_URL");
    expect(wrapper).toContain("AUTH_SECRET");
    expect(wrapper).not.toContain("chmod +x");
    expect(wrapper).toContain("sh ./deploy.sh");
    expect(wrapper).toContain("git status --porcelain --untracked-files=all");
    expect(wrapper).toContain("PREVIOUS_RELEASE_REF");
    expect(wrapper).toContain("ToLowerInvariant");
    expect(playwright).toContain("PLAYWRIGHT_USE_PRODUCTION_SERVER");
    expect(playwright).toContain("start-production-e2e.cjs");
    expect(playwright).toContain("HOSTNAME: fixtureHost");
    expect(playwright).toContain('`http://${fixtureHost}:${port}`');
    expect(playwright).toContain('npm run dev -- --hostname ${fixtureHost} --port ${port}');
    expect(playwright).toContain('npm exec -- next dev --hostname ${fixtureHost} --port ${port}');
    expect(playwright).toContain(
      "workers: useProductionServer ? 2 : isDatabaseFree ? 1 : undefined",
    );
    expect(playwright).toContain(
      "const isDatabaseFree = !process.env.DATABASE_URL?.trim();",
    );
    expect(playwright).toContain("reuseExistingServer: false");
    expect(playwright).toContain('baseURLUrl.protocol !== "http:"');
    expect(playwright).toContain("baseURLUrl.hostname !== fixtureHost");
    expect(playwright).not.toContain("hasExplicitBaseURL");
    expect(read("scripts/start-production-e2e.cjs")).toContain("fetch-cache");
    expect(vitest).toContain('".next/**"');
    expect(commercialFlow).toContain(
      'process.env.ENHE_E2E_ALLOW_DATABASE_MUTATION === "1"',
    );
    expect(commercialFlow).toContain(
      'process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${process.env.PORT ?? "3000"}`',
    );
    expect(commercialFlow).toContain('"127.0.0.1"');
    expect(commercialFlow).toContain(
      "/(?:^|[_-])(test|e2e)(?:[_-]|$)/i.test(databaseName)",
    );
    expect(commercialFlow).toContain('context.route("**/*"');
    expect(commercialFlow).toContain("url.origin === localBaseOrigin");
    expect(playwright).toContain("const explicitBaseURL = process.env.PLAYWRIGHT_BASE_URL?.trim();");
    expect(playwright).toContain("baseURLUrl.port !== expectedPort");
    expect(playwright).toContain('baseURLUrl.pathname !== "/"');
    expect(hostSaved).toBeGreaterThan(-1);
    expect(hostBound).toBeGreaterThan(hostSaved);
    expect(hostRestored).toBeGreaterThan(hostBound);
    expect(commercialFlow).toContain("route.abort()");
  });

  it("keeps synthetic admin visual suites out of release E2E", () => {
    const playwright = read("playwright.config.ts");
    const adminVisual = read("playwright.admin-visual.config.ts");

    expect(playwright).toContain('"**/admin-visual-fixture.spec.ts"');
    expect(playwright).toContain('"**/admin-*-visual-fixture.spec.ts"');
    expect(playwright).toContain('"**/admin-shell-accessibility-matrix.spec.ts"');
    expect(playwright).toContain('"**/admin-populated-accessibility.spec.ts"');
    expect(playwright).not.toContain('"**/admin-shell.spec.ts"');
    expect(playwright).not.toContain('"**/admin-*.spec.ts"');
    expect(playwright).not.toContain("testMatch:");
    expect(adminVisual).toContain('"admin-shell.spec.ts"');
    expect(adminVisual).toContain('testMatch: [');
    for (const fixture of [
      "admin-user-visual-fixture.spec.ts",
      "admin-order-payment-visual-fixture.spec.ts",
      "admin-settings-visual-fixture.spec.ts",
      "admin-populated-accessibility.spec.ts",
    ]) {
      expect(adminVisual).toContain(`"${fixture}"`);
    }
  });

  it("validates the admin visual port before shell interpolation", () => {
    const adminVisual = read("playwright.admin-visual.config.ts");
    const rawPortDeclaration = adminVisual.indexOf(
      'const rawPort = process.env.ADMIN_VISUAL_PORT ?? "43217";',
    );
    const numericGuard = adminVisual.indexOf(
      "if (!/^\\d+$/.test(rawPort))",
    );
    const portConversion = adminVisual.indexOf("const port = Number(rawPort);");
    const rangeGuard = adminVisual.indexOf(
      "if (!Number.isSafeInteger(port) || port < 1 || port > 65535)",
    );
    const commandInterpolation = adminVisual.indexOf("command:");

    expect(rawPortDeclaration).toBeGreaterThan(-1);
    expect(numericGuard).toBeGreaterThan(rawPortDeclaration);
    expect(portConversion).toBeGreaterThan(numericGuard);
    expect(rangeGuard).toBeGreaterThan(portConversion);
    expect(commandInterpolation).toBeGreaterThan(rangeGuard);
    expect(adminVisual).toContain("PORT: String(port)");
  });

  it("validates and canonicalizes PORT before URL parsing or shell interpolation", () => {
    const playwright = read("playwright.config.ts");
    const rawPortDeclaration = playwright.indexOf(
      'const rawPort = process.env.PORT ?? "3000";',
    );
    const numericGuard = playwright.indexOf("if (!/^\\d+$/.test(rawPort))");
    const portConversion = playwright.indexOf("const numericPort = Number(rawPort);");
    const rangeGuard = playwright.indexOf(
      "if (!Number.isSafeInteger(numericPort) || numericPort < 1 || numericPort > 65535)",
    );
    const canonicalPort = playwright.indexOf("const port = String(numericPort);");
    const baseUrlConstruction = playwright.indexOf("const baseURL = explicitBaseURL");
    const commandInterpolation = playwright.indexOf("command:");

    expect(rawPortDeclaration).toBeGreaterThan(-1);
    expect(numericGuard).toBeGreaterThan(rawPortDeclaration);
    expect(portConversion).toBeGreaterThan(numericGuard);
    expect(rangeGuard).toBeGreaterThan(portConversion);
    expect(canonicalPort).toBeGreaterThan(rangeGuard);
    expect(baseUrlConstruction).toBeGreaterThan(canonicalPort);
    expect(commandInterpolation).toBeGreaterThan(canonicalPort);
    expect(playwright).toContain("--port ${port}");
  });

  it("blocks SSH option injection through the release account and keeps branch validation", () => {
    const wrapper = read("scripts/push-and-deploy.ps1");
    const serverUserValidation = wrapper.indexOf(
      "[ValidatePattern('\\A[A-Za-z_][A-Za-z0-9._-]*\\z')]",
    );
    const serverUserParameter = wrapper.indexOf("[string]$ServerUser");
    const sshDestination = wrapper.indexOf('"$ServerUser@$ServerHost"');
    const branchAllowlist = wrapper.indexOf(
      "[ValidatePattern('\\A[A-Za-z0-9_][A-Za-z0-9._/-]*\\z')]",
    );
    const branchParameter = wrapper.indexOf("[string]$Branch");
    const branchValidation = wrapper.indexOf("& git check-ref-format --branch $Branch");
    const remoteBranchInterpolation = wrapper.indexOf("git fetch --depth=1 origin '$Branch'");
    const branchPattern = wrapper.match(
      /\[ValidatePattern\('([^']+)'\)\]\s*\[string\]\$Branch/,
    )?.[1];
    const branchPatternBody = branchPattern
      ?.replace(/^\\A/, "")
      .replace(/\\z$/, "");
    const branchNameMatcher = branchPatternBody
      ? new RegExp(`^(?:${branchPatternBody})$(?![\\s\\S])`)
      : null;

    const serverUserPattern = wrapper.match(
      /\[ValidatePattern\('([^']+)'\)\]\s*\[string\]\$ServerUser/,
    )?.[1];
    const serverUserPatternBody = serverUserPattern
      ?.replace(/^\\A/, "")
      .replace(/\\z$/, "");
    const serverUserNameMatcher = serverUserPatternBody
      ? new RegExp("^(?:" + serverUserPatternBody + ")$(?![\\s\\S])")
      : null;

    expect(serverUserValidation).toBeGreaterThan(-1);
    expect(serverUserValidation).toBeLessThan(serverUserParameter);
    expect(serverUserParameter).toBeGreaterThan(serverUserValidation);
    expect(sshDestination).toBeGreaterThan(serverUserParameter);
    expect(wrapper).toContain("[ValidateRange(1, 65535)]");
    expect(wrapper).toContain("[ValidatePattern('^[A-Za-z0-9._/-]+$')]");
    expect(branchAllowlist).toBeGreaterThan(-1);
    expect(branchAllowlist).toBeLessThan(branchParameter);
    expect(branchParameter).toBeGreaterThan(-1);
    expect(branchValidation).toBeGreaterThan(branchParameter);
    expect(remoteBranchInterpolation).toBeGreaterThan(branchValidation);
    expect(branchNameMatcher?.test("codex/enhe-recovery-baseline")).toBe(true);
    expect(branchNameMatcher?.test("_release")).toBe(true);
    expect(branchNameMatcher?.test("foo';id;#")).toBe(false);
    expect(branchNameMatcher?.test("codex/release\n")).toBe(false);
    expect(serverUserNameMatcher?.test("ubuntu")).toBe(true);
    expect(serverUserNameMatcher?.test("-oProxyCommand=whoami")).toBe(false);
  });

  it("drills fresh and explicitly selected-branch migration paths before pushing", () => {
    const wrapper = read("scripts/push-and-deploy.ps1");
    const drill = read("scripts/test-migration-paths.mjs");

    expect(wrapper).toContain("test-migration-paths.mjs");
    expect(wrapper).toContain(
      'node -Arguments @("scripts/test-migration-paths.mjs", $Branch)',
    );
    expect(drill).not.toContain("origin/main");
    expect(drill).toContain("process.argv[2]");
    expect(drill).toContain("origin/${migrationBaseBranch}");
    expect(drill).toContain("migration_fresh");
    expect(drill).toContain("migration_upgrade");
    expect(drill).toContain("prisma");
    expect(drill).toContain("migrate");
    expect(drill).toContain("deploy");
    expect(drill).toContain("diff");
    expect(drill).toContain("--exit-code");
    expect(drill).toContain("let operationError");
    expect(drill).toContain("const cleanupFailures = []");
    expect(drill).toContain("cleanupResult.error || cleanupResult.status !== 0");
    expect(drill).toContain("Migration drill cleanup failed:");
    expect(drill).toContain("new AggregateError");
  });

  it("overrides both Prisma database URLs for every local migration drill command", () => {
    const drill = read("scripts/test-migration-paths.mjs");

    expect(drill).toMatch(
      /function localDatabaseEnvironment\(url\)\s*\{\s*return\s*\{\s*DATABASE_URL:\s*url,\s*DIRECT_URL:\s*url\s*,?\s*\}/,
    );
    expect(drill).toMatch(/function migrate\(schema, url\)[\s\S]*?env:\s*localDatabaseEnvironment\(url\)/);
    expect(drill).toMatch(
      /function assertMigrationStatus\(schema, url\)[\s\S]*?env:\s*localDatabaseEnvironment\(url\)/,
    );
    expect(drill).toMatch(
      /function assertNoSchemaDrift\(schema, url\)[\s\S]*?env:\s*localDatabaseEnvironment\(url\)/,
    );
  });

  it("keeps standalone migration checks on a local Docker endpoint and never pulls images", () => {
    const wrapper = read("scripts/push-and-deploy.ps1");
    const drill = read("scripts/test-migration-paths.mjs");
    const contextGuard = drill.indexOf("assertLocalDockerContext();");
    const imageRun = drill.indexOf('"postgres:16-alpine"');
    const wrapperImageRun = wrapper.indexOf('"postgres:16-alpine"');
    const wrapperDockerRun = wrapper.lastIndexOf('"run", "--rm"', wrapperImageRun);

    expect(drill).toContain("function assertLocalDockerContext()");
    expect(drill).toContain("process.env.DOCKER_HOST?.trim()");
    expect(drill).toContain('["context", "show"]');
    expect(drill).toContain('["context", "inspect", contextName');
    const nodeEndpointPattern = drill.match(
      /const LOCAL_DOCKER_ENDPOINT_PATTERN\s*=\s*("[^"]+");/,
    );
    expect(nodeEndpointPattern).not.toBeNull();
    const nodeEndpointPatternSource = JSON.parse(nodeEndpointPattern?.[1] ?? "\"\"");
    const allowedEndpoint = new RegExp(nodeEndpointPatternSource, "i");
    expect(allowedEndpoint.test("unix:///var/run/docker.sock")).toBe(true);
    expect(allowedEndpoint.test("npipe:////./pipe/docker_engine")).toBe(true);
    expect(allowedEndpoint.test("npipe://./pipe/docker_engine")).toBe(true);
    expect(allowedEndpoint.test("npipe:////./pipe/dockerDesktopLinuxEngine")).toBe(true);
    expect(allowedEndpoint.test("npipe://./pipe/dockerDesktopLinuxEngine")).toBe(true);
    expect(allowedEndpoint.test("tcp://192.0.2.10:2375")).toBe(false);
    expect(allowedEndpoint.test("unix://remote/var/run/docker.sock")).toBe(false);
    expect(allowedEndpoint.test("npipe:////remote/pipe/docker_engine")).toBe(false);
    const powershellEndpointPattern = wrapper.match(
      /\$localDockerEndpointPattern\s*=\s*'([^']+)'/,
    );
    expect(powershellEndpointPattern).not.toBeNull();
    const powershellAllowedEndpoint = new RegExp(
      powershellEndpointPattern?.[1] ?? "",
      "i",
    );
    expect(powershellEndpointPattern?.[1]).toBe(nodeEndpointPatternSource);
    expect(powershellAllowedEndpoint.test("npipe:////./pipe/docker_engine")).toBe(true);
    expect(powershellAllowedEndpoint.test("npipe://./pipe/docker_engine")).toBe(true);
    expect(powershellAllowedEndpoint.test("npipe:////./pipe/dockerDesktopLinuxEngine")).toBe(true);
    expect(powershellAllowedEndpoint.test("npipe://./pipe/dockerDesktopLinuxEngine")).toBe(true);
    expect(powershellAllowedEndpoint.test("tcp://192.0.2.10:2375")).toBe(false);
    expect(powershellAllowedEndpoint.test("npipe:////remote/pipe/docker_engine")).toBe(false);
    expect(powershellAllowedEndpoint.test("npipe:////remote/pipe/dockerDesktopLinuxEngine")).toBe(false);
    expect(wrapper).toContain(
      "$localDockerEndpointPattern = '^(?:unix:///(?!/).+|npipe:////\\./pipe/(?:docker_engine|dockerDesktopLinuxEngine)|npipe://\\./pipe/(?:docker_engine|dockerDesktopLinuxEngine))$'",
    );
    expect(wrapper).toContain("if ($dockerEndpoint -notmatch $localDockerEndpointPattern)");
    expect(contextGuard).toBeGreaterThan(-1);
    expect(contextGuard).toBeLessThan(imageRun);
    expect(drill).toMatch(/"run",\s*"-d",\s*"--rm",\s*"--pull=never"/);
    expect(wrapper.indexOf('"--pull=never"', wrapperDockerRun)).toBeGreaterThan(wrapperDockerRun);
    expect(wrapper.indexOf('"--pull=never"', wrapperDockerRun)).toBeLessThan(wrapperImageRun);
  });

  it("masks dotenv database URLs and disables telemetry during the local build", () => {
    const wrapper = read("scripts/push-and-deploy.ps1");
    const buildIndex = wrapper.indexOf('Invoke-Native -FilePath npm -Arguments @("run", "build")');
    const telemetryDisabled = wrapper.indexOf('$env:NEXT_TELEMETRY_DISABLED = "1"');
    const databaseMask = wrapper.lastIndexOf("$env:DATABASE_URL = $releaseCheckDatabaseUrl", buildIndex);
    const directUrlMask = wrapper.lastIndexOf("$env:DIRECT_URL = $releaseCheckDatabaseUrl", buildIndex);
    const restoreIndex = wrapper.indexOf("} finally {", buildIndex);

    expect(wrapper).toContain(
      '$releaseCheckDatabaseUrl = "postgresql://127.0.0.1:1/enhe-release-check?connect_timeout=1"',
    );
    expect(wrapper).toContain("$previousDirectUrl = $env:DIRECT_URL");
    expect(wrapper).toContain('$env:NEXT_TELEMETRY_DISABLED = "1"');
    expect(telemetryDisabled).toBeGreaterThan(-1);
    expect(telemetryDisabled).toBeLessThan(buildIndex);
    expect(databaseMask).toBeGreaterThan(-1);
    expect(directUrlMask).toBeGreaterThan(-1);
    expect(databaseMask).toBeLessThan(buildIndex);
    expect(directUrlMask).toBeLessThan(buildIndex);
    expect(wrapper.indexOf("$env:DIRECT_URL = $previousDirectUrl", restoreIndex)).toBeGreaterThan(
      restoreIndex,
    );
    expect(wrapper.indexOf("$env:NEXT_TELEMETRY_DISABLED = $previousNextTelemetryDisabled", restoreIndex)).toBeGreaterThan(
      restoreIndex,
    );
  });

  it("disables the local admin fixture mode for release E2E and restores the caller setting", () => {
    const wrapper = read("scripts/push-and-deploy.ps1");
    const e2eCommand = wrapper.indexOf('Invoke-Native -FilePath npm -Arguments @("run", "test:e2e")');
    const fixtureModeDisabled = wrapper.lastIndexOf("$env:ENHE_ADMIN_VISUAL_FIXTURE = $null", e2eCommand);
    const restoreIndex = wrapper.indexOf("} finally {", e2eCommand);

    expect(wrapper).toContain("$previousAdminVisualFixture = $env:ENHE_ADMIN_VISUAL_FIXTURE");
    expect(fixtureModeDisabled).toBeGreaterThan(-1);
    expect(fixtureModeDisabled).toBeLessThan(e2eCommand);
    expect(wrapper.indexOf("$env:ENHE_ADMIN_VISUAL_FIXTURE = $previousAdminVisualFixture", restoreIndex)).toBeGreaterThan(
      restoreIndex,
    );
  });

  it("checks the production checkout before updating the release branch", () => {
    const wrapper = read("scripts/push-and-deploy.ps1");
    const remoteCleanGuard =
      'test -z "$(git status --porcelain --untracked-files=all)"';
    const remoteCleanIndex = wrapper.indexOf(remoteCleanGuard);
    const pushIndex = wrapper.indexOf(
      'Invoke-Native -FilePath git -Arguments @("push", "origin"',
    );

    expect(remoteCleanIndex).toBeGreaterThan(-1);
    expect(pushIndex).toBeGreaterThan(remoteCleanIndex);
  });

  it("serializes every production mutation with one inherited host lock", () => {
    const wrapper = read("scripts/push-and-deploy.ps1");
    const lockHelper = read(
      "deploy/enhe-ai-tools/scripts/enhe-operation-lock.sh",
    );
    const scripts = [
      read("deploy.sh"),
      read("deploy/enhe-ai-tools/scripts/enhe-backup-db.sh"),
      read("deploy/enhe-ai-tools/scripts/enhe-restore-db.sh"),
      read("deploy/enhe-ai-tools/scripts/enhe-rollback-app.sh"),
      read("deploy/enhe-ai-tools/scripts/enhe-start.sh"),
    ];
    const lockPath = "deploy/enhe-ai-tools/runtime/enhe-operation.lock";

    expect(lockHelper).toContain("acquire_enhe_operation_lock");
    expect(lockHelper).toContain("flock -n 9");
    expect(lockHelper).toContain("/proc/self/fd/9");
    for (const script of scripts) {
      expect(script).toContain("enhe-operation-lock.sh");
      expect(script).toContain("acquire_enhe_operation_lock");
    }
    expect(wrapper).toContain(lockPath);
    expect(wrapper.indexOf("flock -n 9")).toBeLessThan(
      wrapper.indexOf('test -z "$(git status --porcelain --untracked-files=all)"'),
    );
    expect(wrapper).toContain("test-release-shell-behavior.sh");
  });

  it("drills the actual rollback image against a migrated database clone", () => {
    const deploy = read("deploy.sh");
    const drill = read(
      "deploy/enhe-ai-tools/scripts/enhe-verify-rollback-compatibility.sh",
    );
    const probe = read(
      "deploy/enhe-ai-tools/scripts/legacy-rollback-compatibility.cjs",
    );
    const rollback = read("deploy/enhe-ai-tools/scripts/enhe-rollback-app.sh");
    const backupIndex = deploy.indexOf("enhe-backup-db.sh");
    const drillIndex = deploy.indexOf('sh "$ROLLBACK_COMPATIBILITY_SCRIPT"');
    const migrateIndex = deploy.indexOf("prisma migrate deploy");

    expect(drillIndex).toBeGreaterThan(backupIndex);
    expect(migrateIndex).toBeGreaterThan(drillIndex);
    expect(drill).toContain("pg_restore --exit-on-error");
    expect(drill).toContain("psql -v ON_ERROR_STOP=1");
    expect(drill).toContain('-Atqc "SELECT 1"');
    expect(drill).not.toContain(
      'pg_isready -U "$db_user" -d "$db_name"',
    );
    expect(drill).toContain("prisma migrate deploy");
    expect(drill).toContain("/api/health?scope=app");
    expect(drill).toContain("AUDIT_WORKER_TOKEN_CURRENT=rollback-compatibility-");
    expect(drill).toContain(
      "SEO_AUDIT_ANONYMOUS_HMAC_SECRET=rollback-compatibility-",
    );
    expect(drill).toContain('run_app_health_probe "$candidate_image"');
    expect(drill).toContain('run_app_health_probe "$rollback_image"');
    for (const model of [
      "user",
      "tool",
      "order",
      "paymentTransaction",
      "paymentProof",
      "toolPurchase",
      "adminAuditLog",
    ]) {
      expect(probe).toContain(`prisma.${model}.findFirst`);
    }
    expect(rollback).not.toContain("prisma migrate status");
  });

  it("restarts the exact previous containers when a pre-migration gate fails", () => {
    const deploy = read("deploy.sh");
    const recovery = read(
      "deploy/enhe-ai-tools/scripts/enhe-recover-pre-migration-runtime.sh",
    );
    const drillIndex = deploy.indexOf('sh "$ROLLBACK_COMPATIBILITY_SCRIPT"');
    const migrationStateIndex = deploy.indexOf("PRODUCTION_MIGRATION_STARTED=1");
    const migrateIndex = deploy.indexOf(
      "'cd /app && ./node_modules/.bin/prisma migrate deploy'",
    );

    expect(deploy).toContain("WRITER_QUIESCE_STARTED=1");
    expect(deploy).toContain("enhe-recover-pre-migration-runtime.sh");
    expect(deploy).toContain('if [ "$PRODUCTION_MIGRATION_STARTED" -eq 0 ]');
    expect(migrationStateIndex).toBeGreaterThan(drillIndex);
    expect(migrateIndex).toBeGreaterThan(migrationStateIndex);
    expect(recovery).toContain("PREVIOUS_APP_IMAGE_ID");
    expect(recovery).toContain("PREVIOUS_WORKER_IMAGE_ID");
    expect(recovery).toContain("PREVIOUS_SCHEDULER_IMAGE_ID");
    expect(recovery).toContain('docker start "$APP_CONTAINER"');
    expect(recovery).toContain('docker start "$WORKER_CONTAINER"');
    expect(recovery).toContain('docker start "$SCHEDULER_CONTAINER"');
  });

  it("does not evaluate administrator credentials through a shell", () => {
    const initializer = read("deploy/enhe-ai-tools/scripts/enhe-init-admin.sh");

    expect(initializer).not.toContain('. "$ENV_FILE"');
    expect(initializer).not.toContain("set -a");
    expect(initializer).toContain("node prisma/ensure-super-admin.js");
  });

  it("uses the same fixed production env files as Docker Compose", () => {
    const deploy = read("deploy.sh");
    const rollback = read("deploy/enhe-ai-tools/scripts/enhe-rollback-app.sh");
    const start = read("deploy/enhe-ai-tools/scripts/enhe-start.sh");
    const stop = read("deploy/enhe-ai-tools/scripts/enhe-stop.sh");

    for (const script of [deploy, rollback, start]) {
      expect(script).toContain("deploy/enhe-ai-tools/.env");
      expect(script).toContain("zpay.env");
      expect(script).not.toContain("ENHE_ENV_FILE");
      expect(script).not.toContain("ENHE_ZPAY_ENV_FILE");
    }
    expect(stop).not.toContain("docker compose");
  });

  it("isolates DATABASE_URL changes in DB-free Vitest suites", () => {
    const dbFreeSuites = [
      "src/lib/prisma-client-lazy.test.ts",
      "src/lib/ai-news-detail-dbfree-module.test.ts",
      "src/lib/ai-news-detail-dbfree.test.ts",
      "src/lib/ai-news-topic-dbfree-module.test.ts",
      "src/lib/pricing-page-shell-dbfree.test.tsx",
      "src/lib/tool-detail-dbfree.test.ts",
    ];

    for (const path of dbFreeSuites) {
      const source = read(path);

      expect(source).toContain('vi.stubEnv("DATABASE_URL", undefined)');
      expect(source).toContain("vi.unstubAllEnvs()");
      expect(source).not.toMatch(/delete process\.env\.DATABASE_URL/);
      expect(source).not.toMatch(/process\.env\.DATABASE_URL\s*=/);
    }
  });

  it("pins the SSH host key and preserves old backups during release deployment", () => {
    const wrapper = read("scripts/push-and-deploy.ps1");
    const rootDeployCommand = wrapper.indexOf("$rootDeployCommand = @(");
    const rootWorkingDirectory = wrapper.indexOf('"cd $RemoteProjectDir"', rootDeployCommand);
    const rootReleaseRefCheck = wrapper.indexOf(
      "'test \"$(git rev-parse HEAD)\" = \"$RELEASE_REF\"'",
      rootDeployCommand,
    );
    const lockRelease = wrapper.indexOf("'flock -u 9'");
    const lockClose = wrapper.indexOf("'exec 9>&-'", lockRelease);
    const elevatedDeploy = wrapper.indexOf("sudo -n env RETENTION_DAYS=36500", lockClose);

    expect(wrapper.match(/StrictHostKeyChecking=yes/g) ?? []).toHaveLength(2);
    expect(wrapper).not.toContain("StrictHostKeyChecking=accept-new");
    expect(rootDeployCommand).toBeGreaterThan(-1);
    expect(rootDeployCommand).toBeLessThan(lockRelease);
    expect(rootWorkingDirectory).toBeGreaterThan(rootDeployCommand);
    expect(rootReleaseRefCheck).toBeGreaterThan(rootWorkingDirectory);
    expect(lockRelease).toBeGreaterThan(-1);
    expect(lockClose).toBeGreaterThan(lockRelease);
    expect(elevatedDeploy).toBeGreaterThan(lockClose);
    expect(wrapper).toContain("unset ENHE_OPERATION_LOCK_HELD ENHE_OPERATION_LOCK_FILE");
    expect(wrapper).toContain('exec 9>"$remote_lock_file"');
    expect(wrapper).toContain('test "$(git rev-parse HEAD)" = "$RELEASE_REF"');
    expect(wrapper).not.toContain(
      "sudo -n env RETENTION_DAYS=36500 ENHE_OPERATION_LOCK_HELD=1",
    );
    expect(wrapper.indexOf("PREVIOUS_RELEASE_REF=", elevatedDeploy)).toBeGreaterThan(
      elevatedDeploy,
    );
    expect(wrapper).toContain("'exec sh ./deploy.sh'");
  });
});
