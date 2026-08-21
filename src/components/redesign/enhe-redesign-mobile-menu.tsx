"use client";

import { animate } from "motion/react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  resolveMobileNavMotion,
  type MobileNavInputModality,
  type MobileNavMotionPhase,
  type MobileNavMotionProfile,
} from "@/lib/motion/mobile-nav-motion";
import type { RedesignAccount, RedesignNavItem } from "./types";

const MOBILE_NAV_QUERY = "(width < 768px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const FOCUSABLE_MENU_CONTROLS =
  "a[href], button:not([disabled]), summary, [tabindex]:not([tabindex='-1'])";
function getClickModality(
  event: ReactMouseEvent<HTMLElement>,
): MobileNavInputModality {
  return event.detail === 0 ? "keyboard" : "pointer";
}

export function EnheRedesignMobileMenu({
  menuId,
  triggerLabel,
  closeLabel,
  navItems,
  account,
}: {
  menuId: string;
  triggerLabel: string;
  closeLabel: string;
  navItems: ReadonlyArray<RedesignNavItem>;
  account: RedesignAccount;
}) {
  const [open, setOpen] = useState(false);
  const [layerRendered, setLayerRendered] = useState(false);
  const [inputModality, setInputModality] =
    useState<MobileNavInputModality>("pointer");
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const openRef = useRef(false);
  const desktopFocusTargetRef = useRef<HTMLElement | null>(null);
  const focusReturnFrameRef = useRef<number | null>(null);
  const layerNeedsInitializationRef = useRef(false);
  const animationIntentRef = useRef(0);
  const activeAnimationsRef = useRef<Array<{ cancel(): void }>>([]);
  const motionProfile: MobileNavMotionProfile = prefersReducedMotion
    ? "reduced"
    : inputModality;
  const motionPhase: MobileNavMotionPhase = open ? "open" : "close";
  const motionContract = resolveMobileNavMotion(motionProfile, motionPhase);

  const stopActiveAnimations = useCallback(() => {
    for (const control of activeAnimationsRef.current) {
      control.cancel();
    }
    activeAnimationsRef.current = [];
  }, []);

  const freezeActiveAnimations = useCallback(() => {
    if (activeAnimationsRef.current.length === 0) return;
    const panel = panelRef.current;
    const overlay = overlayRef.current;
    const panelStyle = panel ? getComputedStyle(panel) : null;
    const panelOpacity = panelStyle?.opacity ?? null;
    const panelTransform = panelStyle?.transform ?? null;
    const overlayOpacity = overlay ? getComputedStyle(overlay).opacity : null;
    stopActiveAnimations();
    if (panel && panelOpacity !== null && panelTransform !== null) {
      panel.style.opacity = panelOpacity;
      panel.style.transform = panelTransform;
    }
    if (overlay && overlayOpacity !== null) {
      overlay.style.opacity = overlayOpacity;
    }
  }, [stopActiveAnimations]);

  const close = useCallback(
    (modality: MobileNavInputModality) => {
      if (!openRef.current) return;
      openRef.current = false;
      freezeActiveAnimations();
      setInputModality(modality);
      setOpen(false);
    },
    [freezeActiveAnimations],
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    const updateReducedMotion = () =>
      setPrefersReducedMotion(mediaQuery.matches);

    updateReducedMotion();
    mediaQuery.addEventListener("change", updateReducedMotion);

    return () =>
      mediaQuery.removeEventListener("change", updateReducedMotion);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_NAV_QUERY);
    const closeOnDesktop = () => {
      if (mediaQuery.matches || !openRef.current) return;

      desktopFocusTargetRef.current = document.querySelector<HTMLElement>(
        ".redesign-desktop-nav a[href]",
      );
      close("keyboard");
      setLayerRendered(false);
    };

    closeOnDesktop();
    mediaQuery.addEventListener("change", closeOnDesktop);

    return () => mediaQuery.removeEventListener("change", closeOnDesktop);
  }, [close]);

  useEffect(() => stopActiveAnimations, [stopActiveAnimations]);

  useLayoutEffect(() => {
    const activeIntent = ++animationIntentRef.current;
    const mountedPanel = panelRef.current;
    const mountedOverlay = overlayRef.current;
    const hasActiveAnimations = activeAnimationsRef.current.length > 0;
    const frozenPanelStyle =
      hasActiveAnimations && mountedPanel
        ? {
            opacity: getComputedStyle(mountedPanel).opacity,
            transform: getComputedStyle(mountedPanel).transform,
          }
        : null;
    const frozenOverlayOpacity =
      hasActiveAnimations && mountedOverlay
        ? getComputedStyle(mountedOverlay).opacity
        : null;
    stopActiveAnimations();
    if (frozenPanelStyle && mountedPanel) {
      mountedPanel.style.opacity = frozenPanelStyle.opacity;
      mountedPanel.style.transform = frozenPanelStyle.transform;
    }
    if (frozenOverlayOpacity !== null && mountedOverlay) {
      mountedOverlay.style.opacity = frozenOverlayOpacity;
    }

    if (!layerRendered) return;
    const overlay = overlayRef.current;
    const panel = panelRef.current;
    if (!overlay || !panel) return;

    const motion = resolveMobileNavMotion(motionProfile, motionPhase);
    if (layerNeedsInitializationRef.current) {
      panel.style.transform =
        motionProfile === "pointer"
          ? (motion.drawer.transform?.[0] ?? "translateX(0)")
          : "translateX(0)";
      panel.style.opacity =
        motionProfile === "pointer"
          ? "1"
          : String(motion.drawer.opacity?.[0] ?? 0);
      overlay.style.opacity = String(motion.overlay.opacity?.[0] ?? 0);
      layerNeedsInitializationRef.current = false;
    }

    const controls: Array<ReturnType<typeof animate>> = [];
    const completions: Array<Promise<void>> = [];
    const track = (control: ReturnType<typeof animate>) => {
      controls.push(control);
      return Promise.resolve(control).then(() => undefined);
    };
    const drawerOptions = {
      duration: motion.drawer.durationMs / 1000,
      ease: motion.drawer.ease,
    };
    const currentPanelStyle = getComputedStyle(panel);
    const currentPanelTransform = currentPanelStyle.transform;
    const currentPanelOpacity = Number.parseFloat(currentPanelStyle.opacity);
    const currentOverlayOpacity = Number.parseFloat(
      getComputedStyle(overlay).opacity,
    );

    if (motionProfile === "pointer") {
      completions.push(
        track(
          animate(
            panel,
            {
              transform: [
                currentPanelTransform,
                motion.drawer.transform?.[1] ?? "translateX(0)",
              ],
            },
            drawerOptions,
          ),
        ),
      );

      if (open && currentPanelOpacity < 0.999) {
        completions.push(
          track(
            animate(
              panel,
              { opacity: [currentPanelOpacity, 1] },
              { duration: 0.1, ease: "linear" },
            ),
          ),
        );
      }
    } else {
      const needsTransformNormalization =
        open &&
        Math.abs(panel.getBoundingClientRect().right - window.innerWidth) > 1;

      if (needsTransformNormalization) {
        const phaseDuration = motion.drawer.durationMs / 2000;
        const fadeOut = animate(
          panel,
          { opacity: [currentPanelOpacity, 0] },
          { duration: phaseDuration, ease: "linear" },
        );
        controls.push(fadeOut);
        completions.push(
          Promise.resolve(fadeOut).then(() => {
            if (
              animationIntentRef.current !== activeIntent ||
              !openRef.current
            ) {
              return;
            }
            panel.style.opacity = "0";
            panel.style.transform = "translateX(0)";
            const fadeIn = animate(
              panel,
              { opacity: [0, 1] },
              { duration: phaseDuration, ease: "linear" },
            );
            controls.push(fadeIn);
            activeAnimationsRef.current = controls;
            return Promise.resolve(fadeIn).then(() => undefined);
          }),
        );
      } else {
        completions.push(
          track(
            animate(
              panel,
              {
                opacity: [
                  currentPanelOpacity,
                  motion.drawer.opacity?.[1] ?? (open ? 1 : 0),
                ],
              },
              drawerOptions,
            ),
          ),
        );
      }
    }

    completions.push(
      track(
        animate(
          overlay,
          {
            opacity: [
              currentOverlayOpacity,
              motion.overlay.opacity?.[1] ?? (open ? 1 : 0),
            ],
          },
          {
            duration: motion.overlay.durationMs / 1000,
            ease: motion.overlay.ease,
          },
        ),
      ),
    );
    activeAnimationsRef.current = controls;

    void Promise.all(completions).then(
      () => {
        if (animationIntentRef.current !== activeIntent) return;
        panel.style.opacity = String(
          motion.drawer.opacity?.[1] ?? (open ? 1 : 0),
        );
        if (motion.drawer.transform?.[1]) {
          panel.style.transform = motion.drawer.transform[1];
        }
        overlay.style.opacity = String(
          motion.overlay.opacity?.[1] ?? (open ? 1 : 0),
        );
        activeAnimationsRef.current = [];
        if (motionPhase === "close" && !openRef.current) {
          setLayerRendered(false);
        }
      },
      () => undefined,
    );
  }, [
    layerRendered,
    motionPhase,
    motionProfile,
    open,
    stopActiveAnimations,
  ]);

  useEffect(() => {
    if (!open) return;

    const mountedTrigger = triggerRef.current;
    if (focusReturnFrameRef.current !== null) {
      cancelAnimationFrame(focusReturnFrameRef.current);
      focusReturnFrameRef.current = null;
    }
    const firstFocusable = panelRef.current?.querySelector<HTMLElement>(
      FOCUSABLE_MENU_CONTROLS,
    );
    firstFocusable?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close("keyboard");
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          FOCUSABLE_MENU_CONTROLS,
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      const returnTarget =
        desktopFocusTargetRef.current ?? mountedTrigger;
      desktopFocusTargetRef.current = null;
      focusReturnFrameRef.current = requestAnimationFrame(() => {
        focusReturnFrameRef.current = null;
        if (!openRef.current) returnTarget?.focus();
      });
    };
  }, [close, open]);

  useEffect(
    () => () => {
      if (focusReturnFrameRef.current !== null) {
        cancelAnimationFrame(focusReturnFrameRef.current);
      }
    },
    [],
  );

  const openMenu = (modality: MobileNavInputModality) => {
    freezeActiveAnimations();
    desktopFocusTargetRef.current = null;
    if (!layerRendered) layerNeedsInitializationRef.current = true;
    setInputModality(modality);
    setLayerRendered(true);
    openRef.current = true;
    setOpen(true);
  };

  return (
    <div className="redesign-mobile-menu-root">
      <button
        ref={triggerRef}
        type="button"
        className="redesign-menu-trigger"
        aria-label={triggerLabel}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={(event) => {
          const modality = getClickModality(event);
          if (open) {
            close(modality);
          } else {
            openMenu(modality);
          }
        }}
      >
        <span className="redesign-menu-bars" aria-hidden="true" />
      </button>
      {layerRendered ? (
        <>
          <button
            ref={overlayRef}
            type="button"
            className="redesign-menu-overlay"
            aria-hidden="true"
            tabIndex={-1}
            data-motion-duration-ms={motionContract.overlay.durationMs}
            data-motion-modality={motionProfile}
            data-motion-phase={motionPhase}
            onClick={(event) => close(getClickModality(event))}
          />
          <aside
            ref={panelRef}
            id={menuId}
            className="redesign-mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-hidden={open ? undefined : true}
            aria-label={triggerLabel}
            inert={!open}
            data-motion-variant="directional-drawer"
            data-motion-duration-ms={motionContract.drawer.durationMs}
            data-motion-modality={motionProfile}
            data-motion-phase={motionPhase}
            data-motion-properties={
              motionProfile === "pointer" ? "transform" : "opacity"
            }
          >
            <button
              type="button"
              className="redesign-drawer-close"
              aria-label={closeLabel}
              onClick={(event) => close(getClickModality(event))}
            >
              <span aria-hidden="true">×</span>
            </button>
            <nav className="redesign-mobile-nav" aria-label={triggerLabel}>
              {navItems.map((item) =>
                item.children?.length ? (
                  <details key={item.href} className="redesign-mobile-nav-dropdown">
                    <summary>
                      <span>{item.label}</span>
                    </summary>
                    <div>
                      {item.children.map((child) => (
                        <a
                          key={child.href}
                          href={child.href}
                          onClick={(event) => close(getClickModality(event))}
                        >
                          {child.label}
                        </a>
                      ))}
                    </div>
                  </details>
                ) : (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={(event) => close(getClickModality(event))}
                  >
                    {item.kind === "search" ? (
                      <span className="redesign-search-icon" aria-hidden="true" />
                    ) : null}
                    <span>{item.label}</span>
                  </a>
                ),
              )}
            </nav>
            <div className="redesign-mobile-account">
              {account.status === "guest" ? (
                <a
                  href={account.loginHref}
                  onClick={(event) => close(getClickModality(event))}
                >
                  {account.loginLabel}
                </a>
              ) : (
                <>
                  <span className="redesign-mobile-account-label">{account.displayName}</span>
                  <a
                    href={account.userHref}
                    onClick={(event) => close(getClickModality(event))}
                  >
                    {account.userLabel}
                  </a>
                  {account.isAdmin ? (
                    <a
                      href={account.adminHref}
                      onClick={(event) => close(getClickModality(event))}
                    >
                      {account.adminLabel}
                    </a>
                  ) : null}
                </>
              )}
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}
