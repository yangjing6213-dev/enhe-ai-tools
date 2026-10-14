import { NextResponse } from "next/server";
import { getPublicEmojiCatalog } from "@/lib/emojis-server";

export async function GET() {
  // Disabled entries remain in this mapping so historic text still renders.
  return NextResponse.json({ entries: await getPublicEmojiCatalog() }, {
    headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=30" }
  });
}
