import { FormSubmitButton, type FormSubmitButtonProps } from "@/components/form-submit-button";

export function AdminSection({
  title,
  intro,
  children
}: React.PropsWithChildren<{ title: string; intro?: string }>) {
  return (
    <section>
      <h1 className="text-3xl font-black text-[var(--marketing-text)]">{title}</h1>
      {intro ? <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-[var(--marketing-muted)]">{intro}</p> : null}
      <div className="mt-8">{children}</div>
    </section>
  );
}

export function Field({
  label,
  children,
  className
}: React.PropsWithChildren<{ label: string; className?: string }>) {
  return (
    <label className={className}>
      <span className="mb-2 block text-sm font-semibold text-[var(--marketing-text)]">{label}</span>
      {children}
    </label>
  );
}

export const inputClass = "w-full rounded-xl border border-white/14 bg-white/7 px-4 py-3 text-sm text-[var(--marketing-text)] outline-none placeholder:text-[var(--marketing-muted)]/75 focus:border-[var(--marketing-accent)]";
export const selectClass = "w-full rounded-xl border border-white/14 bg-white/7 px-4 py-3 text-sm text-[var(--marketing-text)] outline-none focus:border-[var(--marketing-accent)]";
export const textareaClass = "min-h-28 w-full rounded-xl border border-white/14 bg-white/7 px-4 py-3 text-sm text-[var(--marketing-text)] outline-none placeholder:text-[var(--marketing-muted)]/75 focus:border-[var(--marketing-accent)]";

export function SubmitButton({ children = "Save", ...props }: FormSubmitButtonProps) {
  return <FormSubmitButton {...props}>{children}</FormSubmitButton>;
}

export function DangerButton({ children = "Delete", ...props }: FormSubmitButtonProps) {
  return (
    <FormSubmitButton variant="danger" {...props}>
      {children}
    </FormSubmitButton>
  );
}
