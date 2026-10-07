"use client";

import { useActionState, useMemo, useState } from "react";
import { generateLicenseCodeAdminAction } from "@/app/admin/actions";
import { inputClass, selectClass, textareaClass } from "@/app/admin/admin-ui";
import { PasswordInput } from "@/components/password-input";
import {
  initialLicenseGeneratorState,
  type LicenseGeneratorActionState
} from "@/lib/license-generator-action-state";

type LicenseProduct = "faceswap" | "lumi-os";
type LicenseType = "single" | "unlimited";

export type LicenseGeneratorLabels = {
  product: string;
  faceswapProduct: string;
  lumiProduct: string;
  type: string;
  single: string;
  unlimited: string;
  machineId: string;
  licenseId: string;
  note: string;
  adminKey: string;
  adminKeyHint: string;
  serverMachineId: string;
  expiresAt: string;
  expiresAtHint: string;
  generate: string;
  copy: string;
  output: string;
  outputPlaceholder: string;
  success: string;
  desktopHint: string;
  lumiDesktopHint: string;
  lumiPrivateKeyHint: string;
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
  const [licenseProduct, setLicenseProduct] = useState<LicenseProduct>("faceswap");
  const [licenseType, setLicenseType] = useState<LicenseType>("single");
  const [machineId, setMachineId] = useState(serverMachineId);
  const [copyMessage, setCopyMessage] = useState("");
  const isLumiOs = licenseProduct === "lumi-os";
  const isMachineIdDisabled = !isLumiOs && licenseType === "unlimited";
  const issuedAt = state.payload?.issuedAt ?? state.payload?.issued_at;
  const machineCode = state.payload?.machineCode ?? state.payload?.machine_id;
  const payloadProductLabel = state.payload?.product === "lumi-os" ? labels.lumiProduct : labels.faceswapProduct;

  const statusClass = useMemo(() => {
    if (!state.message) return "";
    return state.ok
      ? "border-[#5EF1C7]/30 bg-[#5EF1C7]/10 text-[#5EF1C7]"
      : "border-red-400/30 bg-red-400/10 text-red-100";
  }, [state.message, state.ok]);

  function updateProduct(value: LicenseProduct) {
    setLicenseProduct(value);
    if (value === "lumi-os") {
      setLicenseType("single");
      if (machineId === serverMachineId) {
        setMachineId("");
      }
    }
  }

  async function copyCode() {
    if (!state.code) {
      setCopyMessage(labels.noCodeToCopy);
      return;
    }
    await navigator.clipboard.writeText(state.code);
    setCopyMessage(labels.success);
  }

  return (
    <div className="enhe-admin-license-generator-panel grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <form action={formAction} className="enhe-admin-license-generator-form dossier-card grid gap-5 p-6">
        {state.message ? (
          <p className={`enhe-admin-license-generator-status ${state.ok ? "is-success" : "is-error"} rounded-xl border px-4 py-3 text-sm ${statusClass}`}>
            {state.message}
          </p>
        ) : null}

        <label>
          <span className="mb-2 block text-sm text-[#F6FAFF]">{labels.product}</span>
          <select
            name="licenseProduct"
            value={licenseProduct}
            onChange={(event) => updateProduct(event.target.value as LicenseProduct)}
            className={selectClass}
          >
            <option value="faceswap">{labels.faceswapProduct}</option>
            <option value="lumi-os">{labels.lumiProduct}</option>
          </select>
        </label>

        {isLumiOs ? (
          <input type="hidden" name="licenseType" value="single" />
        ) : (
          <label>
            <span className="mb-2 block text-sm text-[#F6FAFF]">{labels.type}</span>
            <select
              name="licenseType"
              value={licenseType}
              onChange={(event) => setLicenseType(event.target.value as LicenseType)}
              className={selectClass}
            >
              <option value="single">{labels.single}</option>
              <option value="unlimited">{labels.unlimited}</option>
            </select>
          </label>
        )}

        <label>
          <span className="mb-2 block text-sm text-[#F6FAFF]">{labels.machineId}</span>
          <div className="grid gap-3 2xl:grid-cols-[minmax(0,1fr)_auto]">
            <input
              name="machineId"
              value={machineId}
              onChange={(event) => setMachineId(event.target.value)}
              disabled={isMachineIdDisabled}
              placeholder={isLumiOs ? "LUMI-WIN-ABCDE12345" : undefined}
              className={inputClass}
            />
            {!isLumiOs ? (
              <button
                type="button"
                onClick={() => setMachineId(serverMachineId)}
                className="rounded-full border border-[rgba(210,230,255,0.16)] px-4 py-3 text-sm font-semibold text-[#F6FAFF] transition hover:border-[var(--marketing-accent)] hover:text-[var(--marketing-accent)]"
              >
                {labels.serverMachineId}
              </button>
            ) : null}
          </div>
        </label>

        {isLumiOs ? (
          <>
            <label>
              <span className="mb-2 block text-sm text-[#F6FAFF]">{labels.licenseId}</span>
              <input name="licenseId" className={inputClass} placeholder="LIC-20260624-001" />
            </label>

            <label>
              <span className="mb-2 block text-sm text-[#F6FAFF]">{labels.expiresAt}</span>
              <input name="expiresAt" type="date" className={inputClass} />
              <span className="mt-2 block text-xs text-[#8F9DB2]">{labels.expiresAtHint}</span>
            </label>
          </>
        ) : null}

        <label>
          <span className="mb-2 block text-sm text-[#F6FAFF]">{labels.note}</span>
          <input name="note" className={inputClass} placeholder="Customer / order / usage note" />
        </label>

        {!isLumiOs && licenseType === "unlimited" ? (
          <label>
            <span className="mb-2 block text-sm text-[#F6FAFF]">{labels.adminKey}</span>
            <PasswordInput name="adminKey" className={inputClass} />
            <span className="mt-2 block text-xs text-[#8F9DB2]">{labels.adminKeyHint}</span>
          </label>
        ) : null}

        <p className="text-xs leading-6 text-[#8F9DB2]">
          {isLumiOs ? labels.lumiDesktopHint : labels.desktopHint}
        </p>
        {isLumiOs ? <p className="text-xs leading-6 text-[#8F9DB2]">{labels.lumiPrivateKeyHint}</p> : null}

        <button
          disabled={pending}
          className="rounded-full bg-[var(--marketing-accent)] px-5 py-3 text-sm font-semibold text-white transition hover:shadow-[0_0_26px_rgba(65,197,219,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "..." : labels.generate}
        </button>
      </form>

      <section className="enhe-admin-license-generator-output dossier-card grid gap-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[#F6FAFF]">{labels.output}</h2>
            {issuedAt ? <p className="mt-1 text-xs text-[#8F9DB2]">{labels.issuedAt}: {issuedAt}</p> : null}
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
            <span>{labels.product}: <strong className="text-[#F6FAFF]">{payloadProductLabel}</strong></span>
            <span>{labels.type}: <strong className="text-[#F6FAFF]">{state.payload.license_type}</strong></span>
            <span>{labels.machineId}: <strong className="text-[#F6FAFF]">{machineCode ?? "-"}</strong></span>
            <span>{labels.licenseId}: <strong className="text-[#F6FAFF]">{state.payload.licenseId ?? "-"}</strong></span>
            {state.payload.expiresAt ? (
              <span>{labels.expiresAt}: <strong className="text-[#F6FAFF]">{state.payload.expiresAt}</strong></span>
            ) : null}
            <span className="md:col-span-2">{labels.note}: <strong className="text-[#F6FAFF]">{state.payload.note || "-"}</strong></span>
          </div>
        ) : null}

        {copyMessage ? <p className="text-sm text-[#5EF1C7]">{copyMessage}</p> : null}
      </section>
    </div>
  );
}
