import { randomBytes, createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import COS from "cos-nodejs-sdk-v5";
import {
  calculateCosCrc64Ecma,
  getAiWorkflowCosConfig,
  getAiWorkflowCosOperationFailure,
  getAiWorkflowDownloadUrl,
} from "../src/lib/ai-workflows/cos";
import { readAiWorkflowCosCredentialsCsv } from "./lib/ai-workflow-cos-credentials";

const credentialsCsv = "E:\\个人工作区域\\个人文档\\腾讯云子用户的密钥\\新建子用户信息.csv";
const runsRoot = "E:\\AiProject\\各平台内容发布项目\\ai-workflows\\runs";

function readHeader(headers: Record<string, unknown> | undefined, name: string) {
  if (!headers) return null;
  const found = Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1];
  return found === undefined || found === null ? null : String(found);
}

function sdkCall<T>(invoke: (callback: (error: unknown, result?: T) => void) => void) {
  return new Promise<T>((resolve, reject) => {
    invoke((error, result) => error ? reject(error) : result ? resolve(result) : reject(new Error("COS returned an empty response.")));
  });
}

async function fetchBytes(url: string, expectedHost: string, init?: RequestInit) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.host !== expectedHost) throw new Error("COS verification generated an unexpected host.");
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(30_000), redirect: "manual" });
  const bytes = Buffer.from(await response.arrayBuffer());
  return { status: response.status, bytes };
}

async function main() {
  const startedAt = new Date();
  const runId = `${startedAt.toISOString().replace(/[-:.TZ]/g, "")}-${randomBytes(5).toString("hex")}`;
  const verificationPrefix = `ai-workflows/verification/${runId}`;
  const reportPath = join(runsRoot, "verification", "cos", `${runId}.json`);
  const report: Record<string, unknown> = {
    runId,
    startedAt: startedAt.toISOString(),
    region: "ap-shanghai",
    buckets: {
      static: "enhe-static-1303691623",
      download: "enhe-downloads-1303691623",
    },
    prefix: verificationPrefix,
    retainedObjects: [] as Array<Record<string, unknown>>,
    checks: {},
  };
  let failureContext: { bucket: string; key: string } | null = null;

  try {
    const credentials = await readAiWorkflowCosCredentialsCsv(credentialsCsv);
    const env = {
      COS_SECRET_ID: credentials.secretId,
      COS_SECRET_KEY: credentials.secretKey,
      COS_REGION: "ap-shanghai",
      COS_STATIC_BUCKET: "enhe-static-1303691623",
      COS_DOWNLOAD_BUCKET: "enhe-downloads-1303691623",
      COS_STATIC_BASE_URL: "https://static.enhe-tech.com.cn",
      COS_DOWNLOAD_BASE_URL: "https://download.enhe-tech.com.cn",
      COS_SIGN_EXPIRES_SECONDS: "3600",
    };
    const config = getAiWorkflowCosConfig(env);
    if (!config) throw new Error("Dedicated COS credentials are unavailable.");
    const client = new COS({ SecretId: credentials.secretId, SecretKey: credentials.secretKey, Timeout: 30_000 });
    const staticBucketHost = `${config.staticBucket}.cos.${config.region}.myqcloud.com`;
    const downloadBucketHost = `${config.downloadBucket}.cos.${config.region}.myqcloud.com`;

    await sdkCall((callback) => client.headBucket({ Bucket: config.staticBucket, Region: config.region }, callback));
    await sdkCall((callback) => client.headBucket({ Bucket: config.downloadBucket, Region: config.region }, callback));
    (report.checks as Record<string, unknown>).headBucket = { static: "passed", download: "passed" };

    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jz1sAAAAASUVORK5CYII=", "base64");
    const imageKey = `${verificationPrefix}/sample.png`;
    failureContext = { bucket: config.staticBucket, key: imageKey };
    await sdkCall((callback) => client.putObject({
      Bucket: config.staticBucket,
      Region: config.region,
      Key: imageKey,
      Body: png,
      ContentLength: png.length,
      ContentType: "image/png",
      CacheControl: "public, max-age=60",
    }, callback));
    const imageSha = createHash("sha256").update(png).digest("hex");
    const imageCrc = calculateCosCrc64Ecma(png);
    const imageRecord: Record<string, unknown> = { bucket: config.staticBucket, key: imageKey, size: png.length, crc64: imageCrc, sha256: imageSha };
    (report.retainedObjects as Array<Record<string, unknown>>).push(imageRecord);
    const imageHead = await client.headObject({ Bucket: config.staticBucket, Region: config.region, Key: imageKey });
    if (Number(readHeader(imageHead.headers, "content-length")) !== png.length || readHeader(imageHead.headers, "x-cos-hash-crc64ecma") !== imageCrc) {
      throw new Error("Static COS object size or CRC64 did not match the uploaded image.");
    }
    const defaultImage = await fetchBytes(`https://${staticBucketHost}/${imageKey}`, staticBucketHost);
    const customImage = await fetchBytes(`https://static.enhe-tech.com.cn/${imageKey}`, "static.enhe-tech.com.cn");
    const imageChecks = {
      defaultDomain: { status: defaultImage.status, sha256Matches: createHash("sha256").update(defaultImage.bytes).digest("hex") === imageSha },
      customDomain: { status: customImage.status, sha256Matches: createHash("sha256").update(customImage.bytes).digest("hex") === imageSha },
    };
    if (defaultImage.status !== 200 || !imageChecks.defaultDomain.sha256Matches) throw new Error("The public static bucket image could not be read back intact.");
    (report.checks as Record<string, unknown>).image = imageChecks;
    imageRecord.customDomainStatus = customImage.status;

    const emptyZip = Buffer.alloc(22);
    emptyZip.writeUInt32LE(0x06054b50, 0);
    const archiveKey = `${verificationPrefix}/empty-test.zip`;
    failureContext = { bucket: config.downloadBucket, key: archiveKey };
    await sdkCall((callback) => client.putObject({
      Bucket: config.downloadBucket,
      Region: config.region,
      Key: archiveKey,
      Body: emptyZip,
      ContentLength: emptyZip.length,
      ContentType: "application/zip",
      CacheControl: "private, no-store",
    }, callback));
    const expectedArchiveSha = createHash("sha256").update(emptyZip).digest("hex");
    const archiveCrc = calculateCosCrc64Ecma(emptyZip);
    const archiveRecord: Record<string, unknown> = { bucket: config.downloadBucket, key: archiveKey, size: emptyZip.length, crc64: archiveCrc, sha256: expectedArchiveSha };
    (report.retainedObjects as Array<Record<string, unknown>>).push(archiveRecord);
    const archiveHead = await client.headObject({ Bucket: config.downloadBucket, Region: config.region, Key: archiveKey });
    if (Number(readHeader(archiveHead.headers, "content-length")) !== emptyZip.length || readHeader(archiveHead.headers, "x-cos-hash-crc64ecma") !== archiveCrc) {
      throw new Error("Private COS object size or CRC64 did not match the uploaded test archive.");
    }

    const anonymous = await fetchBytes(`https://${downloadBucketHost}/${archiveKey}`, downloadBucketHost, { headers: { Range: "bytes=0-0" } });
    if (![401, 403].includes(anonymous.status)) throw new Error("Anonymous access to the private download bucket was not denied.");
    const file = {
      fileName: "ENHE COS 私有下载验证.zip",
      filePath: `cos://${config.downloadBucket}/${archiveKey}`,
      storageBucket: config.downloadBucket,
      objectKey: archiveKey,
    };
    const defaultSignedUrl = getAiWorkflowDownloadUrl(file, env);
    const defaultSigned = await fetchBytes(defaultSignedUrl, downloadBucketHost);
    if (defaultSigned.status !== 200 || createHash("sha256").update(defaultSigned.bytes).digest("hex") !== expectedArchiveSha) {
      throw new Error("The signed default-domain download did not match the uploaded private archive.");
    }

    let customSigned: { status: number; bytes: Buffer } | null = null;
    try {
      const customSignedUrl = getAiWorkflowDownloadUrl(file, { ...env, COS_DOWNLOAD_DOMAIN_VERIFIED: "true" });
      customSigned = await fetchBytes(customSignedUrl, "download.enhe-tech.com.cn");
    } catch {
      customSigned = null;
    }
    const customVerified = Boolean(customSigned?.status === 200 && createHash("sha256").update(customSigned.bytes).digest("hex") === expectedArchiveSha);
    (report.checks as Record<string, unknown>).privateDownload = {
      anonymousStatus: anonymous.status,
      signedDefaultDomain: { status: defaultSigned.status, sha256Matches: true },
      signedCustomDomain: customSigned ? { status: customSigned.status, sha256Matches: customVerified } : { status: null, sha256Matches: false },
      customDomainVerified: customVerified,
    };
    archiveRecord.anonymousStatus = anonymous.status;
    archiveRecord.customDomainStatus = customSigned?.status ?? null;
    report.finishedAt = new Date().toISOString();
    report.result = "passed";
  } catch (error) {
    report.finishedAt = new Date().toISOString();
    report.result = "failed";
    report.failure = failureContext
      ? getAiWorkflowCosOperationFailure(error, failureContext.bucket, failureContext.key)
      : { operation: "ai_workflow_cos", statusCode: 0, code: error instanceof Error ? error.name : "UNKNOWN", requestId: null };
  } finally {
    const directory = join(runsRoot, "verification", "cos");
    await mkdir(directory, { recursive: true });
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.result !== "passed") process.exitCode = 1;
}

main().catch(() => {
  process.stderr.write("AI Workflow COS verification failed unexpectedly; no credential values or signed URLs were printed.\n");
  process.exitCode = 1;
});
