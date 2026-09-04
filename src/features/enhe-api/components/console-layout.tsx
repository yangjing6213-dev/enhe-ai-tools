"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  CreditCard,
  FileClock,
  Gift,
  KeyRound,
  LayoutDashboard,
  UserCircle,
  WalletCards
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const consoleNavItems: Array<{ label: string; href: string; icon: LucideIcon }> = [
  { label: "概览", href: "/user/api", icon: LayoutDashboard },
  { label: "API 密钥", href: "/user/api/keys", icon: KeyRound },
  { label: "用量", href: "/user/api/usage", icon: BarChart3 },
  { label: "请求日志", href: "/user/api/logs", icon: FileClock },
  { label: "套餐与账单", href: "/user/api/billing", icon: CreditCard },
  { label: "推荐奖励", href: "/user/api/referrals", icon: Gift },
  { label: "开发者资料", href: "/user/api/profile", icon: UserCircle },
  { label: "配置文档", href: "/user/api/docs", icon: BookOpen }
];

type ApiDeveloperStatus = "active" | "suspended" | "closed";

export function ApiConsoleLayout({
  children,
  developerStatus = "active",
  restrictedReason
}: React.PropsWithChildren<{ developerStatus?: ApiDeveloperStatus; restrictedReason?: string | null }>) {
  const pathname = usePathname();

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[260px_1fr] lg:px-8">
      <aside className="surface-panel h-max p-3 lg:sticky lg:top-24">
        <div className="mb-4 rounded-2xl border border-white/12 bg-white/7 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--marketing-accent)] text-sm font-black text-white">
              API
            </span>
            <div>
              <p className="text-sm font-black text-[var(--marketing-text)]">ENHE API</p>
              <p className="text-xs font-semibold text-[var(--marketing-muted)]">开发者控制台</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-[var(--marketing-accent)]/25 bg-[var(--marketing-accent)]/10 px-3 py-2 text-xs font-bold text-[var(--marketing-soft-text)]">
            <WalletCards size={14} aria-hidden="true" />
            Mock 数据展示
          </div>
        </div>
        <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible" aria-label="ENHE API console navigation">
          {consoleNavItems.map(({ label, href, icon: Icon }) => {
            const active = href === "/user/api" ? pathname === href : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "cursor-target inline-flex min-w-max items-center gap-3 rounded-xl px-3 py-3 text-sm font-black transition lg:min-w-0",
                  active
                    ? "bg-[var(--marketing-accent)] text-white"
                    : "text-[var(--marketing-muted)] hover:bg-white/8 hover:text-[var(--marketing-text)]"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={17} aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0 space-y-6">
        {developerStatus !== "active" ? <RestrictedStatusNotice status={developerStatus} reason={restrictedReason} /> : null}
        {children}
      </div>
    </main>
  );
}

function RestrictedStatusNotice({ status, reason }: { status: Exclude<ApiDeveloperStatus, "active">; reason?: string | null }) {
  const copy =
    status === "suspended"
      ? {
          title: "ENHE API 能力已暂停",
          text: "你的开发者资料当前处于 suspended 状态。你仍可查看控制台、账单、文档和状态信息，但新的 API 运行时请求将被限制。"
        }
      : {
          title: "ENHE API 能力已关闭",
          text: "你的开发者资料当前处于 closed 状态。你仍可查看历史信息和配置文档，但 API 运行时能力不可用。"
        };

  return (
    <div className="rounded-2xl border border-red-300/25 bg-red-400/10 px-5 py-4 text-sm leading-6 text-red-100">
      <p className="font-black">{copy.title}</p>
      <p className="mt-1">{copy.text}</p>
      {reason ? <p className="mt-2 text-red-100/80">限制原因：{reason}</p> : null}
    </div>
  );
}
