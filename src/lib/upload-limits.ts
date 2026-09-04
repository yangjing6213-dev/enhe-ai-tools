export const adminFileUploadMaxBytes = 500 * 1024 * 1024;
export const adminFileUploadBodySizeLimit = "520mb";

export function parseUploadSizeLimitToBytes(limit: string) {
  const match = limit.trim().toLowerCase().match(/^(\d+(?:\.\d+)?)(b|kb|mb|gb)$/);
  if (!match) throw new Error(`Unsupported upload size limit: ${limit}`);

  const value = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024
  };

  return Math.floor(value * multipliers[unit]);
}

export function isUploadBodyLimitEnough(limit: string, maxBytes: number) {
  return parseUploadSizeLimitToBytes(limit) >= maxBytes;
}
