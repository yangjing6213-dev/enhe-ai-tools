import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { incrementCardLike, parseCardLikeTarget, readCardLikes } from "@/lib/card-likes";

export const dynamic = "force-dynamic";
const visitors = new Map<string, { start: number; count: number }>();

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams.getAll("target");
  if (!params.length || params.length > 60) return NextResponse.json({ error: "INVALID_TARGETS" }, { status: 400 });
  const targets = params.map(value => { const parts = value.split(":"); return parts.length === 2 ? parseCardLikeTarget({ kind: parts[0], id: parts[1] }) : null; });
  if (targets.some(t => !t)) return NextResponse.json({ error: "INVALID_TARGETS" }, { status: 400 });
  try {
    return NextResponse.json({ counts: await readCardLikes(targets.filter(t => t !== null)) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "UNAVAILABLE" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const allowed = new Set([new URL(request.url).origin]);
  for (const url of [process.env.APP_URL, process.env.NEXT_PUBLIC_APP_URL]) {
    if (url) { try { allowed.add(new URL(url).origin); } catch { /* Ignore invalid optional configuration. */ } }
  }
  const origin = request.headers.get("origin");
  if (!origin || !allowed.has(origin) || request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ error: "INVALID_ORIGIN" }, { status: 403 });
  }
  if (Number(request.headers.get("content-length") ?? 0) > 1024) return NextResponse.json({ error: "INVALID_TARGET" }, { status: 400 });
  let target;
  try { const body = await request.text(); target = body.length <= 1024 ? parseCardLikeTarget(JSON.parse(body)) : null; } catch { target = null; }
  if (!target) return NextResponse.json({ error: "INVALID_TARGET" }, { status: 400 });
  const now = Date.now();
  for (const [key, bucket] of visitors) if (now - bucket.start >= 60_000) visitors.delete(key);
  const key = createHash("sha256").update(request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "anonymous").digest("hex");
  const bucket = visitors.get(key) ?? { start: now, count: 0 };
  if (bucket.count >= 60 || (!visitors.has(key) && visitors.size >= 10_000)) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  bucket.count++;
  visitors.set(key, bucket);
  try {
    const count = await incrementCardLike(target);
    return count === null ? NextResponse.json({ error: "NOT_FOUND" }, { status: 404 }) : NextResponse.json({ count });
  } catch {
    return NextResponse.json({ error: "UNAVAILABLE" }, { status: 503 });
  }
}
