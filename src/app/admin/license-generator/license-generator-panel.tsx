"use client";

import { useActionState, useMemo, useState } from "react";
import { generateLicenseCodeAdminAction } from "@/app/admin/actions";
import { inputClass, selectClass, textareaClass } from "@/app/admin/admin-ui";
import { PasswordInput } from "@/components/password-input";
import {
  initialLicenseGeneratorState,
  type LicenseGeneratorActionState
} from "@/lib/license-generator-action-state";

export type LicenseGeneratorLabels = {
  type: string;
  single: string;
  unlimited: string;
  machineId: string;
  note: string;
  adminKey: string;
  adminKeyHint: string;
  serverMachineId: string;
  generate: string;
  copy: string;
  output: string;
  outputPlaceholder: string;
  success: string;
  desktopHint: string;
  issuedAt: string;
  noCodeToCopy: string;
};

type LicenseGeneratorPanelProps = {
  labels: LicenseGeneratorLabels;
  serverMachineId: string;
};

export function LicenseGeneratorPanel({ labels, serverMachineId }: LicenseGeneratorPanelProps) {
  const [state, formAction, pending] = useActionState<LicenseGeneratorActionState, FormData>(
    generateLicenseCodeAdminAction,
    initialLicenseGeneratorState
  );
  const [licenseType, setLicenseType] = useState<"single" | "unlimited">("single");
  const [machineId, setMachineId] = useState(serverMachineId);
  const [copyMessage, setCopyMessage] = useState("");

  const statusClass = useMemo(() => {
    if (!state.message) return "";
    return state.ok
      ? "border-[#5EF1C7]/30 bg-[#5EF1C7]/10 text-[#5EF1C7]"
      : "border-red-400/30 bg-red-400/10 text-red-100";
  }, [state.message, state.ok]);

  async function copyCode() {
    if (!state.code) {
      setCopyMessage(labels.noCodeToCopy);
      return;
    }
    await navigator.clipboard.writeText(state.code);
    setCopyMessage(labels.success);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <form action={formAction} className="dossier-card grid gap-5 p-6">
        {state.message ? <p className={`rounded-xl border px-4 py-3 text-sm ${statusClass}`}>{state.message}</p> : null}

        <label>
          <span className="mb-2 block text-sm text-[#F6FAFF]">{labels.type}</span>
          <select
            name="licenseType"
            value={licenseType}
            onChange={(event) => setLicenseType(event.target.value as "single" | "unlimited")}
            className={selectClass}
          >
            <option value="single">{labels.single}</option>
            <option value="unlimited">{labels.unlimited}</option>
          </select>
        </label>

        <label>
          <span className="mb-2 block text-sm text-[#F6FAFF]">{labels.machineId}</span>
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              name="machineId"
              value={machineId}
              onChange={(event) => setMachineId(event.target.value)}
              disabled={licenseType === "unlimited"}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => setMachineId(serverMachineId)}
              className="rounded-full border border-[rgba(210,230,255,0.16)] px-4 py-3 text-sm font-semibold text-[#F6FAFF] transition hover:border-[var(--marketing-accent)] hover:text-[var(--marketing-accent)]"
            >
              {labels.serverMachineId}
            </button>
          </div>
        </label>

        <label>
          <span className="mb-2 block text-sm text-[#F6FAFF]">{labels.note}</span>
          <input name="note" className={inputClass} placeholder="Customer / order / usage note" />
        </label>

        <label>
          <span className="mb-2 block text-sm text-[#F6FAFF]">{labels.adminKey}</span>
          <PasswordInput name="adminKey" className={inputClass} />
          <span className="mt-2 block text-xs text-[#8F9DB2]">{labels.adminKeyHint}</span>
        </label>

        <p className="rounded-xl border border-[rgba(210,230,255,0.12)] bg-[rgba(238,246,255,0.05)] px-4 py-3 text-xs leading-6 text-[#8F9DB2]">
          {labels.desktopHint}
        </p>

        <button
          disabled={pending}
          className="rounded-full bg-[var(--marketing-accent)] px-5 py-3 text-sm font-semibold text-white transition hover:shadow-[0_0_26px_rgba(240,90,53,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "..." : labels.generate}
        </button>
      </form>

      <section className="dossier-card grid gap-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[#F6FAFF]">{labels.output}</h2>
            {state.payload?.issued_at ? <p className="mt-1 text-xs text-[#8F9DB2]">{labels.issuedAt}: {state.payload.issued_at}</p> : null}
          </div>
          <button
            type="button"
            onClick={copyCode}
            className="rounded-full border border-[rgba(210,230,255,0.16)] px-4 py-2 text-sm font-semibold text-[#F6FAFF] transition hover:border-[var(--marketing-accent)] hover:text-[var(--marketing-accent)]"
          >
            {labels.copy}
          </button>
        </div>

        <textarea
          readOnly
          value={state.code}
          placeholder={labels.outputPlaceholder}
          className={`${textareaClass} min-h-64 font-mono text-xs leading-6`}
        />

        {state.payload ? (
          <div className="grid gap-3 rounded-2xl border border-[rgba(210,230,255,0.12)] bg-[rgba(238,246,255,0.04)] p-4 text-sm text-[#8F9DB2] md:grid-cols-2">
            <span>{labels.type}: <strong className="text-[#F6FAFF]">{state.payload.license_type}</strong></span>
            <span>{labels.machineId}: <strong className="text-[#F6FAFF]">{state.payload.machine_id ?? "-"}</strong></span>
            <span className="md:col-span-2">{labels.note}: <strong className="text-[#F6FAFF]">{state.payload.note || "-"}</strong></span>
          </div>
        ) : null}

        {copyMessage ? <p className="text-sm text-[#5EF1C7]">{copyMessage}</p> : null}
      </section>
    </div>
  );
}
