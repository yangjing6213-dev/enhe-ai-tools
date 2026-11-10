"use client";

import { useState } from "react";

export function ChatProfileAvatar({ src, nickname, className }: { src: string | null; nickname: string; className: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) {
    return <span className={className} aria-hidden="true">{nickname.trim().slice(0, 1) || "EN"}</span>;
  }

  return <img className={className} src={src} alt="" onError={() => setFailedSrc(src)} />;
}
