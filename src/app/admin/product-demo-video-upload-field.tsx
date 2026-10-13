"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { parseProductDemoVideoUploadResponse } from "@/lib/product-demo-video-upload-response";

type UploadState = {
  status: "idle" | "uploading" | "success" | "error";
  progress: number;
  message: string;
};

type ProductDemoVideoUploadFieldProps = {
  currentUrl?: string | null;
  inputClass: string;
  slug?: string | null;
  folderPrefix?: string;
  fieldName?: string | null;
  onUrlChange?: (url: string) => void;
};

const maxVideoBytes = 500 * 1024 * 1024;
const videoAccept = "video/mp4,video/webm,video/quicktime,video/*";

function formatBytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)}MB`;
}

function isValidVideoFile(file: File) {
  return file.type.startsWith("video/") || /\.(mp4|webm|mov|m4v)$/i.test(file.name);
}

export function ProductDemoVideoUploadField({
  currentUrl,
  inputClass,
  slug,
  folderPrefix,
  fieldName = "videoUrl",
  onUrlChange,
}: ProductDemoVideoUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [videoUrl, setVideoUrl] = useState(currentUrl ?? "");
  const [state, setState] = useState<UploadState>({
    status: "idle",
    progress: 0,
    message: videoUrl ? "已配置视频，上传新文件会替换当前视频。" : "",
  });

  function setError(message: string) {
    if (fileInputRef.current) fileInputRef.current.value = "";
    setState({ status: "error", progress: 0, message });
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

    if (!isValidVideoFile(file)) {
      setError(`请上传 MP4、WebM 或 MOV 视频文件，${file.name} 格式不支持。`);
      return;
    }

    if (file.size > maxVideoBytes) {
      setError(`视频文件不能超过 ${formatBytes(maxVideoBytes)}。${file.name} 为 ${formatBytes(file.size)}。`);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("toolSlug", folderPrefix ? `${folderPrefix}/${slug || "showcase"}` : `product-demo-videos/${slug || "demo"}`);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/tool-video-upload");
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
      setError("上传失败：网络连接中断，请稍后重试。");
    };

    xhr.onabort = () => {
      setError("上传已取消，请重新选择视频文件。");
    };

    xhr.onload = () => {
      const uploadResponse = parseProductDemoVideoUploadResponse(xhr.responseText, xhr.status);

      if (uploadResponse.ok) {
        setVideoUrl(uploadResponse.videoUrl);
        onUrlChange?.(uploadResponse.videoUrl);
        setState({
          status: "success",
          progress: 100,
          message: uploadResponse.message ?? "视频上传成功，请保存产品演示。",
        });
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      setState({
        status: "error",
        progress: 0,
        message: uploadResponse.message,
      });
    };

    try {
      xhr.send(formData);
    } catch {
      setError("上传失败：浏览器无法发送该视频文件，请压缩后重试。");
    }
  }

  const barColor = state.status === "error" ? "bg-red-300" : "bg-[var(--marketing-accent)]";

  return (
    <div className="grid gap-3">
      {fieldName ? <input name={fieldName} type="hidden" value={videoUrl} readOnly /> : null}
      <input
        ref={fileInputRef}
        type="file"
        accept={videoAccept}
        className={inputClass}
        onChange={handleFileChange}
        disabled={state.status === "uploading"}
        aria-label="上传产品演示视频"
      />
      {videoUrl ? (
        <p className="break-all text-xs leading-5 text-[#8B95A7]">当前视频：{videoUrl}</p>
      ) : null}
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
