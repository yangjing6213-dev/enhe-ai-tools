import { absoluteUrl, getSiteBaseUrl } from "@/lib/seo";

export const defaultIndexNowKey = "b689ebc55640682df41b6721a64881dae8f81beecc0b5591525747a6d9a01751";
const indexNowEndpoint = "https://api.indexnow.org/indexnow";
const indexNowKeyPattern = /^[A-Za-z0-9-]{8,128}$/;
const blockedPathPattern = /^\/(?:admin|api|login|register|user|user-center|dashboard|checkout|orders|payment)(?:\/|$)/;

export type IndexNowPayload = {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
};

export type IndexNowSubmissionResult =
  | { ok: true; submitted: number; status: number }
  | { ok: false; submitted: 0; reason: "invalid-key" | "no-urls" | "request-failed"; status?: number; error?: unknown };

export function getIndexNowKey() {
  const key = (process.env.INDEXNOW_KEY ?? defaultIndexNowKey).trim();
  return indexNowKeyPattern.test(key) ? key : "";
}

export function getIndexNowKeyFileName() {
  const key = getIndexNowKey();
  return key ? `${key}.txt` : "";
}

export function getIndexNowKeyLocation() {
  const fileName = getIndexNowKeyFileName();
  return fileName ? absoluteUrl(`/${fileName}`) : "";
}

function normalizeIndexNowUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith("/") && !/^https?:\/\//i.test(trimmed)) return null;

  let url: URL;
  try {
    url = new URL(absoluteUrl(trimmed));
  } catch {
    return null;
  }

  const siteUrl = new URL(getSiteBaseUrl());
  if (url.protocol !== "https:" || url.host !== siteUrl.host) return null;
  if (blockedPathPattern.test(url.pathname)) return null;

  url.hash = "";
  return url.toString();
}

export function normalizeIndexNowUrls(urls: Array<string | null | undefined>) {
  return Array.from(new Set(urls.flatMap((url) => (typeof url === "string" ? [normalizeIndexNowUrl(url)] : [])).filter(Boolean) as string[]));
}

export function buildIndexNowPayload(urls: Array<string | null | undefined>): IndexNowPayload | null {
  const key = getIndexNowKey();
  if (!key) return null;

  const urlList = normalizeIndexNowUrls(urls);
  if (!urlList.length) return null;

  return {
    host: new URL(getSiteBaseUrl()).host,
    key,
    keyLocation: getIndexNowKeyLocation(),
    urlList
  };
}

export async function submitIndexNowUrls(urls: Array<string | null | undefined>): Promise<IndexNowSubmissionResult> {
  const payload = buildIndexNowPayload(urls);
  if (!getIndexNowKey()) return { ok: false, submitted: 0, reason: "invalid-key" };
  if (!payload) return { ok: false, submitted: 0, reason: "no-urls" };

  try {
    const response = await fetch(indexNowEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      return { ok: false, submitted: 0, reason: "request-failed", status: response.status };
    }

    return { ok: true, submitted: payload.urlList.length, status: response.status };
  } catch (error) {
    return { ok: false, submitted: 0, reason: "request-failed", error };
  }
}

export async function notifyIndexNow(urls: Array<string | null | undefined>) {
  try {
    const result = await submitIndexNowUrls(urls);
    if (!result.ok && result.reason !== "no-urls") {
      console.warn("[indexnow] submission failed", result.error ?? result);
    }
  } catch (error) {
    console.warn("[indexnow] submission failed", error);
  }
}
