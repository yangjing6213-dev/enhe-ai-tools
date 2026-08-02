import { NextResponse } from "next/server";
import { getSecureCosMediaUrl } from "@/lib/storage";
import { isToolImageSource } from "@/lib/tool-image";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const source = new URL(request.url).searchParams.get("src")?.trim();
  if (!source) {
    return NextResponse.json({ message: "Missing product image source." }, { status: 400 });
  }
  if (!isToolImageSource(source)) {
    return NextResponse.json({ message: "Product image source is not available." }, { status: 404 });
  }

  try {
    const signedUrl = await getSecureCosMediaUrl(source);
    if (!signedUrl) {
      return NextResponse.json({ message: "Product image source is not available." }, { status: 404 });
    }

    const response = NextResponse.redirect(signedUrl);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch {
    return NextResponse.json({ message: "Product image source is not available." }, { status: 404 });
  }
}
