"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import SlideCommit from "@/components/auth/slide-commit";

type AuthSlideSubmitProps = {
  submitAction: (formData: FormData) => Promise<void>;
  label: string;
  pendingLabel: string;
  errorLabel: string;
  fallbackLabel: string;
  error?: boolean;
  className?: string;
};

export function AuthSlideSubmit({
  submitAction,
  label,
  pendingLabel,
  errorLabel,
  fallbackLabel,
  error = false,
  className,
}: AuthSlideSubmitProps) {
  const { pending } = useFormStatus();
  const submitRef = useRef<HTMLButtonElement>(null);
  const submittingRef = useRef(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const form = submitRef.current?.form;
    if (!form) return;

    function handleSubmit(event: SubmitEvent) {
      if (submittingRef.current) {
        event.preventDefault();
        return;
      }

      submittingRef.current = true;
      setSubmitted(true);
    }

    form.addEventListener("submit", handleSubmit);
    return () => form.removeEventListener("submit", handleSubmit);
  }, []);

  async function submitFormAction(formData: FormData) {
    submittingRef.current = true;
    setSubmitted(true);
    try {
      await submitAction(formData);
    } finally {
      // The original action's promise is the completion boundary, including redirects.
      submittingRef.current = false;
      setSubmitted(false);
    }
  }

  function confirmSubmission() {
    const submitter = submitRef.current;
    const form = submitter?.form;
    if (!form || !submitter || pending || submittingRef.current) return false;
    if (!form.reportValidity()) return false;

    form.requestSubmit(submitter);
  }

  return (
    <div className={className} data-auth-slide-submit="true">
      <noscript>
        <style>{".auth-slide-submit-control{display:none!important}"}</style>
        <button type="submit" className="login-submit-button h-14 w-full rounded-full text-base font-semibold text-white">
          {fallbackLabel}
        </button>
      </noscript>
      <button type="submit" hidden tabIndex={-1} aria-hidden="true" disabled={pending || submitted} ref={submitRef} formAction={submitFormAction} />
      <div className="auth-slide-submit-control">
        <SlideCommit
          confirmationMode="form"
          label={label}
          ariaLabel={label}
          pendingLabel={pendingLabel}
          errorLabel={errorLabel}
          pending={pending || submitted}
          error={error}
          onConfirm={confirmSubmission}
        />
      </div>
    </div>
  );
}
