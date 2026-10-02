import { FormSubmitButton, type FormSubmitButtonProps } from "@/components/form-submit-button";

export function AdminSection({
  title,
  intro,
  children
}: React.PropsWithChildren<{ title: string; intro?: string }>) {
  return (
    <section className="enhe-admin-section">
      <h1 className="enhe-admin-title text-3xl font-black">{title}</h1>
      {intro ? <p className="enhe-admin-intro mt-3 max-w-3xl text-sm font-medium leading-6">{intro}</p> : null}
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
    <label className={`enhe-admin-field${className ? ` ${className}` : ""}`}>
      <span className="mb-2 block text-sm font-semibold">{label}</span>
      {children}
    </label>
  );
}

export function AdminContentShell({
  children,
  className
}: React.PropsWithChildren<{ className?: string }>) {
  return <div className={`enhe-admin-content-shell${className ? ` ${className}` : ""}`}>{children}</div>;
}

export const inputClass = "enhe-admin-input w-full rounded-xl border border-white/14 bg-white/7 px-4 py-3 text-sm outline-none placeholder:text-[var(--marketing-muted)]/75 focus:border-[var(--marketing-accent)]";
export const selectClass = "enhe-admin-input w-full rounded-xl border border-white/14 bg-white/7 px-4 py-3 text-sm outline-none focus:border-[var(--marketing-accent)]";
export const textareaClass = "enhe-admin-input min-h-28 w-full rounded-xl border border-white/14 bg-white/7 px-4 py-3 text-sm outline-none placeholder:text-[var(--marketing-muted)]/75 focus:border-[var(--marketing-accent)]";

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
