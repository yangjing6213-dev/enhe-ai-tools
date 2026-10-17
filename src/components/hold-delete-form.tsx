"use client";

import { useEffect, useRef, type FormEvent, type FormHTMLAttributes, type ReactNode } from "react";
import HoldButton, { type HoldButtonProps, type HoldButtonSize } from "@/components/hold-button";
import type { Locale } from "@/lib/i18n";

type HoldDeleteFormProps = Omit<FormHTMLAttributes<HTMLFormElement>, "action" | "children" | "onSubmit" | "onSubmitCapture" | "title"> & {
  action: (formData: FormData) => Promise<unknown>;
  children?: ReactNode;
  label?: string;
  locale?: Locale;
  buttonClassName?: string;
  holdButtonProps?: Pick<HoldButtonProps, "backgroundColor" | "fillColor" | "textColor" | "fillTextColor" | "glow">;
  size?: HoldButtonSize;
  disabled?: boolean;
  title?: string;
};

type Completion = { resolve: (result?: false) => void; reject: (reason: unknown) => void };

export function HoldDeleteForm({ action, children, label, locale = "zh", buttonClassName, holdButtonProps, size = "md", disabled, title, ...formProps }: HoldDeleteFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const allowSubmit = useRef(false);
  const accepted = useRef(false);
  const completion = useRef<Completion | null>(null);
  const english = locale === "en";
  const deleteLabel = label ?? (english ? "Delete" : "删除");
  const holdLabel = english ? `Hold to ${deleteLabel.charAt(0).toLowerCase()}${deleteLabel.slice(1)}` : `长按${deleteLabel}`;

  useEffect(() => () => {
    allowSubmit.current = false;
    completion.current?.resolve(false);
    completion.current = null;
  }, []);

  async function submitDeletion(formData: FormData) {
    const current = completion.current;
    if (!current) return;
    try {
      const result = await action(formData);
      current.resolve(result === false ? false : undefined);
    } catch (error) {
      current.reject(error);
      // React must still receive Server Action redirects and errors.
      throw error;
    } finally {
      if (completion.current === current) completion.current = null;
    }
  }

  function guardSubmission(event: FormEvent<HTMLFormElement>) {
    if (!allowSubmit.current || event.defaultPrevented) event.preventDefault();
    else accepted.current = true;
    allowSubmit.current = false;
  }

  function confirmDeletion(): false | Promise<void | false> {
    const form = formRef.current;
    const submitter = submitRef.current;
    if (!form || !submitter || disabled || completion.current || !form.reportValidity()) return false;
    let resolve!: Completion["resolve"];
    let reject!: Completion["reject"];
    const result = new Promise<void | false>((onResolve, onReject) => { resolve = onResolve; reject = onReject; });
    const current = { resolve, reject };
    completion.current = current;
    accepted.current = false;
    allowSubmit.current = true;
    try {
      form.requestSubmit(submitter);
      if (!accepted.current) {
        current.resolve(false);
        completion.current = null;
      }
    } catch (error) {
      current.reject(error);
      completion.current = null;
    } finally { allowSubmit.current = false; }
    return result;
  }

  return <form {...formProps} ref={formRef} action={submitDeletion} onSubmit={guardSubmission} data-hold-delete-form="true">
    {children}
    <button ref={submitRef} type="submit" hidden tabIndex={-1} aria-hidden="true" disabled={disabled} />
    <HoldButton {...holdButtonProps} onHold={confirmDeletion} className={buttonClassName} size={size} disabled={disabled} title={title} aria-label={holdLabel}
      doneLabel={english ? "Deleted" : "已删除"}
      pendingLabel={english ? "Deleting…" : "删除中…"}
      errorLabel={english ? "Failed" : "删除失败"}
      hint={english ? "Hold for 2 seconds to confirm. Release or press Escape to cancel." : "长按 2 秒确认，提前松手或按 Escape 可取消。"}>
      {holdLabel}
    </HoldButton>
    <noscript><p>{english ? "Enable JavaScript to hold and confirm deletion." : "请启用 JavaScript 后长按确认删除。"}</p></noscript>
  </form>;
}
