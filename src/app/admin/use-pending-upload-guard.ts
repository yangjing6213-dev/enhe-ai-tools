"use client";
import { useEffect, useRef } from "react";

export function usePendingUploadGuard(pending: boolean) {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!form || !pending) return;
    const blockPendingSave = (event: SubmitEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    form.addEventListener("submit", blockPendingSave, true);
    return () => form.removeEventListener("submit", blockPendingSave, true);
  }, [pending]);
  return rootRef;
}
