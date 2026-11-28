import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOperationManualBySlug, getOperationManualFilePath } from "@/lib/operation-manuals";
import { injectStandalonePageTypography } from "@/lib/standalone-page-typography";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const user = await getCurrentUser();
  if (user?.role !== "admin") {
    return NextResponse.json({ message: "Manual not found." }, { status: 404 });
  }

  const { slug } = await params;
  const manual = getOperationManualBySlug(slug);
  if (!manual) {
    return NextResponse.json({ message: "Manual not found." }, { status: 404 });
  }

  try {
    const source = await readFile(getOperationManualFilePath(manual), "utf8");
    const htmlLanguage = source.match(/<html\b[^>]*\blang=["']([^"']+)["']/i)?.[1]?.toLowerCase();
    const html = injectStandalonePageTypography(source, htmlLanguage?.startsWith("en") ? "en" : "zh");
    return new Response(html, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": "text/html; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow"
      }
    });
  } catch {
    return NextResponse.json({ message: "Manual file not found." }, { status: 404 });
  }
}
