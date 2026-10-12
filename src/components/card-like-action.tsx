"use client";

import { useEffect, useState } from "react";
import PulseHeart from "@/components/PulseHeart";
import "./card-like-action.css";

type LikeState = { count: number; liked: boolean; pending: boolean };
const states = new Map<string, LikeState>();
const versions = new Map<string, number>();
const listeners = new Map<string, Set<(state: LikeState) => void>>();
const queued = new Set<string>();
let timer: ReturnType<typeof setTimeout> | undefined;
const empty = { count: 0, liked: false, pending: false };

function publish(key: string, state: LikeState) {
  states.set(key, state);
  listeners.get(key)?.forEach(listener => listener(state));
}

async function loadQueued() {
  timer = undefined;
  const keys = [...queued];
  queued.clear();
  for (let offset = 0; offset < keys.length; offset += 60) {
    const batch = keys.slice(offset, offset + 60);
    const readVersions = new Map(batch.map(key => [key, versions.get(key) ?? 0]));
    const params = new URLSearchParams();
    batch.forEach(key => params.append("target", key));
    try {
      const response = await fetch(`/api/card-likes?${params}`, { cache: "no-store" });
      if (!response.ok) continue;
      const data = await response.json();
      batch.forEach(key => {
        const count = data.counts?.[`card-like:${key}`];
        if (Number.isSafeInteger(count) && count >= 0 && readVersions.get(key) === (versions.get(key) ?? 0)) {
          publish(key, { count, liked: data.liked?.[`card-like:${key}`] === true, pending: false });
        }
      });
    } catch { /* A failed read must not prevent a later authenticated save. */ }
  }
}

export function CardLikeAction({ kind, id, locale }: { kind: "tool" | "news"; id: string; locale: "zh" | "en" }) {
  const key = `${kind}:${id}`;
  const [state, setState] = useState<LikeState>(empty);
  const [error, setError] = useState(false);
  useEffect(() => {
    setState(states.get(key) ?? empty);
    const subscribers = listeners.get(key) ?? new Set();
    subscribers.add(setState);
    listeners.set(key, subscribers);
    queued.add(key);
    timer ??= setTimeout(() => { void loadQueued(); }, 0);
    return () => { subscribers.delete(setState); if (!subscribers.size) listeners.delete(key); };
  }, [key]);

  async function save(liked: boolean) {
    const before = states.get(key) ?? empty;
    if (before.pending) return;
    versions.set(key, (versions.get(key) ?? 0) + 1);
    publish(key, { ...before, pending: true });
    setError(false);
    try {
      const response = await fetch("/api/card-likes", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, id, liked }),
      });
      if (response.status === 401) {
        const returnTo = window.location.pathname + window.location.search;
        window.location.assign(`${locale === "en" ? "/en" : ""}/login?returnTo=${encodeURIComponent(returnTo)}`);
        return;
      }
      if (!response.ok) throw new Error("Unable to save");
      const data = await response.json();
      if (!Number.isSafeInteger(data.count) || data.count < 0 || typeof data.liked !== "boolean") throw new Error("Invalid state");
      publish(key, { count: data.count, liked: data.liked, pending: false });
    } catch { setError(true); publish(key, { ...before, pending: false }); }
    finally { const current = states.get(key); if (current?.pending) publish(key, { ...current, pending: false }); }
  }

  return <div className="card-like-action" data-card-like={`${kind}:${id}`}>
    <PulseHeart count={state.count} liked={state.liked} deferChange onChange={next => { void save(next); }}
      disabled={state.pending} size={24} pillColor="#ffffff" textColor="#18181b" label={locale === "en" ? "Like" : "喜欢"} />
    <span className="card-like-status" role="status">{error ? (locale === "en" ? "Not saved. Try again." : "未保存，请重试") : ""}</span>
  </div>;
}