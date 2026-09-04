import { mkdir, unlink, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { buildPublicUploadUrl } from "@/lib/admin-form";
import { getUploadDiskPath } from "@/lib/upload-path";

type StorageEnv = Record<string, string | undefined>;

export type StoredUpload = {
  fileName: string;
  filePath: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  storage: "local" | "cos";
  objectKey: string;
};

type SaveUploadOptions = {
  folder: string;
  maxBytes: number;
  accept?: (file: File) => boolean;
  invalidTypeMessage?: string;
};

type DownloadFileRef = {
  filePath: string;
  fileUrl: string | null;
};

type CosFilePath = {
  bucket: string;
  key: string;
};

type CosDeletePlan =
  | {
      storage: "local";
      canDelete: false;
      missingEnvKeys: string[];
    }
  | {
      storage: "cos";
      canDelete: boolean;
      bucket: string;
      key: string;
      missingEnvKeys: string[];
    };

const cosRuntimeEnvKeys = ["TENCENT_COS_SECRET_ID", "TENCENT_COS_SECRET_KEY", "TENCENT_COS_REGION"] as const;

export const defaultAllowedUploadExtensions = [
  ".zip",
  ".rar",
  ".7z",
  ".exe",
  ".msi",
  ".dmg",
  ".pkg",
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".txt",
  ".csv",
  ".xlsx",
  ".docx",
  ".pptx"
] as const;

export function isCosStorageConfigured(env: StorageEnv = process.env) {
  return Boolean(
    env.TENCENT_COS_SECRET_ID?.trim() &&
      env.TENCENT_COS_SECRET_KEY?.trim() &&
      env.TENCENT_COS_BUCKET?.trim() &&
      env.TENCENT_COS_REGION?.trim()
  );
}

function getMissingCosRuntimeEnvKeys(env: StorageEnv = process.env) {
  return cosRuntimeEnvKeys.filter((key) => !env[key]?.trim());
}

export function getAllowedUploadExtensions(env: StorageEnv = process.env) {
  const raw = env.UPLOAD_ALLOWED_EXTENSIONS?.trim();
  const values = raw ? raw.split(",") : [...defaultAllowedUploadExtensions];
  return values
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .map((value) => (value.startsWith(".") ? value : `.${value}`));
}

export function isUploadExtensionAllowed(fileName: string, allowedExtensions = getAllowedUploadExtensions()) {
  const extension = extname(fileName).toLowerCase();
  return Boolean(extension && allowedExtensions.includes(extension));
}

export function resolveDeletableLocalUploadPath(filePath: string, env: StorageEnv = process.env, cwd = process.cwd()) {
  if (!filePath || parseCosFilePath(filePath)) return null;

  const uploadRoot = resolve(cwd, env.UPLOAD_DIR ?? join("public", "uploads"));
  const candidate = filePath.startsWith("/uploads/")
    ? resolve(getUploadDiskPath(filePath, cwd, env.UPLOAD_DIR))
    : resolve(cwd, filePath);

  if (candidate === uploadRoot || candidate.startsWith(`${uploadRoot}${sep}`)) return candidate;
  return null;
}

export function derivePublicUploadUrlFromFilePath(filePath: string, env: StorageEnv = process.env, cwd = process.cwd()) {
  if (!filePath || parseCosFilePath(filePath)) return null;

  const normalizedInput = filePath.replace(/\\/g, "/");
  if (normalizedInput.startsWith("/uploads/")) return normalizedInput;
  if (normalizedInput.startsWith("uploads/")) return `/${normalizedInput}`;

  const uploadRoot = resolve(cwd, env.UPLOAD_DIR ?? join("public", "uploads"));
  const candidate = resolve(cwd, filePath);
  const relativePath = relative(uploadRoot, candidate).replace(/\\/g, "/");
  if (!relativePath || relativePath.startsWith("../") || relativePath === ".." || relativePath.startsWith("..\\")) return null;
  return `/uploads/${relativePath}`;
}

export async function deleteStoredLocalFileIfSafe(filePath: string, env: StorageEnv = process.env, cwd = process.cwd()) {
  const target = resolveDeletableLocalUploadPath(filePath, env, cwd);
  if (!target) return false;
  try {
    await unlink(target);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

function sanitizeFileName(fileName: string) {
  const lower = fileName.trim().toLowerCase();
  const extension = lower.includes(".") ? lower.slice(lower.lastIndexOf(".")) : "";
  const baseName = lower
    .replace(extension, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${baseName || "file"}${extension.replace(/[^a-z0-9.]/g, "")}`;
}

export function createStorageObjectKey(folder: string, fileName: string, now: () => string = () => String(Date.now())) {
  const safeFolder = folder
    .trim()
    .toLowerCase()
    .replace(/\\/g, "/")
    .replace(/[^a-z0-9/_-]+/g, "-")
    .replace(/^\/+|\/+$/g, "");
  const safeName = sanitizeFileName(fileName);
  return [safeFolder, `${now()}-${safeName}`].filter(Boolean).join("/");
}

export function parseCosFilePath(filePath: string): CosFilePath | null {
  const match = filePath.match(/^cos:\/\/([^/]+)\/(.+)$/);
  if (!match?.[1] || !match[2]) return null;
  return { bucket: match[1], key: match[2] };
}

export function getCosDeletePlan(filePath: string, env: StorageEnv = process.env): CosDeletePlan {
  const cosPath = parseCosFilePath(filePath);
  if (!cosPath) return { storage: "local", canDelete: false, missingEnvKeys: [] };

  const missingEnvKeys = getMissingCosRuntimeEnvKeys(env);
  return {
    storage: "cos",
    canDelete: missingEnvKeys.length === 0,
    bucket: cosPath.bucket,
    key: cosPath.key,
    missingEnvKeys
  };
}

export function isRetryableStorageError(error: unknown) {
  const statusCode = typeof error === "object" && error && "statusCode" in error ? Number((error as { statusCode?: number }).statusCode) : 0;
  if ([408, 429, 500, 502, 503, 504].includes(statusCode)) return true;

  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return ["timeout", "socket", "econnreset", "etimedout", "network"].some((keyword) => message.includes(keyword));
}

export function getCosSignedUrlExpiresSeconds(env: StorageEnv = process.env) {
  const expires = Number(env.TENCENT_COS_SIGNED_URL_EXPIRES_SECONDS);
  if (!Number.isFinite(expires) || expires <= 0) return 600;
  return Math.floor(expires);
}

export async function getSecureFileDownloadUrl(file: DownloadFileRef, requestUrl: string, env: StorageEnv = process.env, cwd = process.cwd()) {
  const cosPath = parseCosFilePath(file.filePath);
  if (cosPath && isCosStorageConfigured(env)) {
    return new URL(await createCosSignedDownloadUrl(cosPath, env));
  }

  const publicUrl = file.fileUrl ?? derivePublicUploadUrlFromFilePath(file.filePath, env, cwd);
  if (!publicUrl) throw new Error("Download file URL is missing.");
  return new URL(publicUrl, requestUrl);
}

export async function saveUploadedFile(file: File, options: SaveUploadOptions): Promise<StoredUpload> {
  if (file.size > options.maxBytes) throw new Error(`文件超过 ${Math.floor(options.maxBytes / 1024 / 1024)}MB，请压缩后重新上传。`);
  if (options.accept && !options.accept(file)) throw new Error(options.invalidTypeMessage ?? "文件格式不支持。");

  if (!isUploadExtensionAllowed(file.name)) throw new Error("文件格式不在允许上传白名单内。");

  const objectKey = createStorageObjectKey(options.folder, file.name);
  const mimeType = file.type || "application/octet-stream";
  const buffer = Buffer.from(await file.arrayBuffer());

  if (isCosStorageConfigured()) {
    return saveToCos(file, buffer, objectKey, mimeType);
  }

  const publicUrl = buildPublicUploadUrl(objectKey);
  const uploadDir = process.env.UPLOAD_DIR ?? join(process.cwd(), "public", "uploads");
  const diskPath = getUploadDiskPath(publicUrl, process.cwd(), process.env.UPLOAD_DIR);
  await mkdir(uploadDir, { recursive: true });
  await mkdir(dirname(diskPath), { recursive: true });
  await writeFile(diskPath, buffer);

  return {
    fileName: file.name,
    filePath: diskPath,
    fileUrl: publicUrl,
    fileSize: file.size,
    mimeType,
    storage: "local",
    objectKey
  };
}

export async function deleteStoredCosObjectIfConfigured(filePath: string, env: StorageEnv = process.env) {
  const plan = getCosDeletePlan(filePath, env);
  if (plan.storage !== "cos") return { attempted: false, deleted: false, reason: "not_cos" as const };
  if (!plan.canDelete) throw new Error(`腾讯云 COS 删除配置不完整，缺少：${plan.missingEnvKeys.join("、")}`);

  const secretId = env.TENCENT_COS_SECRET_ID;
  const secretKey = env.TENCENT_COS_SECRET_KEY;
  const region = env.TENCENT_COS_REGION;
  if (!secretId || !secretKey || !region) throw new Error("腾讯云 COS 配置不完整。");

  const COSModule = await import("cos-nodejs-sdk-v5");
  const COS = COSModule.default ?? COSModule;
  const cos = new COS({
    SecretId: secretId,
    SecretKey: secretKey
  });

  await withStorageRetry(
    () =>
      new Promise<void>((resolve, reject) => {
        cos.deleteObject(
          {
            Bucket: plan.bucket,
            Region: region,
            Key: plan.key
          },
          (error: unknown) => {
            if (error) reject(error);
            else resolve();
          }
        );
      }),
    3
  );

  return { attempted: true, deleted: true, reason: null };
}

async function withStorageRetry<T>(operation: () => Promise<T>, maxAttempts: number): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts || !isRetryableStorageError(error)) break;
    }
  }
  throw lastError;
}

async function saveToCos(file: File, buffer: Buffer, objectKey: string, mimeType: string): Promise<StoredUpload> {
  const secretId = process.env.TENCENT_COS_SECRET_ID;
  const secretKey = process.env.TENCENT_COS_SECRET_KEY;
  const bucket = process.env.TENCENT_COS_BUCKET;
  const region = process.env.TENCENT_COS_REGION;
  if (!secretId || !secretKey || !bucket || !region) throw new Error("腾讯云 COS 配置不完整。");

  const COSModule = await import("cos-nodejs-sdk-v5");
  const COS = COSModule.default ?? COSModule;
  const cos = new COS({
    SecretId: secretId,
    SecretKey: secretKey
  });

  const result = await withStorageRetry(
    () =>
      new Promise<{ Location?: string }>((resolve, reject) => {
        cos.putObject(
          {
            Bucket: bucket,
            Region: region,
            Key: objectKey,
            Body: buffer,
            ContentLength: buffer.length,
            ContentType: mimeType
          },
          (error: unknown, data: { Location?: string }) => {
            if (error) reject(error);
            else resolve(data);
          }
        );
      }),
    3
  );

  const location = result.Location ?? `${bucket}.cos.${region}.myqcloud.com/${objectKey}`;
  const fileUrl = location.startsWith("http") ? location : `https://${location}`;

  return {
    fileName: file.name,
    filePath: `cos://${bucket}/${objectKey}`,
    fileUrl,
    fileSize: file.size,
    mimeType,
    storage: "cos",
    objectKey
  };
}

async function createCosSignedDownloadUrl(cosPath: CosFilePath, env: StorageEnv = process.env) {
  const secretId = env.TENCENT_COS_SECRET_ID;
  const secretKey = env.TENCENT_COS_SECRET_KEY;
  const region = env.TENCENT_COS_REGION;
  if (!secretId || !secretKey || !region) throw new Error("Tencent COS configuration is incomplete.");

  const COSModule = await import("cos-nodejs-sdk-v5");
  const COS = COSModule.default ?? COSModule;
  const cos = new COS({
    SecretId: secretId,
    SecretKey: secretKey
  });

  const result = await withStorageRetry(
    () =>
      new Promise<{ Url?: string }>((resolve, reject) => {
        cos.getObjectUrl(
          {
            Bucket: cosPath.bucket,
            Region: region,
            Key: cosPath.key,
            Method: "GET",
            Sign: true,
            Expires: getCosSignedUrlExpiresSeconds(env)
          },
          (error: unknown, data: { Url?: string }) => {
            if (error) reject(error);
            else resolve(data);
          }
        );
      }),
    3
  );

  if (!result.Url) throw new Error("Tencent COS did not return a signed download URL.");
  return result.Url.startsWith("http") ? result.Url : `https://${result.Url}`;
}
