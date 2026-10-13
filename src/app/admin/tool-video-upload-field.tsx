"use client";

import { useRef, useState, type ChangeEvent } from "react";

import { usePendingUploadGuard } from "@/app/admin/use-pending-upload-guard";

type UploadState = {
  status: "idle" | "uploading" | "success" | "error";
  progress: number;
  message: string;
};

type ToolVideoUploadFieldProps = {
  urlName: "videoUrl" | "videoUrl2" | "videoUrl3";
  uploadLabel: string;
  currentUrl?: string | null;
  inputClass: string;
  toolSlug?: string | null;
};

const maxVideoBytes = 500 * 1024 * 1024;
const videoAccept = "video/mp4,video/webm,video/quicktime,video/*";

function formatBytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)}MB`;
}

function isValidVideoFile(file: File) {
  return file.type.startsWith("video/") || /\.(mp4|webm|mov|m4v)$/i.test(file.name);
}

export function ToolVideoUploadField({
  urlName,
  uploadLabel,
  currentUrl,
  inputClass,
  toolSlug,
}: ToolVideoUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [videoUrl, setVideoUrl] = useState(currentUrl ?? "");
  const [state, setState] = useState<UploadState>({
    status: "idle",
    progress: 0,
    message: "",
  });

  const rootRef = usePendingUploadGuard(state.status === "uploading");

  function setError(message: string) {
    if (fileInputRef.current) fileInputRef.current.value = "";
    setState({ status: "error", progress: 0, message });
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

    if (!isValidVideoFile(file)) {
      setError(`请上传 MP4、WebM 或 MOV 等视频文件，${file.name} 格式不支持。`);
      return;
    }

    if (file.size > maxVideoBytes) {
      setError(`视频文件不能超过 ${formatBytes(maxVideoBytes)}。${file.name} 为 ${formatBytes(file.size)}。`);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("toolSlug", toolSlug || "tool");

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/tool-video-upload");
    setState({ status: "uploading", progress: 0, message: `正在上传：${file.name}，完成后再保存产品信息。` });

    xhr.upload.onprogress = (progressEvent) => {
      if (!progressEvent.lengthComputable) {
        setState((current) => ({ ...current, progress: Math.max(current.progress, 8) }));
        return;
      }
      const progress = Math.min(99, Math.round((progressEvent.loaded / progressEvent.total) * 100));
      setState((current) => ({ ...current, progress }));
    };

    xhr.onerror = () => {
      setError("上传失败：网络连接中断，请稍后重试。");
    };

    xhr.onload = () => {
      let payload: { videoUrl?: string; message?: string } = {};
      try {
        payload = JSON.parse(xhr.responseText || "{}");
      } catch {
        payload = {};
      }

      if (xhr.status >= 200 && xhr.status < 300 && payload.videoUrl) {
        setVideoUrl(payload.videoUrl);
        setState({
          status: "success",
          progress: 100,
          message: payload.message ?? "视频上传成功，请保存产品信息。",
        });
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      setState({
        status: "error",
        progress: 0,
        message: payload.message ? `上传失败：${payload.message}` : `上传失败：服务器返回 ${xhr.status}`,
      });
    };

    xhr.send(formData);
  }

  const barColor = state.status === "error" ? "bg-red-300" : "bg-[var(--marketing-accent)]";

  return (
    <div ref={rootRef} className="grid gap-3" aria-busy={state.status === "uploading"}>
      <input
        name={urlName}
        value={videoUrl}
        onChange={(event) => setVideoUrl(event.currentTarget.value)}
        placeholder="/uploads/tool-videos/demo.mp4 或 https://..."
        className={inputClass}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept={videoAccept}
        className={inputClass}
        onChange={handleFileChange}
        disabled={state.status === "uploading"}
        aria-label={uploadLabel}
      />
      {state.message ? (
        <div className="rounded-xl border border-white/10 bg-white/6 p-3">
          <div className="h-2 overflow-hidden rounded-full bg-[#07101E]">
            <div className={`h-full rounded-full transition-all duration-200 ${barColor}`} style={{ width: `${state.progress}%` }} />
          </div>
          <p
            className={`mt-2 text-xs leading-5 ${
              state.status === "success" ? "text-[var(--marketing-accent)]" : state.status === "error" ? "text-red-100" : "text-[#8B95A7]"
            }`}
            role="status"
          >
            {state.message}
          </p>
        </div>
      ) : null}
    </div>
  );
}
