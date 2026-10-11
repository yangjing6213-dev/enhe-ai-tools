"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export function UserAvatar({
  src,
  alt,
}: {
  src: string | null;
  alt: string;
}) {
  const [failed, setFailed] = useState(false);
  const initial = alt.trim().slice(0, 1).toUpperCase() || "U";

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <span
        className="user-avatar-placeholder"
        role="img"
        aria-label={alt}
        style={{
          display: "grid",
          width: 64,
          height: 64,
          flex: "0 0 64px",
          placeItems: "center",
          borderRadius: "50%",
          background: "var(--marketing-accent)",
          color: "#fff",
          fontSize: 24,
          fontWeight: 700,
        }}
      >
        {initial}
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={64}
      height={64}
      unoptimized
      onError={() => setFailed(true)}
      className="h-16 w-16 shrink-0 rounded-full object-cover"
    />
  );
}
