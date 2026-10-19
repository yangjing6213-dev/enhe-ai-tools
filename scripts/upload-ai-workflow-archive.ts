import { createHash } from "node:crypto";
import { realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { Readable, Transform, Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { getAiWorkflowCosConfig, getAiWorkflowCosOperationFailure, getAiWorkflowDownloadUrl, uploadAiWorkflowArchive } from "../src/lib/ai-workflows/cos";
import { readAiWorkflowCosCredentialsCsv } from "./lib/ai-workflow-cos-credentials";

const runsRoot = "E:\\AiProject\\各平台内容发布项目\\ai-workflows\\runs";
const credentialsCsv = "E:\\个人工作区域\\个人文档\\腾讯云子用户的密钥\\新建子用户信息.csv";

function isWithinRoot(root: string, filePath: string) {
  const pathFromRoot = relative(root, filePath);
  return pathFromRoot !== "" && pathFromRoot !== ".." && !pathFromRoot.startsWith(`..${sep}`) && !isAbsolute(pathFromRoot);
}

async function verifyAnonymousReadIsDenied(bucket: string, region: string, objectKey: string) {
  const keyPath = objectKey.split("/").map(encodeURIComponent).join("/");
  const url = `https://${bucket}.cos.${region}.myqcloud.com/${keyPath}`;
  const response = await fetch(url, { method: "GET", headers: { Range: "bytes=0-0" }, redirect: "manual" });
  if (response.ok || response.status === 206 || (response.status >= 300 && response.status < 400)) {
    throw new Error("Anonymous COS access was not denied for the private archive.");
  }
  if (![401, 403].includes(response.status)) {
    throw new Error(`Anonymous COS check returned an unexpected status (${response.status}).`);
  }
  return response.status;
}

async function verifySignedRead(input: {
  fileName: string;
  filePath: string;
  storageBucket: string;
  objectKey: string;
}, env: Record<string, string | undefined>) {
  const url = getAiWorkflowDownloadUrl(input, env);
  const response = await fetch(url, { redirect: "manual" });
  if (!response.ok || !response.body) throw new Error(`Signed COS download failed with status ${response.status}.`);
  const hash = createHash("sha256");
  let byteCount = 0;
  const hashStream = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      byteCount += chunk.length;
      hash.update(chunk);
      callback(null, chunk);
    },
  });
  const discard = new Writable({ write(_chunk, _encoding, callback) { callback(); } });
  const body = Readable.fromWeb(response.body as import("node:stream/web").ReadableStream<Uint8Array>);
  await pipeline(body, hashStream, discard);
  return { byteCount, sha256: hash.digest("hex") };
}

async function main() {
  const [archiveArgument, repositoryId, commitSha, ...options] = process.argv.slice(2);
  if (!archiveArgument || !repositoryId || !commitSha || options.some((option) => option !== "--read-verify")) {
    throw new Error("Usage: npx tsx scripts/upload-ai-workflow-archive.ts <zip-path> <github-repository-id> <fixed-commit-sha> [--read-verify]");
  }

  let stage = "validate_archive_path";
  let cosFailureContext: { bucket: string; objectKey: string } | null = null;
  try {
    const absoluteRoot = await realpath(runsRoot);
    const requestedArchive = resolve(archiveArgument);
    const archivePath = await realpath(requestedArchive);
    if (!isWithinRoot(absoluteRoot, archivePath)) throw new Error("Archive must be inside the configured AI Workflow run directory.");
    const relativeArchive = relative(absoluteRoot, archivePath).split(sep);
    if (relativeArchive.length < 3 || relativeArchive[1] !== repositoryId) {
      throw new Error("Archive path must be inside <run-id>/<repository-id>/ under the configured runs directory.");
    }

    stage = "read_credentials";
    const credentials = await readAiWorkflowCosCredentialsCsv(credentialsCsv);
    const uploadEnv = {
      ...process.env,
      COS_SECRET_ID: credentials.secretId,
      COS_SECRET_KEY: credentials.secretKey,
    };
    const cosConfig = getAiWorkflowCosConfig(uploadEnv);
    cosFailureContext = {
      bucket: cosConfig?.downloadBucket ?? "unknown",
      objectKey: `ai-workflows/${repositoryId}/<fixed-commit>/<package-hash>.zip`,
    };

    stage = "upload_and_remote_integrity_check";
    const result = await uploadAiWorkflowArchive({ archivePath, repositoryId, commitSha, env: uploadEnv });
    const anonymousStatus = await verifyAnonymousReadIsDenied(result.bucket, result.region, result.objectKey);
    const report: Record<string, unknown> = { ...result, anonymousReadStatus: anonymousStatus };

    if (options.includes("--read-verify")) {
      stage = "signed_full_read_check";
      const readback = await verifySignedRead({
        fileName: result.fileName,
        filePath: result.filePath,
        storageBucket: result.bucket,
        objectKey: result.objectKey,
      }, uploadEnv);
      if (readback.byteCount !== result.fileSize || readback.sha256 !== result.packageSha256) {
        throw new Error("Signed COS download SHA-256 or size did not match the local archive.");
      }
      report.fullReadVerification = readback;
    }

    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } catch (error) {
    const operation = cosFailureContext
      ? getAiWorkflowCosOperationFailure(error, cosFailureContext.bucket, cosFailureContext.objectKey)
      : { operation: "ai_workflow_cos", statusCode: 0, code: error instanceof Error ? error.name : "UNKNOWN", requestId: null };
    process.stderr.write(`${JSON.stringify({ ok: false, stage, ...operation })}\n`);
    process.stderr.write("AI Workflow archive upload failed. Secret values, CSV contents, signed URLs, and raw service errors were not printed.\n");
    process.exitCode = 1;
  }
}

main().catch(() => {
  process.stderr.write("AI Workflow archive upload failed (UNEXPECTED). Secret values, CSV contents, signed URLs, and raw service errors were not printed.\n");
  process.exitCode = 1;
});
