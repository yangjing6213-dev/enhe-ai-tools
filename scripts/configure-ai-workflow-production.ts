import { randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { lstat, mkdir, rename, rm, stat } from "node:fs/promises";
import { homedir, hostname } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { readAiWorkflowCosCredentialsCsv } from "./lib/ai-workflow-cos-credentials";

const runnerRoot = "E:\\AiProject\\各平台内容发布项目\\ai-workflows\\runner";
const credentialsCsv = "E:\\个人工作区域\\个人文档\\腾讯云子用户的密钥\\新建子用户信息.csv";
const server = "ubuntu@111.229.135.3";
const keyPath = join(homedir(), ".ssh", "enhe-ai-tools-tencent.pem");
const protectedTokenPath = join(runnerRoot, "worker-token.dpapi");
const temporaryTokenPath = join(runnerRoot, `worker-token.${randomUUID()}.dpapi.tmp`);
const serverBackupName = `.env.ai-workflow-backup-${new Date().toISOString().replace(/\D/g, "")}-${randomUUID()}`;
const powershell = process.env.SystemRoot
  ? join(process.env.SystemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe")
  : "powershell.exe";

const remoteUpdate = String.raw`
import datetime, json, os, pathlib, re, stat, sys, tempfile
request = json.load(sys.stdin)
allowed = {"AI_WORKFLOW_WORKER_TOKEN", "COS_SECRET_ID", "COS_SECRET_KEY", "COS_REGION", "COS_STATIC_BUCKET", "COS_DOWNLOAD_BUCKET", "COS_STATIC_BASE_URL", "COS_DOWNLOAD_BASE_URL", "COS_DOWNLOAD_DOMAIN_VERIFIED", "COS_SIGN_EXPIRES_SECONDS", "backupName"}
values = request.get("values")
backup_name = request.get("backupName")
if not isinstance(values, dict) or set(values) != allowed - {"backupName"} or any(not isinstance(value, str) or "\n" in value or "\r" in value for value in values.values()) or not isinstance(backup_name, str) or not re.fullmatch(r"\.env\.ai-workflow-backup-[0-9A-Fa-f-]{36,64}", backup_name):
    raise SystemExit(10)
if not re.fullmatch(r"[0-9a-f]{96}", values["AI_WORKFLOW_WORKER_TOKEN"]) or not re.fullmatch(r"[A-Za-z0-9+/=_-]{1,256}", values["COS_SECRET_ID"]) or not re.fullmatch(r"[A-Za-z0-9+/=_-]{1,256}", values["COS_SECRET_KEY"]):
    raise SystemExit(11)
path = pathlib.Path("/opt/enhe-ai-tools/deploy/enhe-ai-tools/.env")
if path.is_symlink() or not path.is_file():
    raise SystemExit(12)
metadata = path.stat()
if metadata.st_uid != 0 or stat.S_IMODE(metadata.st_mode) & 0o077:
    raise SystemExit(13)
text = path.read_text(encoding="utf-8")
lines = text.splitlines(keepends=True)
for key in values:
    matches = [index for index, line in enumerate(lines) if re.match(r"^" + re.escape(key) + r"=", line)]
    if len(matches) > 1:
        raise SystemExit(14)
    newline = "\r\n" if matches and lines[matches[0]].endswith("\r\n") else "\n"
    replacement = key + "=" + values[key] + newline
    if matches:
        lines[matches[0]] = replacement
    else:
        if lines and not lines[-1].endswith(("\n", "\r")):
            lines[-1] += "\n"
        lines.append(replacement)
backup = path.with_name(backup_name)
fd = os.open(backup, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
with os.fdopen(fd, "wb") as stream:
    stream.write(path.read_bytes())
    stream.flush()
    os.fsync(stream.fileno())
os.chown(backup, 0, 0)
os.chmod(backup, 0o600)
fd, temporary = tempfile.mkstemp(prefix=".enhe-ai-workflow-", dir=str(path.parent))
try:
    with os.fdopen(fd, "wb") as stream:
        stream.write("".join(lines).encode("utf-8"))
        stream.flush()
        os.fsync(stream.fileno())
    os.chown(temporary, 0, 0)
    os.chmod(temporary, 0o600)
    os.replace(temporary, path)
    directory = os.open(path.parent, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
    try:
        os.fsync(directory)
    finally:
        os.close(directory)
except Exception:
    try:
        os.unlink(temporary)
    except FileNotFoundError:
        pass
    raise
print(json.dumps({"ok": True, "backup": str(backup), "configured": sorted(values.keys())}))
`;

const remoteRestore = String.raw`
import json, os, pathlib, stat, sys, tempfile
request = json.load(sys.stdin)
backup_name = request.get("backupName")
if not isinstance(backup_name, str) or not backup_name.startswith(".env.ai-workflow-backup-") or "/" in backup_name or "\\" in backup_name:
    raise SystemExit(20)
directory = pathlib.Path("/opt/enhe-ai-tools/deploy/enhe-ai-tools")
path = directory / ".env"
backup = directory / backup_name
if path.is_symlink() or backup.is_symlink() or not backup.is_file():
    raise SystemExit(21)
metadata = backup.stat()
if metadata.st_uid != 0 or stat.S_IMODE(metadata.st_mode) & 0o077:
    raise SystemExit(22)
fd, temporary = tempfile.mkstemp(prefix=".enhe-ai-workflow-restore-", dir=str(directory))
try:
    with os.fdopen(fd, "wb") as stream:
        stream.write(backup.read_bytes())
        stream.flush()
        os.fsync(stream.fileno())
    os.chown(temporary, 0, 0)
    os.chmod(temporary, 0o600)
    os.replace(temporary, path)
    directory_fd = os.open(directory, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
    try:
        os.fsync(directory_fd)
    finally:
        os.close(directory_fd)
except Exception:
    try:
        os.unlink(temporary)
    except FileNotFoundError:
        pass
    raise
print(json.dumps({"restored": True}))
`;

function run(file: string, args: string[], input: string, maxOutput = 4000) {
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(file, args, {
      windowsHide: true,
      stdio: "pipe",
      env: {
        SystemRoot: process.env.SystemRoot,
        WINDIR: process.env.WINDIR,
        ProgramData: process.env.ProgramData,
        NODE_ENV: "production",
        PATH: `${process.env.SystemRoot ?? "C:\\Windows"}\\System32`,
        USERPROFILE: process.env.USERPROFILE,
        HOME: process.env.USERPROFILE ?? homedir(),
        TEMP: process.env.TEMP,
        TMP: process.env.TMP,
      },
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill(), 60000);
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => { if (stdout.length < maxOutput) stdout += chunk.slice(0, maxOutput - stdout.length); });
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => { if (stderr.length < maxOutput) stderr += chunk.slice(0, maxOutput - stderr.length); });
    child.on("error", (error) => { clearTimeout(timer); reject(error); });
    child.on("close", (code) => { clearTimeout(timer); resolve({ code: code ?? 1, stdout, stderr }); });
    child.stdin.end(input);
  });
}

async function restrictRunnerRoot() {
  await mkdir(runnerRoot, { recursive: true });
  if ((await lstat(runnerRoot)).isSymbolicLink()) throw new Error("LOCAL_TOKEN_PROTECTION_FAILED");
  const identity = `${process.env.USERDOMAIN ?? ""}\\${process.env.USERNAME ?? ""}`;
  if (identity === "\\") throw new Error("LOCAL_TOKEN_PROTECTION_FAILED");
  const icacls = process.env.SystemRoot ? join(process.env.SystemRoot, "System32", "icacls.exe") : "icacls.exe";
  const result = await run(icacls, [
    runnerRoot, "/inheritance:r", "/remove:g", "*S-1-1-0", "*S-1-5-11", "*S-1-5-32-545", "*S-1-5-4", "/grant:r",
    `${identity}:(OI)(CI)F`, "*S-1-5-18:(OI)(CI)F", "*S-1-5-32-544:(OI)(CI)F",
  ], "", 1000);
  if (result.code !== 0) throw new Error("LOCAL_TOKEN_PROTECTION_FAILED");
  await mkdir(join(runnerRoot, "empty-github-config"), { recursive: true });
  await mkdir(join(runnerRoot, "empty-docker-config"), { recursive: true });
}

async function protectToken(token: string) {
  await restrictRunnerRoot();
  const protectScript = join(process.cwd(), "scripts", "lib", "protect-ai-workflow-token.ps1");
  const protectedResult = await run(powershell, ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", protectScript, "-ProtectedFile", temporaryTokenPath], token);
  if (protectedResult.code !== 0 || protectedResult.stdout.trim() !== "PROTECTED") throw new Error("LOCAL_TOKEN_PROTECTION_FAILED");
  const verification = await run(powershell, ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", join(process.cwd(), "scripts", "lib", "read-protected-ai-workflow-token.ps1"), "-ProtectedFile", temporaryTokenPath], "");
  if (verification.code !== 0 || verification.stdout.trim() !== token) throw new Error("LOCAL_TOKEN_PROTECTION_FAILED");
}

async function updateServer(values: Record<string, string>) {
  if (!existsSync(keyPath)) throw new Error("SERVER_SSH_KEY_MISSING");
  const ssh = process.env.SystemRoot ? join(process.env.SystemRoot, "System32", "OpenSSH", "ssh.exe") : "ssh.exe";
  const encodedProgram = Buffer.from(remoteUpdate, "utf8").toString("hex");
  const remoteCommand = `sudo -n python3 -c 'exec(bytes.fromhex("${encodedProgram}").decode())'`;
  const result = await run(ssh, [
    "-i", keyPath,
    "-p", "22",
    "-o", "StrictHostKeyChecking=yes",
    "-o", "BatchMode=yes",
    server,
    remoteCommand,
  ], JSON.stringify({ values, backupName: serverBackupName }), 2500);
  if (result.code !== 0) throw new Error(`SERVER_ENV_UPDATE_FAILED_${result.code}`);
  let response: { ok?: boolean; backup?: string };
  try { response = JSON.parse(result.stdout.trim()) as typeof response; } catch { throw new Error("SERVER_ENV_UPDATE_UNCONFIRMED"); }
  if (!response.ok || !response.backup) throw new Error("SERVER_ENV_UPDATE_UNCONFIRMED");
  if (!response.backup.endsWith(serverBackupName)) throw new Error("SERVER_ENV_UPDATE_UNCONFIRMED");
  return response.backup;
}

async function restoreServer(backupPath: string) {
  if (!existsSync(keyPath)) return false;
  const ssh = process.env.SystemRoot ? join(process.env.SystemRoot, "System32", "OpenSSH", "ssh.exe") : "ssh.exe";
  const encodedProgram = Buffer.from(remoteRestore, "utf8").toString("hex");
  const remoteCommand = `sudo -n python3 -c 'exec(bytes.fromhex("${encodedProgram}").decode())'`;
  const backupName = backupPath.slice(backupPath.lastIndexOf("/") + 1);
  const result = await run(ssh, [
    "-i", keyPath, "-p", "22", "-o", "StrictHostKeyChecking=yes", "-o", "BatchMode=yes", server, remoteCommand,
  ], JSON.stringify({ backupName }), 1000);
  return result.code === 0 && JSON.parse(result.stdout.trim()).restored === true;
}

async function main() {
  if (process.platform !== "win32") throw new Error("WINDOWS_REQUIRED");
  const credentials = await readAiWorkflowCosCredentialsCsv(credentialsCsv);
  if (!/^[A-Za-z0-9+/=_-]{1,256}$/.test(credentials.secretId) || !/^[A-Za-z0-9+/=_-]{1,256}$/.test(credentials.secretKey)) {
    throw new Error("COS_CREDENTIAL_FORMAT_UNSUPPORTED");
  }
  const workerToken = randomBytes(48).toString("hex");
  const values = {
    AI_WORKFLOW_WORKER_TOKEN: workerToken,
    COS_SECRET_ID: credentials.secretId,
    COS_SECRET_KEY: credentials.secretKey,
    COS_REGION: "ap-shanghai",
    COS_STATIC_BUCKET: "enhe-static-1303691623",
    COS_DOWNLOAD_BUCKET: "enhe-downloads-1303691623",
    COS_STATIC_BASE_URL: "https://static.enhe-tech.com.cn",
    COS_DOWNLOAD_BASE_URL: "https://download.enhe-tech.com.cn",
    COS_DOWNLOAD_DOMAIN_VERIFIED: "true",
    COS_SIGN_EXPIRES_SECONDS: "3600",
  };
  let backupPath = "";
  let previousTokenPath = "";
  let serverUpdateAttempted = false;
  let localActivated = false;
  try {
    await protectToken(workerToken);
    if (!existsSync(keyPath)) throw new Error("SERVER_SSH_KEY_MISSING");
    serverUpdateAttempted = true;
    backupPath = await updateServer(values);
    const activePath = await stat(protectedTokenPath).then(() => protectedTokenPath).catch(() => "");
    if (activePath) {
      previousTokenPath = join(runnerRoot, `worker-token.previous-${new Date().toISOString().replace(/\D/g, "")}-${randomUUID()}.dpapi`);
      await rename(activePath, previousTokenPath);
    }
    await rename(temporaryTokenPath, protectedTokenPath);
    localActivated = true;
    process.stdout.write(`SERVER_ENV_UPDATED=true\nSERVER_ENV_BACKUP=${backupPath}\nLOCAL_WORKER_TOKEN_PROTECTED=true\nCOS_CREDENTIALS_SET=true\nHOST=${hostname()}\n`);
  } catch (error) {
    const updateFailure = error instanceof Error ? error.message : "";
    const rejectedBeforeBackup = /^SERVER_ENV_UPDATE_FAILED_1[0-4]$/.test(updateFailure);
    if (serverUpdateAttempted && !rejectedBeforeBackup) {
      const remotePath = backupPath || `/opt/enhe-ai-tools/deploy/enhe-ai-tools/${serverBackupName}`;
      const restored = await restoreServer(remotePath).catch(() => false);
      if (!restored) process.stderr.write(`SERVER_ENV_RESTORE=UNCONFIRMED\nSERVER_ENV_BACKUP_REMAINS=${remotePath}\n`);
    }
    if (localActivated) await rm(protectedTokenPath, { force: true }).catch(() => undefined);
    const activeExists = await stat(protectedTokenPath).then(() => true).catch(() => false);
    if (previousTokenPath && !activeExists) await rename(previousTokenPath, protectedTokenPath).catch(() => undefined);
    await rm(temporaryTokenPath, { force: true }).catch(() => undefined);
    const safeFailureCode = /^[A-Z0-9_]+$/.test(updateFailure) ? updateFailure : "CONFIGURATION_FAILED";
    process.stderr.write(`AI Workflow production credential setup did not complete (${safeFailureCode}). No secret values were displayed.\n`);
    if (backupPath) process.stderr.write(`SERVER_ENV_BACKUP_REMAINS=${backupPath}\n`);
    process.exitCode = 1;
  }
}

main().catch(() => {
  process.stderr.write("AI Workflow production credential setup failed. No secret values were displayed.\n");
  process.exitCode = 1;
});
