"use client";

import { useRef, useState } from "react";
import { usePendingUploadGuard } from "@/app/admin/use-pending-upload-guard";
import HoldButton from "@/components/hold-button";
import { Upload } from "lucide-react";

type Labels = {
  title: string;
  hint: string;
  choose: string;
  uploading: string;
  uploaded: string;
  remove: string;
  failed: string;
};

export function AiSkillPackageUploadField({
  currentFileId,
  currentFileName,
  labels,
  locale = "zh",
}: {
  currentFileId?: string | null;
  currentFileName?: string | null;
  labels: Labels;
  locale?: "zh" | "en";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileId, setFileId] = useState(currentFileId ?? "");
  const [fileName, setFileName] = useState(currentFileName ?? "");
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);
  const rootRef = usePendingUploadGuard(uploading);

  async function uploadPackage(file: File) {
    setUploading(true);
    setStatus(labels.uploading);
    const formData = new FormData();
    formData.set("file", file);

    try {
      const response = await fetch("/api/admin/ai-skill-upload", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as {
        id?: string;
        fileName?: string;
        message?: string;
      };
      if (!response.ok || !result.id) {
        throw new Error(result.message || labels.failed);
      }
      setFileId(result.id);
      setFileName(result.fileName || file.name);
      setStatus(labels.uploaded);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : labels.failed);
      if (inputRef.current) inputRef.current.value = "";
    } finally {
      setUploading(false);
    }
  }

  return (
    <div ref={rootRef} aria-busy={uploading} className="rounded-2xl border border-white/10 bg-white/6 p-4">
      <input type="hidden" name="downloadFileId" value={fileId} />
      <p className="text-sm font-semibold text-[#F6FAFF]">{labels.title}</p>
      <p className="mt-2 text-xs leading-5 text-[#8B95A7]">{labels.hint}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="enhe-admin-package-picker inline-flex cursor-pointer items-center gap-2 rounded-full bg-[var(--marketing-accent)] px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-[var(--blue-12)]">
          <Upload size={16} aria-hidden="true" />
          {uploading ? labels.uploading : labels.choose}
          <input
            ref={inputRef}
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            className="sr-only"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadPackage(file);
            }}
          />
        </label>
        {fileId ? (
          <HoldButton
            title={labels.remove}
            aria-label={locale === "en" ? `Hold to ${labels.remove}` : `长按${labels.remove}`}
            pendingLabel={locale === "en" ? "Removing…" : "正在移除"}
            errorLabel={locale === "en" ? "Remove failed" : "移除失败"}
            doneLabel={locale === "en" ? "Removed" : "已移除"}
            hint={locale === "en" ? "Hold for 2 seconds. Save to apply." : "按住2秒，保存后生效"}
            onHold={() => {
              setFileId("");
              setFileName("");
              setStatus("");
              if (inputRef.current) inputRef.current.value = "";
            }}
          >
            {locale === "en" ? `Hold to ${labels.remove}` : `长按${labels.remove}`}
          </HoldButton>
        ) : null}
      </div>
      {fileName ? <p className="mt-3 break-all text-sm text-[#C5D0E2]">{fileName}</p> : null}
      {status ? <p className="mt-2 text-xs text-[var(--marketing-accent)]" aria-live="polite">{status}</p> : null}
    </div>
  );
}
