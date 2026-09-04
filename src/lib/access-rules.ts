export function canDownloadPaidTool(input: { isDownloadPaid: boolean; hasDownloadPurchase: boolean }) {
  return !input.isDownloadPaid || input.hasDownloadPurchase;
}

export function canUsePaidOnlineTool(input: { servicePrice: number; hasToolPurchase: boolean }) {
  return input.servicePrice <= 0 || input.hasToolPurchase;
}

type AccessEnv = Record<string, string | undefined>;

export class DownloadRateLimitError extends Error {
  status = 429;

  constructor(message = "Download requests are too frequent.") {
    super(message);
    this.name = "DownloadRateLimitError";
  }
}

export function getDownloadRateLimitConfig(env: AccessEnv = process.env) {
  const parsedMax = Number(env.DOWNLOAD_RATE_LIMIT_MAX);
  const parsedWindowSeconds = Number(env.DOWNLOAD_RATE_LIMIT_WINDOW_SECONDS);

  return {
    max: Number.isInteger(parsedMax) && parsedMax > 0 ? parsedMax : 10,
    windowSeconds: Number.isInteger(parsedWindowSeconds) && parsedWindowSeconds > 0 ? parsedWindowSeconds : 60
  };
}

export function isDownloadRateLimitExceeded(countInWindow: number, max: number) {
  return countInWindow >= max;
}
