"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { useCallback, useRef } from "react";

type PrefetchLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  warmup?: boolean;
};

function isWarmableHref(href: string) {
  return href.startsWith("/") && !href.startsWith("//");
}

export function PrefetchLink({
  href,
  warmup = true,
  onMouseEnter,
  onFocus,
  onTouchStart,
  prefetch = true,
  ...props
}: PrefetchLinkProps) {
  const router = useRouter();
  const warmedHrefRef = useRef<string | null>(null);

  const handleWarmup = useCallback(() => {
    if (!warmup || !isWarmableHref(href) || warmedHrefRef.current === href) {
      return;
    }

    warmedHrefRef.current = href;
    router.prefetch(href);
  }, [href, router, warmup]);

  return (
    <Link
      {...props}
      href={href}
      prefetch={prefetch}
      onMouseEnter={(event) => {
        handleWarmup();
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        handleWarmup();
        onFocus?.(event);
      }}
      onTouchStart={(event) => {
        handleWarmup();
        onTouchStart?.(event);
      }}
    />
  );
}
