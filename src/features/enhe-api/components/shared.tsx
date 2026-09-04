import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function ApiPageFrame({ children, className }: React.PropsWithChildren<{ className?: string }>) {
  return <main className={cn("mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8", className)}>{children}</main>;
}

export function ApiHeroTitle({ kicker, title, intro }: { kicker?: string; title: string; intro: string }) {
  return (
    <div className="max-w-3xl">
      {kicker ? <p className="mb-4 text-sm font-black text-[var(--marketing-accent)]">{kicker}</p> : null}
      <h1 className="text-4xl font-black leading-tight tracking-normal text-[var(--marketing-text)] md:text-6xl">{title}</h1>
      <p className="mt-5 max-w-2xl text-base font-semibold leading-8 text-[var(--marketing-muted)] md:text-lg">{intro}</p>
    </div>
  );
}

export function ApiSectionHeading({ title, intro }: { title: string; intro?: string }) {
  return (
    <div className="mb-6 max-w-3xl">
      <h2 className="text-2xl font-black tracking-normal text-[var(--marketing-text)] md:text-3xl">{title}</h2>
      {intro ? <p className="mt-3 text-sm font-semibold leading-7 text-[var(--marketing-muted)] md:text-base">{intro}</p> : null}
    </div>
  );
}

export function ApiPanel({
  title,
  description,
  children,
  action,
  className
}: React.PropsWithChildren<{ title?: string; description?: string; action?: React.ReactNode; className?: string }>) {
  return (
    <section className={cn("surface-panel p-5 md:p-6", className)}>
      {(title || description || action) ? (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            {title ? <h2 className="text-lg font-black text-[var(--marketing-text)]">{title}</h2> : null}
            {description ? <p className="mt-2 text-sm leading-6 text-[var(--marketing-muted)]">{description}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function MetricCard({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="surface-panel-soft min-h-32 p-5">
      <p className="text-sm font-bold text-[var(--marketing-muted)]">{label}</p>
      <p className="mt-3 text-2xl font-black text-[var(--marketing-text)]">{value}</p>
      {helper ? <p className="mt-2 text-xs leading-5 text-[var(--marketing-muted)]">{helper}</p> : null}
    </div>
  );
}

export function StatusBadge({ status }: { status: "active" | "suspended" | "closed" | "revoked" | "paid" | "processing" | "manual" | "pending" | "qualified" | "rewarded" | "review" | "success" | "warning" | "error" }) {
  const labelMap: Record<typeof status, string> = {
    active: "启用",
    suspended: "已暂停",
    closed: "已关闭",
    revoked: "已撤销",
    paid: "已支付",
    processing: "处理中",
    manual: "手动开通",
    pending: "待激活",
    qualified: "已验证",
    rewarded: "已发放",
    review: "待审核",
    success: "成功",
    warning: "注意",
    error: "失败"
  };
  const tone =
    status === "active" || status === "paid" || status === "rewarded" || status === "success"
      ? "border-[var(--marketing-accent)]/35 bg-[var(--marketing-accent)]/12 text-[var(--marketing-accent)]"
      : status === "revoked" || status === "closed" || status === "error"
        ? "border-red-300/25 bg-red-400/10 text-red-200"
        : status === "suspended"
          ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
        : "border-white/14 bg-white/8 text-[var(--marketing-muted)]";

  return <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-black", tone)}>{labelMap[status]}</span>;
}

export function ActionLink({ href, children, className }: React.PropsWithChildren<{ href: string; className?: string }>) {
  return (
    <Link
      href={href}
      className={cn(
        "cursor-target inline-flex items-center justify-center gap-2 rounded-full border border-white/14 bg-white/8 px-4 py-2 text-sm font-black text-[var(--marketing-text)] transition hover:border-[var(--marketing-accent)] hover:text-[var(--marketing-accent)]",
        className
      )}
    >
      {children}
      <ArrowRight size={16} aria-hidden="true" />
    </Link>
  );
}

export function PrimaryActionLink({ href, children, className }: React.PropsWithChildren<{ href: string; className?: string }>) {
  return (
    <Link
      href={href}
      className={cn(
        "cursor-target inline-flex items-center justify-center gap-2 rounded-full border border-[var(--marketing-accent)] bg-[var(--marketing-accent)] px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#ff6c47]",
        className
      )}
    >
      {children}
      <ArrowRight size={16} aria-hidden="true" />
    </Link>
  );
}

export function IconFeature({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="surface-panel-soft p-5">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-white/14 bg-white/8 text-[var(--marketing-accent)]">
        <Icon size={20} aria-hidden="true" />
      </div>
      <h3 className="text-base font-black text-[var(--marketing-text)]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--marketing-muted)]">{text}</p>
    </div>
  );
}

export function MockNotice({ children }: React.PropsWithChildren) {
  return (
    <div className="rounded-2xl border border-[var(--marketing-accent)]/25 bg-[var(--marketing-accent)]/10 px-4 py-3 text-sm font-semibold leading-6 text-[var(--marketing-soft-text)]">
      {children}
    </div>
  );
}
