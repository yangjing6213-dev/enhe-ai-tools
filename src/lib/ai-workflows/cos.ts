import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { basename, extname } from "node:path";
import COS from "cos-nodejs-sdk-v5";

export type AiWorkflowCosConfig = {
  secretId: string;
  secretKey: string;
  region: string;
  staticBucket: string;
  downloadBucket: string;
  staticBaseUrl: string;
  downloadBaseUrl: string;
  useVerifiedDownloadDomain: boolean;
  signExpiresSeconds: number;
};

type Env = Record<string, string | undefined>;
type AiWorkflowArchiveFile = {
  fileName: string;
  filePath: string;
  storageBucket: string | null;
  objectKey: string | null;
};

const defaultRegion = "ap-shanghai";
const defaultStaticBucket = "enhe-static-1303691623";
const defaultDownloadBucket = "enhe-downloads-1303691623";
const defaultStaticBaseUrl = "https://enhe-static-1303691623.cos.ap-shanghai.myqcloud.com";
const defaultDownloadBaseUrl = "https://enhe-downloads-1303691623.cos.ap-shanghai.myqcloud.com";
const COS_CRC64_POLYNOMIAL_REFLECTED = BigInt("0xc96c5795d7870f42");
const COS_CRC64_MASK = BigInt("0xffffffffffffffff");

function parseHttpsBaseUrl(value: string | undefined, fallback: string) {
  if (!value?.trim()) return fallback;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || (url.pathname !== "/" && url.pathname !== "")) return fallback;
    return url.origin;
  } catch {
    return fallback;
  }
}

export function getAiWorkflowCosConfig(env: Env = process.env): AiWorkflowCosConfig | null {
  const secretId = env.COS_SECRET_ID?.trim();
  const secretKey = env.COS_SECRET_KEY?.trim();
  if (!secretId || !secretKey) return null;

  const region = env.COS_REGION?.trim() || defaultRegion;
  const signInput = Number(env.COS_SIGN_EXPIRES_SECONDS ?? "3600");
  const signExpiresSeconds = Number.isFinite(signInput) ? Math.max(60, Math.min(3600, Math.floor(signInput))) : 3600;
  return {
    secretId,
    secretKey,
    region,
    staticBucket: env.COS_STATIC_BUCKET?.trim() || defaultStaticBucket,
    downloadBucket: env.COS_DOWNLOAD_BUCKET?.trim() || defaultDownloadBucket,
    staticBaseUrl: parseHttpsBaseUrl(env.COS_STATIC_BASE_URL, defaultStaticBaseUrl),
    downloadBaseUrl: parseHttpsBaseUrl(env.COS_DOWNLOAD_BASE_URL, defaultDownloadBaseUrl),
    // DNS/TLS alone do not prove that a custom domain is bound to the correct COS bucket.
    useVerifiedDownloadDomain: env.COS_DOWNLOAD_DOMAIN_VERIFIED === "true",
    signExpiresSeconds,
  };
}

export function buildAiWorkflowArchiveObjectKey(repositoryId: string, commitSha: string, packageSha256: string) {
  const safeRepositoryId = repositoryId.trim();
  const safeCommit = commitSha.trim().toLowerCase();
  const safeSha = packageSha256.trim().toLowerCase();
  if (!/^\d+$/.test(safeRepositoryId)) throw new Error("GitHub repository ID must be numeric.");
  if (!/^[a-f0-9]{40,64}$/.test(safeCommit)) throw new Error("A fixed 40–64 character commit hash is required.");
  if (!/^[a-f0-9]{64}$/.test(safeSha)) throw new Error("A 64 character SHA-256 package hash is required.");
  return `ai-workflows/${safeRepositoryId}/${safeCommit}/${safeSha}.zip`;
}

function updateCosCrc64(crc: bigint, bytes: Uint8Array) {
  for (const byte of bytes) {
    crc ^= BigInt(byte);
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & BigInt(1)) !== BigInt(0) ? (crc >> BigInt(1)) ^ COS_CRC64_POLYNOMIAL_REFLECTED : crc >> BigInt(1);
    }
  }
  return crc;
}

export function calculateCosCrc64Ecma(value: Uint8Array) {
  return (updateCosCrc64(COS_CRC64_MASK, value) ^ COS_CRC64_MASK).toString(10);
}

export async function calculateCosCrc64EcmaFile(filePath: string) {
  let crc = COS_CRC64_MASK;
  for await (const chunk of createReadStream(filePath)) {
    crc = updateCosCrc64(crc, chunk as Buffer);
  }
  return (crc ^ COS_CRC64_MASK).toString(10);
}

function createCosClient(config: AiWorkflowCosConfig) {
  return new COS({ SecretId: config.secretId, SecretKey: config.secretKey, Timeout: 30_000 });
}

function getFileCrc64(headers: Record<string, unknown> | undefined) {
  if (!headers) return null;
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === "x-cos-hash-crc64ecma")?.[1];
  return entry === undefined || entry === null ? null : String(entry);
}

function getHeader(headers: Record<string, unknown> | undefined, name: string) {
  if (!headers) return null;
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1];
  return entry === undefined || entry === null ? null : String(entry);
}

function getSafeCosErrorDetails(error: unknown) {
  if (!error || typeof error !== "object") return { statusCode: 0, code: "UNKNOWN", requestId: null };
  const chain: Record<string, unknown>[] = [];
  const visited = new Set<object>();
  let current: unknown = error;
  for (let depth = 0; depth < 6 && current && typeof current === "object" && !visited.has(current); depth += 1) {
    visited.add(current);
    const record = current as Record<string, unknown>;
    chain.push(record);
    const next = record.error && typeof record.error === "object" ? record.error : record.cause;
    current = next;
  }
  const rawMessage = chain.flatMap((record) => [record.message, record.Message])
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();
  const rawCode = chain.map((record) => record.code ?? record.Code)
    .find((value) => typeof value === "string" && value.trim() && value.trim() !== "Error");
  const diagnosticCode = /access denied|unauthorized|forbidden/.test(rawMessage)
    ? "AccessDenied"
    : /invalidaccesskey|signaturedoesnotmatch|invalid signature/.test(rawMessage)
      ? "InvalidCredentialsOrSignature"
      : /getaddrinfo|enotfound|dns/.test(rawMessage)
        ? "NetworkDnsError"
        : /timed? ?out|timeout|etimedout/.test(rawMessage) || rawCode === "ETIMEDOUT"
          ? "NetworkTimeout"
          : /econnreset|econnrefused|socket|network/.test(rawMessage) || rawCode === "ECONNRESET" || rawCode === "ECONNREFUSED"
            ? "NetworkConnectionError"
            : /no such upload id/.test(rawMessage)
              ? "UploadSessionMissing"
              : /archive verification failed|remote size or crc64/.test(rawMessage)
                ? "RemoteIntegrityMismatch"
                : rawCode
                  ? String(rawCode).trim()
                  : rawMessage
                    ? "SdkError"
                    : "COS_ERROR";
  const firstValue = (key: string) => chain.map((record) => record[key]).find((value) => value !== undefined && value !== null && value !== "");
  const statusCode = chain.map((record) => Number(record.statusCode)).find((value) => Number.isFinite(value) && value > 0) ?? 0;
  const stage = firstValue("aiWorkflowStage");
  return {
    statusCode,
    code: diagnosticCode.slice(0, 80),
    requestId: String(firstValue("RequestId") ?? firstValue("requestId") ?? "").slice(0, 120) || null,
    ...(typeof stage === "string" ? { stage: stage.slice(0, 80) } : {}),
  };
}

function isNotFound(error: unknown) {
  const details = getSafeCosErrorDetails(error);
  return details.statusCode === 404 || details.code === "NoSuchKey" || details.code === "NotFound";
}

async function withCosRetry<T>(operation: () => Promise<T>, attempts = 3) {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const { statusCode, code } = getSafeCosErrorDetails(error);
      const retryable = [408, 429, 500, 502, 503, 504].includes(statusCode) || ["SlowDown", "RequestTimeout", "InternalError", "NetworkTimeout", "NetworkConnectionError"].includes(code);
      if (!retryable || attempt === attempts - 1) break;
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function withCosStage<T>(stage: string, operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (cause) {
    const error = new Error("AI Workflow COS operation failed.") as Error & { cause?: unknown; aiWorkflowStage?: string };
    error.cause = cause;
    error.aiWorkflowStage = stage;
    throw error;
  }
}

async function inspectExistingObject(client: InstanceType<typeof COS>, config: AiWorkflowCosConfig, objectKey: string, fileSize: number, crc64: string) {
  try {
    const head = await withCosRetry(() => client.headObject({ Bucket: config.downloadBucket, Region: config.region, Key: objectKey }));
    const remoteSize = Number(getHeader(head.headers, "content-length"));
    const remoteCrc64 = getFileCrc64(head.headers);
    if (remoteSize === fileSize && remoteCrc64 === crc64) return true;
    throw new Error("An immutable workflow archive key already exists with different content; refusing to overwrite it.");
  } catch (error) {
    if (isNotFound(error)) return false;
    throw error;
  }
}

export async function uploadAiWorkflowArchive(input: {
  archivePath: string;
  repositoryId: string;
  commitSha: string;
  env?: Env;
}) {
  const env = input.env ?? process.env;
  const config = getAiWorkflowCosConfig(env);
  if (!config) throw new Error("Dedicated AI Workflow COS credentials are not configured.");
  if (extname(input.archivePath).toLowerCase() !== ".zip") throw new Error("Only a ZIP delivery archive can be uploaded.");

  const archiveStat = await stat(input.archivePath);
  if (!archiveStat.isFile() || archiveStat.size <= 0) throw new Error("The delivery archive must be a non-empty regular file.");
  const packageSha256 = await import("node:crypto").then(({ createHash }) => new Promise<string>((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(input.archivePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  }));
  const crc64 = await calculateCosCrc64EcmaFile(input.archivePath);
  const objectKey = buildAiWorkflowArchiveObjectKey(input.repositoryId, input.commitSha, packageSha256);
  const client = createCosClient(config);
  const reused = await withCosStage("inspect_existing_object", () => withCosRetry(() => inspectExistingObject(client, config, objectKey, archiveStat.size, crc64)));

  if (!reused) {
    await withCosStage("upload_archive", () => withCosRetry(() => new Promise((resolve, reject) => {
      client.sliceUploadFile({
        Bucket: config.downloadBucket,
        Region: config.region,
        Key: objectKey,
        FilePath: input.archivePath,
        SliceSize: 8 * 1024 * 1024,
        ChunkSize: 8 * 1024 * 1024,
        ContentType: "application/zip",
        CacheControl: "private, no-store",
      }, (error, result) => error ? reject(error) : resolve(result));
    })));
  }

  const head = await withCosStage("verify_remote_size_and_crc64", () => withCosRetry(() => client.headObject({ Bucket: config.downloadBucket, Region: config.region, Key: objectKey })));
  const remoteSize = Number(getHeader(head.headers, "content-length"));
  const remoteCrc64 = getFileCrc64(head.headers);
  if (remoteSize !== archiveStat.size || remoteCrc64 !== crc64) {
    const error = new Error("COS archive verification failed: remote size or CRC64 did not match the local file.") as Error & { aiWorkflowStage?: string };
    error.aiWorkflowStage = remoteSize !== archiveStat.size ? "remote_size_mismatch" : "remote_crc64_mismatch";
    throw error;
  }

  return {
    bucket: config.downloadBucket,
    region: config.region,
    objectKey,
    filePath: `cos://${config.downloadBucket}/${objectKey}`,
    fileName: basename(input.archivePath),
    fileSize: archiveStat.size,
    contentType: "application/zip",
    commitSha: input.commitSha.toLowerCase(),
    packageSha256,
    crc64,
    reused,
    // The caller must persist this record only after confirming all other package gates.
  };
}

export function getAiWorkflowCosOperationFailure(error: unknown, bucket: string, objectKey: string) {
  const details = getSafeCosErrorDetails(error);
  return {
    operation: "ai_workflow_cos",
    bucket,
    prefix: objectKey.split("/").slice(0, 2).join("/"),
    statusCode: details.statusCode,
    code: details.code,
    requestId: details.requestId,
    ...(details.stage ? { cosStage: details.stage } : {}),
  };
}

export function getAiWorkflowDownloadUrl(file: AiWorkflowArchiveFile, env: Env = process.env) {
  const config = getAiWorkflowCosConfig(env);
  if (!config) throw new Error("Dedicated AI Workflow COS credentials are not configured.");
  const cosUrl = file.filePath.match(/^cos:\/\/([^/]+)\/(.+)$/);
  const bucket = file.storageBucket?.trim() || cosUrl?.[1];
  const objectKey = file.objectKey?.trim() || cosUrl?.[2];
  if (!bucket || !objectKey || !cosUrl || cosUrl[1] !== bucket || cosUrl[2] !== objectKey || bucket !== config.downloadBucket || !objectKey.startsWith("ai-workflows/") || !objectKey.endsWith(".zip")) {
    throw new Error("The workflow archive is not stored in the dedicated private download bucket.");
  }

  const downloadDomain = new URL(config.downloadBaseUrl).host;
  const client = createCosClient(config);
  const url = client.getObjectUrl({
    Bucket: bucket,
    Region: config.region,
    Key: objectKey,
    Method: "GET",
    Sign: true,
    Expires: config.signExpiresSeconds,
    Protocol: "https:",
    ...(config.useVerifiedDownloadDomain ? { Domain: downloadDomain } : {}),
    Query: {
      "response-content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
      "response-cache-control": "private, no-store",
    },
  });
  if (!url || !url.startsWith("https://")) throw new Error("COS did not return an HTTPS signed URL.");
  return url;
}
