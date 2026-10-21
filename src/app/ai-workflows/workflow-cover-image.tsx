"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";

import { resolveToolImageSrc } from "@/lib/tool-image";

export function AiWorkflowCoverImage({
  coverImage, slug, alt, ...props
}: Omit<ImageProps, "src" | "onError"> & { coverImage: string | null; slug: string }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const upstream = resolveToolImageSrc(coverImage);
  const fallback = `/api/ai-workflows/covers/${encodeURIComponent(slug)}`;
  const source = upstream && upstream !== failedSource ? upstream : fallback;

  return <Image {...props} alt={alt} src={source} onError={() => {
    if (source !== fallback) setFailedSource(source);
  }} />;
}
