"use client";

import Image from "next/image";
import { useState } from "react";
import { getDefaultAvatar } from "@/lib/default-avatar";

export function EnheHeaderAvatar({ name }: { name: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <Image
      className="redesign-header-user-avatar"
      src={failed ? getDefaultAvatar(name) : "/api/user/avatar"}
      alt=""
      width={28}
      height={28}
      unoptimized
      onError={() => setFailed(true)}
    />
  );
}
