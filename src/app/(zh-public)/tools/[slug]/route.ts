import { NextResponse, type NextRequest } from "next/server";
import { buildLegacyToolDetailRedirectResponse } from "@/lib/legacy-tool-redirect";

export const revalidate = 300;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (await buildLegacyToolDetailRedirectResponse(slug, "zh")) ?? NextResponse.json({ error: "Not found" }, { status: 404 });
}
