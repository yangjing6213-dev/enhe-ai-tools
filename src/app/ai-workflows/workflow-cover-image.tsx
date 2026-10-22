"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";

import { resolveToolImageSrc } from "@/lib/tool-image";

export function AiWorkflowCoverImage({
  coverImage, slug, fallbackImage, alt, ...props
}: Omit<ImageProps, "src" | "onError"> & { coverImage: string | null; slug: string; fallbackImage?: string }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const upstream = resolveToolImageSrc(coverImage);
  const fallback = fallbackImage || `/api/ai-workflows/covers/${encodeURIComponent(slug)}`;
  const source = upstream && upstream !== failedSource ? upstream : fallback;

  return <Image {...props} alt={alt} src={source} style={{ backgroundImage: `url(${JSON.stringify(fallback)})`, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat", ...props.style }} onError={() => {
    if (source !== fallback) setFailedSource(source);
  }} />;
}
