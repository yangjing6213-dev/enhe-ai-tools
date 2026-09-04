import { getAllowedUploadExtensions, getCosSignedUrlExpiresSeconds, isCosStorageConfigured } from "@/lib/storage";

type StorageDiagnosticsEnv = Record<string, string | undefined>;

const cosEnvKeys = [
  "TENCENT_COS_SECRET_ID",
  "TENCENT_COS_SECRET_KEY",
  "TENCENT_COS_BUCKET",
  "TENCENT_COS_REGION"
] as const;

export type StorageDiagnostics = {
  mode: "cos" | "local";
  cosConfigured: boolean;
  missingCosEnvKeys: string[];
  bucket: string | null;
  region: string | null;
  secretIdPreview: string | null;
  signedUrlExpiresSeconds: number;
  allowedExtensions: string[];
};

export function getStorageDiagnostics(env: StorageDiagnosticsEnv = process.env): StorageDiagnostics {
  const missingCosEnvKeys = cosEnvKeys.filter((key) => !env[key]?.trim());
  const cosConfigured = isCosStorageConfigured(env);

  return {
    mode: cosConfigured ? "cos" : "local",
    cosConfigured,
    missingCosEnvKeys,
    bucket: env.TENCENT_COS_BUCKET?.trim() || null,
    region: env.TENCENT_COS_REGION?.trim() || null,
    secretIdPreview: maskSecret(env.TENCENT_COS_SECRET_ID),
    signedUrlExpiresSeconds: getCosSignedUrlExpiresSeconds(env),
    allowedExtensions: getAllowedUploadExtensions(env)
  };
}

function maskSecret(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (trimmed.length <= 8) return "****";
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
}
