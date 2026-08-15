import { NextResponse } from "next/server";
import { getPublicSoftwareCatalogCovers } from "@/lib/public-content";
import { getSecureCosMediaUrl } from "@/lib/storage";
import { isToolImageSource } from "@/lib/tool-image";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const toolId = searchParams.get("id")?.trim();
  let source = searchParams.get("src")?.trim();

  if (toolId) {
    const covers = await getPublicSoftwareCatalogCovers();
    source = covers.find((cover) => cover.id === toolId)?.coverImage?.trim();
    if (!source) {
      return NextResponse.json(
        { message: "Product image source is not available." },
        { status: 404 },
      );
    }
  }

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
