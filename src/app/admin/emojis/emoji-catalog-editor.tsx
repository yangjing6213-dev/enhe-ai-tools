"use client";

import { useRef, useState, type FormEvent } from "react";
import { inputClass } from "@/app/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { emojiImageSource, maxEmojiEntries, type EmojiEntry } from "@/lib/emojis";

export function EmojiCatalogEditor({ initialEntries, initialRevision }: { initialEntries: EmojiEntry[]; initialRevision: string }) {
  const [entries, setEntries] = useState(initialEntries);
  const [revision, setRevision] = useState(initialRevision);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const uploadForm = useRef<HTMLFormElement>(null);

  const save = async (method: "POST" | "PUT", body: FormData | string) => {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/emojis", {
        method, body, ...(method === "PUT" ? { headers: { "Content-Type": "application/json" } } : {})
      });
      const result = await response.json() as { entries?: EmojiEntry[]; revision?: string; message?: string };
      if (!response.ok || !result.entries || typeof result.revision !== "string") throw new Error(result.message || "保存失败，请稍后重试。 ");
      setEntries(result.entries);
      setRevision(result.revision);
      if (method === "POST") uploadForm.current?.reset();
      setMessage(method === "POST" ? "表情已添加，站内选择器已更新。" : "表情目录已保存。停用素材仍会在旧内容中显示。 ");
      window.dispatchEvent(new Event("enhe:emojis-updated"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败，请稍后重试。 ");
    } finally {
      setBusy(false);
    }
  };

  const move = (index: number, direction: -1 | 1) => {
    const reordered = [...entries];
    [reordered[index], reordered[index + direction]] = [reordered[index + direction], reordered[index]];
    setEntries(reordered.map((entry, order) => ({ ...entry, order })));
  };

  const upload = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set("revision", revision);
    void save("POST", form);
  };

  return (
    <div className="enhe-emoji-admin rounded-2xl border border-[#d8d8d8] bg-white p-5 text-[#151515]">
      <form ref={uploadForm} onSubmit={upload} className="grid gap-4 rounded-xl border border-[#d8d8d8] p-4">
        <h2 className="text-lg font-semibold">添加表情</h2>
        <label className="grid gap-2 text-sm">表情名称<input className={inputClass} name="label" maxLength={40} required placeholder="例如：开心、出发" disabled={busy} /></label>
        <label className="grid gap-2 text-sm">表情图片<input name="file" type="file" accept="image/png,image/jpeg,image/webp" required disabled={busy} /></label>
        <p className="text-xs text-[#5f665f]">支持 4MB 以内的静态 PNG、JPG、WebP。上传后会自动压缩，最多保留 {maxEmojiEntries} 个素材。</p>
        <Button type="submit" disabled={busy || entries.length >= maxEmojiEntries} className="enhe-emoji-admin-primary h-auto min-h-11 w-fit rounded-full bg-[#2478ef] px-5 py-3 font-semibold text-white hover:bg-[#1766d1] disabled:opacity-50">{busy ? "处理中…" : "添加素材"}</Button>
      </form>

      <form onSubmit={(event) => { event.preventDefault(); void save("PUT", JSON.stringify({ entries: entries.map(({ id, label, enabled, order }) => ({ id, label, enabled, order })), revision })); }}>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-semibold">素材目录</h2><p className="mt-1 text-xs text-[#5f665f]">取消“启用”可从选择器移除；旧内容会继续显示。改名或调整顺序后请保存。</p></div>
          <Button type="submit" disabled={busy} className="enhe-emoji-admin-primary h-auto min-h-11 rounded-full bg-[#2478ef] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1766d1] disabled:opacity-50">保存目录</Button>
        </div>
        <div className="enhe-emoji-admin-list">
          {entries.map((entry, index) => (
            <div key={entry.id} className="enhe-emoji-admin-row">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={emojiImageSource(entry)} alt={entry.label} width={64} height={64} loading="lazy" />
              <label><span className="sr-only">{entry.label}的名称</span><input className={inputClass} maxLength={40} required value={entry.label} disabled={busy} onChange={(event) => setEntries(entries.map((item) => item.id === entry.id ? { ...item, label: event.target.value } : item))} /><small>:{entry.id}:</small></label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={entry.enabled} disabled={busy} onChange={(event) => setEntries(entries.map((item) => item.id === entry.id ? { ...item, enabled: event.target.checked } : item))} />启用</label>
              <div className="flex gap-2"><Button type="button" variant="outline" aria-label={`上移${entry.label}`} disabled={busy || index === 0} onClick={() => move(index, -1)} className="min-h-11 border-[#d8d8d8] bg-white px-3 text-black disabled:opacity-40">↑</Button><Button type="button" variant="outline" aria-label={`下移${entry.label}`} disabled={busy || index === entries.length - 1} onClick={() => move(index, 1)} className="min-h-11 border-[#d8d8d8] bg-white px-3 text-black disabled:opacity-40">↓</Button></div>
            </div>
          ))}
        </div>
      </form>
      <p role="status" aria-live="polite" className="mt-4 text-sm text-[#151515]">{message}</p>
    </div>
  );
}
