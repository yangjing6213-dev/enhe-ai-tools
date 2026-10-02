import React from "react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/components/ui";
import { cn } from "@/lib/utils";

type ContentlessAction = {
  href: string;
  label: string;
};

export type ContentlessStateProps = {
  locale: "zh" | "en";
  eyebrow: string;
  title: string;
  intro: string;
  statusLabel: string;
  statusText: string;
  railStatusText?: string;
  primaryAction: ContentlessAction;
  secondaryActions?: ContentlessAction[];
  stateTitle?: string;
  className?: string;
  panelClassName?: string;
  dataStatusTarget?: "main" | "panel" | "both";
  children?: ReactNode;
};

export function ContentlessState({
  locale,
  eyebrow,
  title,
  intro,
  statusLabel,
  statusText,
  railStatusText,
  primaryAction,
  secondaryActions = [],
  stateTitle,
  className,
  panelClassName,
  dataStatusTarget = "main",
  children,
}: ContentlessStateProps) {
  const titleId = "contentless-state-title";
  const resolvedStateTitle = stateTitle ?? statusLabel;

  return (
    <main
      className={cn("enhe-contentless-page", className)}
      {...(dataStatusTarget === "main" || dataStatusTarget === "both"
        ? { "data-content-status": "UNVERIFIED" }
        : {})}
      data-locale={locale}
      data-shell-state="contentless"
    >
      <Container
        className={cn(
          "enhe-contentless-container",
          className?.includes("ai-news-workspace") && "ai-news-workspace-container",
        )}
      >
        <section className="enhe-contentless-hero" aria-labelledby={titleId}>
          <div className="enhe-contentless-hero-copy">
            <p className="enhe-contentless-eyebrow">{eyebrow}</p>
            <h1 id={titleId}>{title}</h1>
            <p className="enhe-contentless-intro">{intro}</p>
          </div>
          <div className="enhe-contentless-rail" aria-label={statusLabel}>
            <span className="enhe-contentless-status-label">{statusLabel}</span>
            <p>{railStatusText ?? statusText}</p>
          </div>
        </section>

        <div
          className={cn("glass enhe-contentless-state", panelClassName)}
          {...(dataStatusTarget === "panel" || dataStatusTarget === "both"
            ? { "data-content-status": "UNVERIFIED" }
            : {})}
        >
          <section
            className="enhe-contentless-state-copy"
            role="status"
            aria-live="polite"
            aria-labelledby={`${titleId}-panel`}
          >
            <span className="enhe-contentless-status-label">{statusLabel}</span>
            <h2 id={`${titleId}-panel`}>{resolvedStateTitle}</h2>
            <p>{statusText}</p>
            {children}
          </section>
          <nav className="enhe-contentless-actions" aria-label={locale === "en" ? "Next steps" : "下一步"}>
            <Link className="enhe-contentless-action enhe-contentless-action-primary" href={primaryAction.href}>
              {primaryAction.label}
            </Link>
            {secondaryActions.map((action) => (
              <Link className="enhe-contentless-action enhe-contentless-action-secondary" href={action.href} key={`${action.href}-${action.label}`}>
                {action.label}
              </Link>
            ))}
          </nav>
        </div>
      </Container>
    </main>
  );
}
