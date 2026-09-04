import { PrefetchLink } from "@/components/prefetch-link";
import { cn } from "@/lib/utils";

export function Container({ className, children }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}

export function Badge({ children, className }: React.PropsWithChildren<{ className?: string }>) {
  return (
    <span className={cn("rounded-full border border-white/14 bg-white/7 px-3 py-1 text-xs font-semibold text-[var(--marketing-muted)]", className)}>
      {children}
    </span>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className
}: React.PropsWithChildren<{ href: string; variant?: "primary" | "ghost"; className?: string }>) {
  return (
    <PrefetchLink
      className={cn(
        "cursor-target inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-bold transition duration-200 hover:-translate-y-0.5",
        variant === "primary"
          ? "border border-[#050505] bg-[#050505] text-white shadow-[0_14px_34px_rgba(0,0,0,0.22)] hover:bg-[#161616]"
          : "surface-panel-soft border-white/14 text-[var(--marketing-text)] hover:border-[var(--marketing-accent)] hover:text-[var(--marketing-accent)]",
        className
      )}
      href={href}
    >
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </PrefetchLink>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  intro,
  as = "h2"
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  as?: "h1" | "h2";
}) {
  const TitleTag = as;
  return (
    <div className="mb-8 max-w-3xl">
      {eyebrow ? <p className="mb-3 text-sm font-bold tracking-[0.08em] text-[var(--marketing-accent)]">{eyebrow}</p> : null}
      <TitleTag className="text-3xl font-black tracking-normal text-[var(--marketing-text)] md:text-4xl">{title}</TitleTag>
      {intro ? <p className="mt-4 text-base font-medium leading-7 text-[var(--marketing-muted)]">{intro}</p> : null}
    </div>
  );
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="surface-panel p-10 text-center">
      <h3 className="text-lg font-bold text-[var(--marketing-text)]">{title}</h3>
      <p className="mt-2 text-sm text-[var(--marketing-muted)]">{text}</p>
    </div>
  );
}
