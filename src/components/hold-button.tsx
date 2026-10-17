"use client";

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from "react";

import "./hold-button.css";

export type HoldButtonSize = "sm" | "md" | "lg";
export type HoldButtonDirection = "right" | "up";
type Phase = "idle" | "holding" | "pending" | "done" | "error";
type Input = "pointer" | "key" | null;
type ManagedEvents = "children" | "onClick" | "onPointerDown" | "onPointerMove" | "onPointerUp"
  | "onPointerCancel" | "onLostPointerCapture" | "onPointerLeave" | "onKeyDown" | "onKeyUp"
  | "onBlur" | "onContextMenu";

export interface HoldButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, ManagedEvents> {
  children?: ReactNode;
  doneLabel?: ReactNode;
  pendingLabel?: ReactNode;
  errorLabel?: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  doneIcon?: ReactNode;
  backgroundColor?: string;
  fillColor?: string;
  textColor?: string;
  fillTextColor?: string;
  size?: HoldButtonSize;
  radius?: number;
  fillDirection?: HoldButtonDirection;
  holdTime?: number;
  releaseTime?: number;
  pressScale?: number;
  wave?: boolean;
  waveAmplitude?: number;
  glow?: boolean;
  resetAfter?: number;
  onHold: () => void | false | Promise<unknown>;
}

const LINEAR = (t: number) => t;
const EASE_OUT = (t: number) => 1 - Math.pow(1 - t, 3);

export const HoldButton = forwardRef<HTMLButtonElement, HoldButtonProps>(function HoldButton({
  children = "Hold to delete",
  doneLabel = "Deleted",
  pendingLabel = "Deleting…",
  errorLabel = "Try again",
  hint,
  icon = null,
  doneIcon = null,
  backgroundColor = "#27272a",
  fillColor = "#5227FF",
  textColor = "#f5f5f5",
  fillTextColor = "#ffffff",
  size = "md",
  radius = 14,
  fillDirection = "right",
  holdTime = 2000,
  releaseTime = 200,
  pressScale = 0.97,
  wave = true,
  waveAmplitude = 6,
  glow = true,
  resetAfter = 1200,
  disabled = false,
  onHold,
  type = "button",
  className = "",
  style,
  "aria-describedby": describedBy,
  ...buttonProps
}, forwardedRef) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [input, setInput] = useState<Input>(null);
  const phaseRef = useRef<Phase>("idle");
  const inputRef = useRef<Input>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const disabledRef = useRef(disabled);
  const onHoldRef = useRef(onHold);
  const mounted = useRef(true);
  const run = useRef(0);
  const unwatch = useRef<(() => void) | null>(null);
  const gesture = useRef({ pointerId: null as number | null, captured: false, key: null as string | null, start: 0, duration: 0, x: 0, y: 0 });
  const timers = useRef({ complete: 0, reset: 0 });
  const motion = useRef({ raf: 0, p: 0, from: 0, to: 0, start: 0 });
  const hintId = useId();
  disabledRef.current = disabled;
  onHoldRef.current = onHold;

  const setButtonRef = useCallback((node: HTMLButtonElement | null) => {
    buttonRef.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }, [forwardedRef]);

  function go(next: Phase, kind: Input = null) {
    phaseRef.current = next;
    inputRef.current = kind;
    if (!mounted.current) return;
    setPhase(next);
    setInput(kind);
  }

  function clearTimers() {
    clearTimeout(timers.current.complete);
    clearTimeout(timers.current.reset);
  }

  function setProgress(progress: number) {
    motion.current.p = progress;
    buttonRef.current?.style.setProperty("--hb-p", progress.toFixed(4));
  }

  function drive(to: number, duration: number, ease: (t: number) => number) {
    const state = motion.current;
    cancelAnimationFrame(state.raf);
    state.from = state.p;
    state.to = to;
    state.start = performance.now();
    const step = (now: number) => {
      if (!mounted.current) return;
      const t = duration > 0 ? Math.min(1, (now - state.start) / duration) : 1;
      setProgress(state.from + (state.to - state.from) * ease(t));
      if (t < 1) state.raf = requestAnimationFrame(step);
      else {
        state.raf = 0;
        if (to === 1) complete();
      }
    };
    state.raf = requestAnimationFrame(step);
  }

  function releaseGesture() {
    const pointerId = gesture.current.pointerId;
    gesture.current.pointerId = null;
    gesture.current.captured = false;
    gesture.current.key = null;
    unwatch.current?.();
    if (pointerId !== null) {
      try {
        if (buttonRef.current?.hasPointerCapture(pointerId)) buttonRef.current.releasePointerCapture(pointerId);
      } catch {
        // The browser may already have released a cancelled pointer.
      }
    }
  }

  function cancel() {
    if (phaseRef.current !== "holding") return;
    clearTimers();
    releaseGesture();
    go("idle");
    drive(0, releaseTime, EASE_OUT);
  }

  const cancelRef = useRef(cancel);
  cancelRef.current = cancel;

  function isInside(x: number, y: number) {
    const rect = buttonRef.current?.getBoundingClientRect();
    return !!rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }

  function finish(id: number, result: unknown, failed = false) {
    if (!mounted.current || id !== run.current || phaseRef.current !== "pending") return;
    if (failed || result === false) {
      go(failed ? "error" : "idle");
      drive(0, releaseTime, EASE_OUT);
      return;
    }
    go("done");
    if (resetAfter > 0) {
      timers.current.reset = window.setTimeout(() => {
        if (!mounted.current || id !== run.current) return;
        go("idle");
        drive(0, releaseTime, EASE_OUT);
      }, resetAfter);
    }
  }

  function complete() {
    if (phaseRef.current !== "holding") return;
    const button = buttonRef.current;
    if (disabledRef.current || !button?.isConnected || button.disabled || document.hidden
      || (inputRef.current === "pointer" && (!isInside(gesture.current.x, gesture.current.y)
        || (gesture.current.captured && gesture.current.pointerId !== null && !button.hasPointerCapture(gesture.current.pointerId))))) {
      cancel();
      return;
    }
    const remaining = gesture.current.duration - (performance.now() - gesture.current.start);
    if (remaining > 0) {
      clearTimeout(timers.current.complete);
      timers.current.complete = window.setTimeout(complete, Math.ceil(remaining));
      return;
    }
    clearTimers();
    cancelAnimationFrame(motion.current.raf);
    setProgress(1);
    const kind = inputRef.current;
    releaseGesture();
    go("pending", kind);
    const id = ++run.current;
    try {
      // Call the latest action: uploads may replace an item's callback during the hold.
      const result = onHoldRef.current();
      if (result && typeof result.then === "function") {
        Promise.resolve(result).then(value => finish(id, value), () => finish(id, undefined, true));
      } else finish(id, result);
    } catch {
      finish(id, undefined, true);
    }
  }

  function endPointer(event: { pointerId: number }) {
    if (gesture.current.pointerId !== event.pointerId) return;
    cancel();
  }

  function movePointer(event: { pointerId: number; clientX: number; clientY: number }) {
    if (gesture.current.pointerId !== event.pointerId) return;
    gesture.current.x = event.clientX;
    gesture.current.y = event.clientY;
    if (!isInside(event.clientX, event.clientY)) cancel();
  }

  function endKey(event: { key: string }) {
    if (inputRef.current === "key" && gesture.current.key === event.key) cancel();
  }

  function watchGesture() {
    unwatch.current?.();
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && phaseRef.current === "holding") {
        event.preventDefault();
        cancel();
      }
    };
    const onVisibility = () => { if (document.hidden) cancel(); };
    window.addEventListener("pointermove", movePointer);
    window.addEventListener("pointerup", endPointer);
    window.addEventListener("pointercancel", endPointer);
    window.addEventListener("keyup", endKey);
    window.addEventListener("keydown", onEscape);
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", onVisibility);
    unwatch.current = () => {
      window.removeEventListener("pointermove", movePointer);
      window.removeEventListener("pointerup", endPointer);
      window.removeEventListener("pointercancel", endPointer);
      window.removeEventListener("keyup", endKey);
      window.removeEventListener("keydown", onEscape);
      window.removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", onVisibility);
      unwatch.current = null;
    };
  }

  function begin(kind: Input) {
    if (disabledRef.current || (phaseRef.current !== "idle" && phaseRef.current !== "error")) return false;
    if (!buttonRef.current || document.hidden) return false;
    clearTimers();
    gesture.current.start = performance.now();
    gesture.current.duration = Math.max(0, holdTime);
    go("holding", kind);
    watchGesture();
    setProgress(0);
    drive(1, gesture.current.duration, LINEAR);
    timers.current.complete = window.setTimeout(complete, gesture.current.duration);
    return true;
  }

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || !event.isPrimary || gesture.current.pointerId !== null) return;
    if (!begin("pointer")) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    gesture.current.pointerId = event.pointerId;
    gesture.current.x = event.clientX;
    gesture.current.y = event.clientY;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
      gesture.current.captured = event.currentTarget.hasPointerCapture(event.pointerId);
    } catch {
      // Window listeners still cancel releases outside the button.
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    } else if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      if (!event.repeat && begin("key")) gesture.current.key = event.key;
    }
  }

  useLayoutEffect(() => {
    const button = buttonRef.current;
    if (!button) return;
    const measure = () => {
      button.style.setProperty("--hb-w", `${button.offsetWidth}px`);
      button.style.setProperty("--hb-h", `${button.offsetHeight}px`);
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(button);
    window.addEventListener("resize", measure);
    return () => { observer?.disconnect(); window.removeEventListener("resize", measure); };
  }, []);

  useEffect(() => { if (disabled) cancelRef.current(); }, [disabled]);

  useEffect(() => {
    mounted.current = true;
    const timerState = timers.current;
    const motionState = motion.current;
    const gestureState = gesture.current;
    const button = buttonRef.current;
    return () => {
      mounted.current = false;
      phaseRef.current = "idle";
      clearTimeout(timerState.complete);
      clearTimeout(timerState.reset);
      cancelAnimationFrame(motionState.raf);
      unwatch.current?.();
      if (gestureState.pointerId !== null) {
        try { button?.releasePointerCapture(gestureState.pointerId); } catch { /* Already released. */ }
      }
      gestureState.pointerId = null;
      gestureState.captured = false;
      gestureState.key = null;
    };
  }, []);

  const locked = disabled || phase === "pending" || phase === "done";
  const labels = <>
    <span className="hold-button__idle" aria-hidden={phase === "pending" || phase === "done" || phase === "error"}>
      {icon ? <span className="hold-button__icon">{icon}</span> : null}{children}
    </span>
    <span className="hold-button__pending" aria-hidden={phase !== "pending"}>{pendingLabel}</span>
    <span className="hold-button__done" aria-hidden={phase !== "done"}>
      {doneIcon ? <span className="hold-button__icon">{doneIcon}</span> : null}{doneLabel}
    </span>
    <span className="hold-button__error" aria-hidden={phase !== "error"}>{errorLabel}</span>
  </>;
  const cssVars = {
    "--hb-radius": `${radius}px`, "--hb-bg": backgroundColor, "--hb-fill": fillColor,
    "--hb-text": textColor, "--hb-fill-text": fillTextColor, "--hb-hold": `${holdTime}ms`,
    "--hb-cycles": holdTime / 1100, "--hb-release": `${releaseTime}ms`, "--hb-press": pressScale,
    "--hb-wave": `${wave ? waveAmplitude : 0}px`, ...style,
  } as CSSProperties;

  return <button
    {...buttonProps}
    ref={setButtonRef}
    type={type}
    disabled={locked}
    className={`hold-button hold-button--${size}${className ? ` ${className}` : ""}`}
    data-phase={phase}
    data-input={input ?? undefined}
    data-direction={fillDirection === "up" ? "up" : "right"}
    data-glow={glow ? "true" : undefined}
    aria-label={buttonProps["aria-label"] ?? (typeof children === "string" ? children : undefined)}
    aria-busy={phase === "pending" || undefined}
    aria-describedby={[describedBy, hintId].filter(Boolean).join(" ")}
    style={cssVars}
    onClick={event => event.preventDefault()}
    onPointerDown={handlePointerDown}
    onPointerMove={movePointer}
    onPointerUp={endPointer}
    onPointerCancel={endPointer}
    onLostPointerCapture={endPointer}
    onPointerLeave={endPointer}
    onKeyDown={handleKeyDown}
    onKeyUp={event => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); endKey(event); } }}
    onBlur={cancel}
    onContextMenu={event => event.preventDefault()}
  >
    <span className="hold-button__pulse" aria-hidden="true" />
    <span className="hold-button__label">{labels}</span>
    <span className="hold-button__clip" aria-hidden="true">
      <span className="hold-button__fill"><span className="hold-button__label hold-button__label--fill">{labels}</span></span>
      <span className="hold-button__crest" aria-hidden="true"><span className="hold-button__label hold-button__label--fill">{labels}</span></span>
    </span>
    <span id={hintId} className="hold-button__sr">{hint ?? `Press and hold for ${Math.round(holdTime / 100) / 10} seconds to confirm`}</span>
    <span className="hold-button__sr" role="status" aria-live="polite">
      {phase === "pending" ? pendingLabel : phase === "done" ? doneLabel : phase === "error" ? errorLabel : ""}
    </span>
  </button>;
});

export default HoldButton;
