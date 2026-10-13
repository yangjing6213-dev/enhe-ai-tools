"use client";

import Image from "next/image";
import { getDefaultAvatar } from "@/lib/default-avatar";
import { useEffect, useState } from "react";

export function UserAvatar({
  src,
  alt,
}: {
  src: string | null;
  alt: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <Image
      src={!src || failed ? getDefaultAvatar(alt) : src}
      alt={alt}
      width={64}
      height={64}
      unoptimized
      onError={() => setFailed(true)}
      className="h-16 w-16 shrink-0 rounded-full object-cover"
    />
  );
}
