"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { inputClass } from "@/app/admin/admin-ui";

type UploadState = {
  status: "idle" | "uploading" | "success" | "error";
  progress: number;
  message: string;
};

export function AdminFileUploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<UploadState>({
    status: "idle",
    progress: 0,
    message: "选择文件后可查看实时上传进度。"
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setState({ status: "error", progress: 0, message: "请选择要上传的文件。" });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/upload");
    setState({ status: "uploading", progress: 0, message: `正在上传：${file.name}` });

    xhr.upload.onprogress = (progressEvent) => {
      if (!progressEvent.lengthComputable) {
        setState((current) => ({ ...current, progress: Math.max(current.progress, 8) }));
        return;
      }
      const progress = Math.min(99, Math.round((progressEvent.loaded / progressEvent.total) * 100));
      setState((current) => ({ ...current, progress }));
    };

    xhr.onerror = () => {
      setState({ status: "error", progress: 0, message: "上传失败：网络连接中断，请稍后重试。" });
    };

    xhr.onload = () => {
      let payload: { id?: string; message?: string } = {};
      try {
        payload = JSON.parse(xhr.responseText || "{}");
      } catch {
        payload = {};
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        setState({ status: "success", progress: 100, message: payload.message ?? "上传成功，已自动创建文件记录。" });
        if (inputRef.current) inputRef.current.value = "";
        window.setTimeout(() => {
          startTransition(() => {
            router.push(`/admin/files?uploaded=1${payload.id ? `&fileId=${payload.id}` : ""}`);
            router.refresh();
          });
        }, 700);
        return;
      }

      setState({
        status: "error",
        progress: 0,
        message: payload.message ? `上传失败：${payload.message}` : `上传失败：服务器返回 ${xhr.status}`
      });
    };

    xhr.send(formData);
  }

  const barColor = state.status === "error" ? "bg-red-300" : "bg-[#48F5D3]";

  return (
    <form onSubmit={handleSubmit} className="mt-4 grid gap-4">
      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        <input ref={inputRef} name="file" type="file" required className={inputClass} disabled={state.status === "uploading" || isPending} />
        <button
          type="submit"
          disabled={state.status === "uploading" || isPending}
          className="rounded-full bg-[#48F5D3] px-5 py-3 text-sm font-semibold text-[#05110e] transition hover:shadow-[0_0_26px_rgba(72,245,211,0.2)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state.status === "uploading" ? "上传中..." : "上传并创建记录"}
        </button>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
        <div className="h-2 overflow-hidden rounded-full bg-[#07101E]">
          <div className={`h-full rounded-full transition-all duration-200 ${barColor}`} style={{ width: `${state.progress}%` }} />
        </div>
        <p
          className={`mt-3 text-sm ${
            state.status === "success" ? "text-[#48F5D3]" : state.status === "error" ? "text-red-200" : "text-[#8B95A7]"
          }`}
          role="status"
        >
          {state.message}
        </p>
      </div>
    </form>
  );
}
