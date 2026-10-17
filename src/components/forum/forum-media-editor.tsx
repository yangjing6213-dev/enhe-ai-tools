"use client";

/* eslint-disable @next/next/no-img-element -- Uploaded previews must retain per-request authorization. */
import { useEffect, useRef, useState } from "react";
import HoldButton from "@/components/hold-button";
import { forumImageMaxBytes, forumVideoMaxBytes } from "@/lib/forum-media-limits";

type MediaItem = { key: string; name: string; kind: "image" | "video"; status: "uploading" | "ready" | "error" | "removing"; progress: number; id?: string; url?: string; error?: string };
type UploadResponse = { id?: string; type?: "image" | "video"; url?: string; mimeType?: string; code?: string };

export function ForumMediaEditor({ locale, allowVideo }: { locale: "zh" | "en"; allowVideo: boolean }) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [error, setError] = useState("");
  const container = useRef<HTMLDivElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const requests = useRef(new Map<string, XMLHttpRequest>());
  const latestItems = useRef<MediaItem[]>([]);
  const blocked = Boolean(error) || items.some((item) => item.status !== "ready");
  const text = locale === "zh" ? {
    image: "添加图片", video: "添加视频", remove: "移除", dismiss: "清除提示", uploading: "正在上传", removing: "正在移除", uploaded: "上传完成", finish: "请等待附件上传完成，或移除失败的附件后再提交。",
    hint: allowVideo ? "最多 6 张图片，每张 8MB；1 个 MP4/WebM 视频，最多 100MB。话题发布后，媒体会公开展示。" : "最多 4 张图片，每张 8MB。回复发布后，图片会公开展示。",
    count: allowVideo ? "最多添加 6 张图片和 1 个视频。" : "回复最多添加 4 张图片。", invalid: "请选择 JPG、PNG、WebP、GIF 图片或支持的视频。", size: "文件太大，请压缩后再上传。", login: "登录已过期，请重新登录后上传。", limit: "上传次数较多，请稍后再试。", failed: "上传失败，请移除后重试。", removeFailed: "移除失败，请稍后重试。",
  } : {
    image: "Add images", video: "Add video", remove: "Remove", dismiss: "Dismiss", uploading: "Uploading", removing: "Removing", uploaded: "Uploaded", finish: "Wait for uploads to finish or remove failed attachments before submitting.",
    hint: allowVideo ? "Up to 6 images, 8MB each, and 1 MP4/WebM video up to 100MB. Media is public with your post." : "Up to 4 images, 8MB each. Images are public with your reply.",
    count: allowVideo ? "You can add up to 6 images and 1 video." : "Replies can contain up to 4 images.", invalid: "Choose JPG, PNG, WebP, GIF images or a supported video.", size: "The file is too large. Compress it before uploading.", login: "Your session expired. Sign in again to upload.", limit: "Too many uploads. Try again later.", failed: "Upload failed. Remove the file and try again.", removeFailed: "Could not remove this file. Try again later.",
  };

  function updateItems(update: (current: MediaItem[]) => MediaItem[]) {
    const next = update(latestItems.current);
    latestItems.current = next;
    setItems(next);
  }

  useEffect(() => {
    const activeRequests = requests.current;
    return () => { for (const xhr of activeRequests.values()) xhr.abort(); activeRequests.clear(); };
  }, []);

  useEffect(() => {
    const form = container.current?.closest("form");
    if (!form || !blocked) return;
    const buttons = Array.from(form.querySelectorAll<HTMLButtonElement | HTMLInputElement>('button[type="submit"], input[type="submit"]')).filter((button) => !button.disabled);
    for (const button of buttons) button.disabled = true;
    const stop = (event: Event) => { event.preventDefault(); event.stopImmediatePropagation(); container.current?.focus(); };
    form.addEventListener("submit", stop, true);
    return () => { for (const button of buttons) button.disabled = false; form.removeEventListener("submit", stop, true); };
  }, [blocked]);

  function message(code?: string) {
    if (code === "FORUM_MEDIA_SIZE") return text.size;
    if (code === "FORUM_MEDIA_TYPE" || code === "FORUM_MEDIA_INVALID") return text.invalid;
    if (code === "FORUM_MEDIA_LOGIN") return text.login;
    if (code === "FORUM_MEDIA_LIMIT") return text.limit;
    return text.failed;
  }

  function upload(file: File, item: MediaItem) {
    const xhr = new XMLHttpRequest();
    requests.current.set(item.key, xhr);
    xhr.open("POST", "/api/forum/media");
    xhr.responseType = "json";
    xhr.timeout = 180_000;
    xhr.upload.onprogress = (event) => { if (event.lengthComputable) updateItems((current) => current.map((entry) => entry.key === item.key ? { ...entry, progress: Math.min(99, Math.round(event.loaded * 100 / event.total)) } : entry)); };
    const failed = (code?: string) => {
      requests.current.delete(item.key);
      updateItems((current) => current.map((entry) => entry.key === item.key ? { ...entry, status: "error", error: message(code) } : entry));
    };
    xhr.onerror = () => failed();
    xhr.ontimeout = () => failed();
    xhr.onabort = () => { requests.current.delete(item.key); };
    xhr.onload = () => {
      const response = xhr.response as UploadResponse | null;
      if (xhr.status !== 201 || !response?.id || response.type !== item.kind || response.url !== `/api/forum/media/${encodeURIComponent(response.id)}`) return failed(response?.code);
      requests.current.delete(item.key);
      updateItems((current) => current.map((entry) => entry.key === item.key ? { ...entry, status: "ready", progress: 100, id: response.id, url: response.url } : entry));
    };
    const body = new FormData(); body.set("file", file); body.set("surface", allowVideo ? "post" : "reply");
    xhr.send(body);
  }

  function addFiles(files: FileList | null, kind: "image" | "video") {
    if (!files?.length) return;
    setError("");
    const chosen = Array.from(files);
    const sameKind = latestItems.current.filter((item) => item.kind === kind).length;
    if (sameKind + chosen.length > (kind === "image" ? allowVideo ? 6 : 4 : allowVideo ? 1 : 0)) { setError(text.count); return; }
    if (chosen.some((file) => file.size <= 0 || file.size > (kind === "image" ? forumImageMaxBytes : forumVideoMaxBytes))) { setError(text.size); return; }
    if (chosen.some((file) => !(kind === "image" ? ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) : ["video/mp4", "video/webm"].includes(file.type)))) { setError(text.invalid); return; }
    const additions = chosen.map((file): MediaItem => ({ key: crypto.randomUUID(), name: file.name, kind, status: "uploading", progress: 0 }));
    updateItems((current) => [...current, ...additions]);
    chosen.forEach((file, index) => upload(file, additions[index]));
  }

  async function remove(item: MediaItem) {
    requests.current.get(item.key)?.abort();
    if (!item.id) { updateItems((current) => current.filter((entry) => entry.key !== item.key)); return; }
    updateItems((current) => current.map((entry) => entry.key === item.key ? { ...entry, status: "removing" } : entry));
    try {
      const response = await fetch(`/api/forum/media/${encodeURIComponent(item.id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("remove failed");
      updateItems((current) => current.filter((entry) => entry.key !== item.key));
    } catch (removeError) {
      updateItems((current) => current.map((entry) => entry.key === item.key ? { ...entry, status: "error", error: text.removeFailed } : entry));
      throw removeError;
    }
  }

  return <div className="forum-media-editor" ref={container} tabIndex={-1} aria-busy={items.some((item) => item.status === "uploading" || item.status === "removing")}>
    <div className="forum-media-editor__toolbar">
      <button type="button" onClick={() => imageInput.current?.click()}>{text.image}</button>
      <input className="forum-media-editor__input" ref={imageInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden aria-label={text.image} onChange={(event) => { addFiles(event.currentTarget.files, "image"); event.currentTarget.value = ""; }} />
      {allowVideo && <><button type="button" onClick={() => videoInput.current?.click()}>{text.video}</button><input className="forum-media-editor__input" ref={videoInput} type="file" accept="video/mp4,video/webm" hidden aria-label={text.video} onChange={(event) => { addFiles(event.currentTarget.files, "video"); event.currentTarget.value = ""; }} /></>}
    </div>
    <p className="forum-media-editor__hint">{text.hint}</p>
    {error && <p className="forum-media-editor__error" role="alert">{error} <button type="button" onClick={() => setError("")}>{text.dismiss}</button></p>}
    {items.length > 0 && <div className="forum-media-editor__list">
      {items.map((item) => <div className="forum-media-editor__item" key={item.key}>
        {item.url && (item.kind === "image" ? <img className="forum-media-editor__preview" src={item.url} alt={item.name} /> : <video className="forum-media-editor__preview" src={item.url} controls playsInline preload="metadata" aria-label={item.name} />)}
        <span title={item.name}>{item.name}</span>
        <span className="forum-media-editor__status" role="status">{item.status === "uploading" ? `${text.uploading} ${item.progress}%` : item.status === "removing" ? text.removing : item.status === "ready" ? text.uploaded : item.error}</span>
        <HoldButton disabled={item.status === "removing"} onHold={() => remove(item)} pendingLabel={text.removing} errorLabel={locale === "en" ? "Remove failed" : "移除失败"} doneLabel={locale === "en" ? "Removed" : "已移除"} hint={locale === "en" ? "Hold for 2 seconds" : "按住2秒"} aria-label={`${locale === "en" ? "Hold to remove" : "长按移除"} ${item.name}`}>{locale === "en" ? "Hold to remove" : "长按移除"}</HoldButton>
        {item.status === "ready" && item.id && <input type="hidden" name="attachmentIds" value={item.id} />}
      </div>)}
    </div>}
    {blocked && <p className="forum-media-editor__hint" role="status">{text.finish}</p>}
  </div>;
}
