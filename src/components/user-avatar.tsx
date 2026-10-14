"use client";

import Image from "next/image";
import { getDefaultAvatar } from "@/lib/default-avatar";
import { useEffect, useState } from "react";

export function UserAvatar({
  src,
  alt,
  fallbackSeed = alt,
  size = 64,
  className = "h-16 w-16 shrink-0 rounded-full object-cover",
}: {
  src: string | null;
  alt: string;
  fallbackSeed?: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <Image
      src={!src || failed ? getDefaultAvatar(fallbackSeed) : src}
      alt={alt}
      width={size}
      height={size}
      unoptimized
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
