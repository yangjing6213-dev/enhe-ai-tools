"use client";

import { CopyButton } from "./copy-button";

export function CodeBlock({ code, title, language = "bash" }: { code: string; title?: string; language?: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/12 bg-[#14161b]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div>
          {title ? <p className="text-sm font-black text-[var(--marketing-text)]">{title}</p> : null}
          <p className="text-xs font-semibold text-[var(--marketing-muted)]">{language}</p>
        </div>
        <CopyButton value={code} />
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-7 text-[#E8EEF8]"><code>{code}</code></pre>
    </div>
  );
}
