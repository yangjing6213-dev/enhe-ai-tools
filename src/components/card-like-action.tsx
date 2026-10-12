"use client";

import { useEffect, useRef, useState } from "react";
import PulseHeart from "@/components/PulseHeart";
import "./card-like-action.css";

const counts = new Map<string, number>();
const listeners = new Map<string, Set<(count: number) => void>>();
const queued = new Set<string>();
let timer: ReturnType<typeof setTimeout> | undefined;

function publish(key: string, count: number) {
  const next = Math.max(counts.get(key) ?? 0, count);
  counts.set(key, next);
  listeners.get(key)?.forEach(listener => listener(next));
}

async function loadQueued() {
  timer = undefined;
  const keys = [...queued];
  queued.clear();
  for (let offset = 0; offset < keys.length; offset += 60) {
    const batch = keys.slice(offset, offset + 60);
    const params = new URLSearchParams();
    batch.forEach(key => params.append("target", key));
    try {
      const response = await fetch(`/api/card-likes?${params}`, { cache: "no-store" });
      if (!response.ok) continue;
      const data = await response.json();
      batch.forEach(key => { const count = data.counts?.[`card-like:${key}`]; if (Number.isSafeInteger(count) && count >= 0) publish(key, count); });
    } catch { /* A failed read must not prevent a later click from being saved. */ }
  }
}

export function CardLikeAction({ kind, id, locale }: { kind: "tool" | "news"; id: string; locale: "zh" | "en" }) {
  const key = `${kind}:${id}`;
  const [count, setCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const busy = useRef(false);
  useEffect(() => {
    setCount(counts.get(key) ?? 0);
    const subscribers = listeners.get(key) ?? new Set();
    subscribers.add(setCount);
    listeners.set(key, subscribers);
    queued.add(key);
    timer ??= setTimeout(() => { void loadQueued(); }, 0);
    return () => { subscribers.delete(setCount); if (!subscribers.size) listeners.delete(key); };
  }, [key]);

  async function increment() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(false);
    try {
      const response = await fetch("/api/card-likes", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, id }),
      });
      if (!response.ok) throw new Error("Unable to save");
      const data = await response.json();
      if (!Number.isSafeInteger(data.count) || data.count < 0) throw new Error("Invalid count");
      publish(key, data.count);
      setLiked(true);
    } catch { setError(true); }
    finally { busy.current = false; setPending(false); }
  }

  return <div className="card-like-action" data-card-like={`${kind}:${id}`}>
    <PulseHeart count={count} liked={liked} incrementOnly onChange={() => { void increment(); }}
      disabled={pending} size={24} label={locale === "en" ? "Like" : "喜欢"} />
    <span className="card-like-status" role="status">{error ? (locale === "en" ? "Not saved. Try again." : "未保存，请重试") : ""}</span>
  </div>;
}
