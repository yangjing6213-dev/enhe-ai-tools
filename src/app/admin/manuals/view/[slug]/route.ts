import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOperationManualBySlug, getOperationManualFilePath } from "@/lib/operation-manuals";

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
    const html = await readFile(getOperationManualFilePath(manual), "utf8");
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
