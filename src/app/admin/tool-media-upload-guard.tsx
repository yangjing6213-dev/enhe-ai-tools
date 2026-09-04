"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";

type GuardedUploadName = "coverImageFile" | "screenshotFiles";

type ToolMediaUploadGuardProps = {
  name: GuardedUploadName;
  inputClass: string;
  multiple?: boolean;
};

const maxImageBytes = 8 * 1024 * 1024;
const maxBatchBytes = 64 * 1024 * 1024;

function formatBytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)}MB`;
}

export function ToolMediaUploadGuard({ name, inputClass, multiple = false }: ToolMediaUploadGuardProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const rejectedFileRef = useRef(false);
  const [message, setMessage] = useState("");

  function rejectInput(input: HTMLInputElement, nextMessage: string) {
    input.value = "";
    rejectedFileRef.current = true;
    setMessage(nextMessage);
  }

  const validateInput = useCallback((input: HTMLInputElement) => {
    const files = Array.from(input.files ?? []);
    if (files.length === 0) {
      setMessage("");
      rejectedFileRef.current = false;
      return true;
    }

    const oversized = files.find((file) => file.size > maxImageBytes);
    if (oversized) {
      rejectInput(
        input,
        `图片文件不能超过 ${formatBytes(maxImageBytes)}。${oversized.name} 为 ${formatBytes(oversized.size)}；安装包请先到“文件管理”上传，再回到这里绑定下载文件。`
      );
      return false;
    }

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > maxBatchBytes) {
      rejectInput(input, `本次选择的图片合计不能超过 ${formatBytes(maxBatchBytes)}，请分批上传商品图。`);
      return false;
    }

    setMessage("");
    rejectedFileRef.current = false;
    return true;
  }, []);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (!validateInput(event.currentTarget)) {
      event.preventDefault();
    }
  }

  useEffect(() => {
    const form = rootRef.current?.closest("form");
    const input = rootRef.current?.querySelector<HTMLInputElement>(`input[name="${name}"]`);
    if (!form || !input) return;
    const guardedInput = input;

    function handleSubmit(event: SubmitEvent) {
      if (rejectedFileRef.current) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (!validateInput(guardedInput)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    form.addEventListener("submit", handleSubmit, { capture: true });
    return () => form.removeEventListener("submit", handleSubmit, { capture: true });
  }, [name, validateInput]);

  return (
    <span ref={rootRef} className="block">
      <input name={name} type="file" accept="image/*" multiple={multiple} className={inputClass} onChange={handleChange} />
      {message ? (
        <span className="mt-2 block rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs leading-5 text-red-100">
          {message}
        </span>
      ) : null}
    </span>
  );
}
