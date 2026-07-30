"use client";

import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";

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
}: {
  currentFileId?: string | null;
  currentFileName?: string | null;
  labels: Labels;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileId, setFileId] = useState(currentFileId ?? "");
  const [fileName, setFileName] = useState(currentFileName ?? "");
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);

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
    <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
      <input type="hidden" name="downloadFileId" value={fileId} />
      <p className="text-sm font-semibold text-[#F6FAFF]">{labels.title}</p>
      <p className="mt-2 text-xs leading-5 text-[#8B95A7]">{labels.hint}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[var(--marketing-accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#56bfd0]">
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
          <button
            type="button"
            title={labels.remove}
            aria-label={labels.remove}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-[#E8EEF8]"
            onClick={() => {
              setFileId("");
              setFileName("");
              setStatus("");
              if (inputRef.current) inputRef.current.value = "";
            }}
          >
            <X size={17} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {fileName ? <p className="mt-3 break-all text-sm text-[#C5D0E2]">{fileName}</p> : null}
      {status ? <p className="mt-2 text-xs text-[var(--marketing-accent)]" aria-live="polite">{status}</p> : null}
    </div>
  );
}
