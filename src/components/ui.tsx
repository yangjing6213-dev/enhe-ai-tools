import { PrefetchLink } from "@/components/prefetch-link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export function Container({ className, children }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}

export function Badge({ children, className }: React.PropsWithChildren<{ className?: string }>) {
  return (
    <span className={cn("rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground", className)}>
      {children}
    </span>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className,
  ...props
}: React.PropsWithChildren<
  Omit<ComponentProps<typeof PrefetchLink>, "children" | "className" | "href"> & {
    href: string;
    variant?: "primary" | "ghost";
    className?: string;
  }
>) {
  return (
    <Button
      asChild
      variant={variant === "primary" ? "default" : "outline"}
      className={cn(
        "cursor-target h-auto min-h-11 rounded-full px-5 py-3 font-bold transition-[background-color,border-color,color,box-shadow,transform] duration-200 hover:-translate-y-0.5",
        variant === "primary" ? "shadow-[0_12px_28px_color-mix(in_srgb,var(--primary)_24%,transparent)]" : "bg-background/80 hover:border-primary hover:text-primary",
        className
      )}
    >
      <PrefetchLink {...props} href={href}>
        <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
      </PrefetchLink>
    </Button>
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
      <h2 className="text-lg font-bold text-[var(--marketing-text)]">{title}</h2>
      <p className="mt-2 text-sm text-[var(--marketing-muted)]">{text}</p>
    </div>
  );
}
