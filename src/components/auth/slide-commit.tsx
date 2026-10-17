"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight02Icon, Tick02Icon } from "@hugeicons/core-free-icons";

import "./slide-commit.css";

export type SlideCommitPhase = "idle" | "pending" | "done" | "error";

export interface SlideCommitProps {
  label?: ReactNode;
  pendingLabel?: ReactNode;
  doneLabel?: ReactNode;
  errorLabel?: ReactNode;
  ariaLabel?: string;
  onConfirm?: () => void | false | Promise<unknown>;
  onDone?: () => void;
  onError?: (reason: unknown) => void;
  confirmationMode?: "async" | "form";
  pending?: boolean;
  error?: boolean;
  initialPhase?: SlideCommitPhase;
  trackColor?: string;
  handleColor?: string;
  successColor?: string;
  dangerColor?: string;
  width?: number | string;
  height?: number;
  radius?: number;
  speed?: number;
  returnBounce?: number;
  landingDip?: number;
  holdMs?: number;
  disabled?: boolean;
  icon?: ReactNode;
  className?: string;
}

type Sample = [number, number];
type Grip = { id: number; grab: number; moved: boolean; hist: Sample[] };
type MoveEvent = { pointerId: number; clientX: number; timeStamp: number };
type UpEvent = { pointerId: number };

const PAD = 4;
const SQUASH_MAX = 0.08;
const SQUASH_DIV = 110;
const SWELL = 1.03;
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];
const SHAKE = [0, -5, 5, -3, 3, -1, 0];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const onColor = (hex: string) => {
  const raw = hex.replace("#", "");
  const full = raw.length === 3 ? [...raw].map((ch) => ch + ch).join("") : raw.slice(0, 6);
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return "#ffffff";
  const yiq = (((n >> 16) & 255) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000;
  return yiq >= 128 ? "#111111" : "#ffffff";
};
const velocityOf = (hist: Sample[]) => {
  if (hist.length < 2) return 0;
  const [t0, x0] = hist[0];
  const [t1, x1] = hist[hist.length - 1];
  return ((x1 - x0) / Math.max(1, t1 - t0)) * 1000;
};
const finePointer = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;

const Spinner = ({ size }: { size: number }) => (
  <svg className="slide-commit__spinner" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeOpacity="0.25" />
    <path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

const SlideCommit: React.FC<SlideCommitProps> = ({
  label = "滑动确认",
  pendingLabel = "处理中",
  doneLabel = "已完成",
  errorLabel = "请重试",
  ariaLabel,
  onConfirm,
  onDone,
  onError,
  confirmationMode = "async",
  pending = false,
  error = false,
  initialPhase = "idle",
  trackColor = "#262626",
  handleColor = "#f5f5f5",
  successColor = "#22c55e",
  dangerColor = "#e5484d",
  width = "100%",
  height = 56,
  radius = 28,
  speed = 50,
  returnBounce = 0.38,
  landingDip = 0.026,
  holdMs = 1500,
  disabled = false,
  icon,
  className = "",
}) => {
  const reduce = useReducedMotion();
  const [localPhase, setLocalPhase] = useState<SlideCommitPhase>(error ? "error" : initialPhase);
  const [held, setHeld] = useState(false);
  const [hot, setHot] = useState(false);
  const [measuredWidth, setMeasuredWidth] = useState(typeof width === "number" ? width : 280);
  const phase = pending ? "pending" : localPhase;

  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const capsuleRef = useRef<HTMLDivElement>(null);
  const grip = useRef<Grip | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const run = useRef(0);
  const mounted = useRef(true);
  const phaseRef = useRef(phase);
  const disabledRef = useRef(disabled || pending);
  const previousPending = useRef(pending);
  const unwatch = useRef<(() => void) | null>(null);
  const live = useRef<{
    move: (event: MoveEvent) => void;
    up: (event: UpEvent) => void;
    cancel: (event?: UpEvent) => void;
    sync: () => void;
  }>({ move: () => {}, up: () => {}, cancel: () => {}, sync: () => {} });
  const lastPercent = useRef(0);
  phaseRef.current = phase;
  disabledRef.current = disabled || pending;

  const GRIP = height - PAD * 2;
  const INNER = Math.max(GRIP, measuredWidth - PAD * 2);
  const TRAVEL = Math.max(1, INNER - GRIP);
  const r = clamp(radius, 0, height / 2);
  const gripR = Math.max(0, r - PAD);
  const k = 260 + (clamp(speed, 0, 100) / 100) * 640;
  const mass = 0.9;
  const critical = 2 * Math.sqrt(k * mass);
  const commitSpring = { type: "spring" as const, stiffness: k, damping: critical, mass };
  const homeSpring = { ...commitSpring, damping: critical * (1 - clamp(returnBounce, 0, 0.5)) };

  const x = useMotionValue(initialPhase === "pending" || pending ? TRAVEL : 0);
  const anchor = useMotionValue(initialPhase === "done" ? TRAVEL : 0);
  const shown = useMotionValue(initialPhase === "done" || initialPhase === "pending" || pending ? 0 : 1);
  const spin = useMotionValue(initialPhase === "pending" || pending ? 1 : 0);
  const pulse = useMotionValue(1);
  const shake = useMotionValue(0);
  const seen = useTransform(x, (v) => clamp(v, 0, TRAVEL));
  const edge = useTransform([seen, anchor], ([v, a]: number[]) => v + GRIP + clamp(a - v, 0, TRAVEL));
  const clip = useTransform(edge, (right) => `inset(0 ${Math.max(0, INNER - right)}px 0 0 round ${gripR}px)`);
  const content = useTransform([seen, edge], ([v, right]: number[]) => `translateX(${(v + right) / 2 - INNER / 2}px)`);
  const swell = hot && !held && (phase === "idle" || phase === "error") && !reduce && !disabled ? SWELL : 1;
  const shape = useTransform(x, (v) => {
    const q = 1 - Math.min(SQUASH_MAX, Math.max(0, -v) / SQUASH_DIV);
    return `scale(${q * swell}, ${swell / q})`;
  });
  const origin = useTransform(seen, (v) => `${v}px 50%`);
  const say = useTransform(seen, [0, TRAVEL * 0.55], [1, 0]);
  const arrow = useTransform(
    [seen, shown],
    ([v, on]: number[]) => on * clamp(1 - (v - TRAVEL * 0.55) / (TRAVEL * 0.4), 0, 1),
  );
  const trackTransform = useTransform([shake, pulse], ([s, p]: number[]) => `translateX(${s}px) scale(${p})`);

  const labelText = ariaLabel ?? (typeof label === "string" ? label : "滑动确认");
  useMotionValueEvent(seen, "change", (v) => {
    const percent = Math.round((v / TRAVEL) * 100);
    if (percent === lastPercent.current || !capsuleRef.current) return;
    lastPercent.current = percent;
    capsuleRef.current.setAttribute("aria-valuenow", String(percent));
    capsuleRef.current.setAttribute("aria-valuetext", `${labelText}，${percent}%`);
  });

  const changePhase = useCallback((next: SlideCommitPhase) => {
    phaseRef.current = next;
    if (mounted.current) setLocalPhase(next);
  }, []);
  const clearTimers = useCallback(() => {
    clearTimeout(timer.current);
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => setMeasuredWidth(root.getBoundingClientRect().width);
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(root);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [width]);

  useLayoutEffect(() => {
    x.set(phaseRef.current === "pending" ? TRAVEL : clamp(x.get(), 0, TRAVEL));
    if (phaseRef.current === "done") anchor.set(TRAVEL);
  }, [TRAVEL, x, anchor]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimers();
      unwatch.current?.();
      grip.current = null;
      run.current += 1;
      [x, anchor, shown, spin, pulse, shake].forEach((value) => value.stop());
    };
  }, [clearTimers, x, anchor, shown, spin, pulse, shake]);

  useEffect(() => live.current.sync(), [pending, error, disabled]);

  const local = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return (clientX - rect.left) / (rect.width / measuredWidth || 1);
  };

  const goHome = (velocity: number) => {
    x.stop();
    if (reduce) x.set(0);
    else animate(x, 0, { ...homeSpring, velocity: Math.min(0, velocity) });
  };

  const releaseGrip = () => {
    const current = grip.current;
    grip.current = null;
    unwatch.current?.();
    if (current) {
      try {
        trackRef.current?.releasePointerCapture(current.id);
      } catch {
        // A cancelled pointer may already have lost its capture.
      }
    }
    if (mounted.current) setHeld(false);
    return current;
  };

  const cancel = (event?: UpEvent) => {
    if (event && grip.current?.id !== event.pointerId) return;
    releaseGrip();
    goHome(0);
  };

  const settle = () => {
    clearTimers();
    changePhase("idle");
    spin.set(0);
    if (reduce) {
      shown.set(1);
      anchor.set(0);
    } else {
      animate(shown, 1, { duration: 0.2, delay: 0.12 });
      animate(anchor, 0, { type: "spring", duration: 0.3, bounce: 0 });
    }
    goHome(0);
  };

  const resolve = (viaKey: boolean) => {
    changePhase("done");
    anchor.set(x.get());
    spin.set(0);
    if (reduce) x.set(0);
    else {
      animate(x, 0, commitSpring);
      if (!viaKey && landingDip > 0) {
        animate(pulse, [1, 1 - landingDip, 1], { duration: 0.46, times: [0, 0.62, 1], ease: EASE_OUT, delay: 0.1 });
      }
    }
    if (holdMs > 0) timer.current = setTimeout(settle, holdMs);
    onDone?.();
  };

  const reject = (reason: unknown, notify = true) => {
    clearTimers();
    changePhase("error");
    spin.set(0);
    anchor.set(0);
    if (reduce) {
      shown.set(1);
      shake.set(0);
      goHome(0);
    } else {
      animate(shown, 1, { duration: 0.2, delay: 0.12 });
      animate(shake, SHAKE, { duration: 0.45, ease: EASE_OUT });
      goHome(0);
    }
    if (holdMs > 0) timer.current = setTimeout(() => changePhase("idle"), holdMs);
    if (notify) onError?.(reason);
  };

  const canConfirm = () => !disabledRef.current && (phaseRef.current === "idle" || phaseRef.current === "error");

  const commit = (viaKey: boolean) => {
    if (!canConfirm()) return;
    clearTimers();
    const id = ++run.current;
    // Lock before calling the form: a second pointer/key event may arrive before React renders.
    changePhase("pending");
    [x, anchor, shown, spin, pulse, shake].forEach((value) => value.stop());
    x.set(TRAVEL);
    anchor.set(0);
    shown.set(0);
    spin.set(1);
    pulse.set(1);
    shake.set(0);
    let out: void | false | Promise<unknown>;
    try {
      out = onConfirm?.();
    } catch (reason) {
      reject(reason);
      return;
    }
    if (out === false) {
      settle();
      return;
    }
    if (out && typeof out.then === "function") {
      out.then(
        (result) => {
          if (!mounted.current || id !== run.current) return;
          if (result === false) settle();
          else if (confirmationMode === "async") resolve(viaKey);
        },
        (reason) => {
          if (mounted.current && id === run.current) reject(reason);
        },
      );
    } else if (confirmationMode === "async") resolve(viaKey);
    // requestSubmit() returns void. Form mode waits for the real form state or navigation.
  };

  const down = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!canConfirm() || grip.current || event.button !== 0 || !event.isPrimary) return;
    event.preventDefault();
    clearTimers();
    x.stop();
    const start = clamp(x.get(), 0, TRAVEL);
    x.set(start);
    grip.current = {
      id: event.pointerId,
      grab: local(event.clientX) - start,
      moved: false,
      hist: [[event.timeStamp, start]],
    };
    setHeld(true);
    capsuleRef.current?.focus({ preventScroll: true });
    try {
      trackRef.current?.setPointerCapture(event.pointerId);
    } catch {
      // Window listeners also cover browsers without pointer capture.
    }
    unwatch.current?.();
    const onMove = (e: PointerEvent) => live.current.move(e);
    const onUp = (e: PointerEvent) => live.current.up(e);
    const onCancel = (e: PointerEvent) => live.current.cancel(e);
    const onBlur = () => live.current.cancel();
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("blur", onBlur);
    unwatch.current = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("blur", onBlur);
      unwatch.current = null;
    };
  };

  const move = (event: MoveEvent) => {
    const current = grip.current;
    if (!current || current.id !== event.pointerId) return;
    if (!canConfirm()) {
      cancel(event);
      return;
    }
    const next = clamp(local(event.clientX) - current.grab, 0, TRAVEL);
    if (Math.abs(next - x.get()) > 0.5) current.moved = true;
    current.hist.push([event.timeStamp, next]);
    if (current.hist.length > 4) current.hist.shift();
    x.set(next);
  };

  const up = (event: UpEvent) => {
    if (grip.current?.id !== event.pointerId) return;
    const current = releaseGrip();
    if (!current) return;
    if (current.moved && x.get() >= TRAVEL - 0.5 && canConfirm()) commit(false);
    else goHome(velocityOf(current.hist));
  };

  live.current = {
    move,
    up,
    cancel,
    sync: () => {
      const wasPending = previousPending.current;
      previousPending.current = pending;
      if (disabled || pending) releaseGrip();
      if (pending) {
        clearTimers();
        changePhase("pending");
        x.set(TRAVEL);
        shown.set(0);
        spin.set(1);
      } else if (wasPending) {
        run.current += 1;
        reject(undefined, false);
      } else if (error) {
        run.current += 1;
        reject(undefined, false);
      } else if (disabled && phaseRef.current !== "pending" && phaseRef.current !== "done") goHome(0);
    },
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (grip.current) cancel();
      else if (canConfirm()) goHome(0);
      return;
    }
    if (!canConfirm()) return;
    const step = TRAVEL / 10;
    if (event.key === "End" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      releaseGrip();
      commit(true);
    } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      x.stop();
      const next = Math.min(TRAVEL, x.get() + step);
      x.set(next);
      if (next >= TRAVEL - 0.5) {
        releaseGrip();
        commit(true);
      }
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown" || event.key === "Home") {
      event.preventDefault();
      x.stop();
      x.set(event.key === "Home" ? 0 : Math.max(0, x.get() - step));
    }
  };

  const fontSize = clamp(Math.round(height * 0.25), 13, 17);
  const iconSize = Math.round(GRIP * 0.42);
  const done = phase === "done";
  const busy = phase === "pending";

  return (
    <div
      ref={rootRef}
      className={`slide-commit${className ? ` ${className}` : ""}`}
      data-phase={phase}
      data-held={held ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      style={
        {
          width,
          height,
          minWidth: height,
          maxWidth: "100%",
          "--sc-track": trackColor,
          "--sc-ink": handleColor,
          "--sc-ok": successColor,
          "--sc-no": dangerColor,
          "--sc-on-ink": onColor(handleColor),
          "--sc-on-ok": onColor(successColor),
          "--sc-on-no": onColor(dangerColor),
          "--sc-radius": `${r}px`,
          "--sc-grip-r": `${gripR}px`,
          "--sc-pad": `${PAD}px`,
          "--sc-font": `${fontSize}px`,
          "--sc-height": `${height}px`,
        } as CSSProperties
      }
    >
      <motion.div
        ref={trackRef}
        className="slide-commit__track"
        style={{ transform: trackTransform }}
        onPointerDown={down}
      >
        <motion.span className="slide-commit__label" style={{ opacity: say }} aria-hidden="true">
          <span className="slide-commit__text slide-commit__text--plain">{label}</span>
          <span className="slide-commit__text slide-commit__text--error">{errorLabel}</span>
        </motion.span>
        <motion.div
          ref={capsuleRef}
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label={labelText}
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={busy || done ? 100 : 0}
          aria-valuetext={busy ? (typeof pendingLabel === "string" ? pendingLabel : "处理中") : `${labelText}，0%`}
          aria-busy={busy || undefined}
          aria-disabled={disabled || busy || done || undefined}
          className="slide-commit__capsule"
          style={{ clipPath: clip, transform: shape, transformOrigin: origin }}
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse" && finePointer()) setHot(true);
          }}
          onPointerLeave={() => setHot(false)}
          onKeyDown={onKeyDown}
        >
          <motion.div className="slide-commit__content" style={{ transform: busy || done ? "translateX(0px)" : content }}>
            <motion.span className="slide-commit__arrow" style={{ opacity: arrow }} aria-hidden="true">
              {icon ?? <HugeiconsIcon icon={ArrowRight02Icon} size={iconSize} strokeWidth={2} />}
            </motion.span>
            <motion.span className="slide-commit__spin" style={{ opacity: spin }} aria-hidden="true">
              <Spinner size={iconSize} />
              {pendingLabel}
            </motion.span>
            <motion.span
              className="slide-commit__done"
              aria-hidden="true"
              initial={false}
              animate={{ opacity: done ? 1 : 0, scale: done || reduce ? 1 : 0.95 }}
              transition={{ duration: reduce ? 0 : 0.2, ease: EASE_OUT }}
            >
              <HugeiconsIcon icon={Tick02Icon} size={Math.round(GRIP * 0.38)} strokeWidth={2.5} />
              {doneLabel}
            </motion.span>
          </motion.div>
        </motion.div>
        <span className="slide-commit__sr" aria-live="polite">
          {busy ? pendingLabel : done ? doneLabel : phase === "error" ? errorLabel : ""}
        </span>
      </motion.div>
    </div>
  );
};

export default SlideCommit;
