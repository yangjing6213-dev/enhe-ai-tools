'use client';

// React Bits FolderFloat, licensed MIT + Commons Clause; adapted for ENHE input and motion settings.

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent
} from 'react';
import Matter from 'matter-js';
import './FolderFloat.css';

const { Bodies, Body, Composite, Engine } = Matter;

export type FolderFloatItem = string | { label: string; value?: string; href?: string };
export type FolderFloatTrigger = 'hover' | 'click';

export interface FolderFloatProps {
  items?: FolderFloatItem[];
  label?: string;
  sublabel?: string;
  trigger?: FolderFloatTrigger;
  defaultOpen?: boolean;
  closeOnSelect?: boolean;
  physics?: boolean;
  constrainItemsToParent?: boolean;
  drift?: number;
  onSelect?: (value: string, index: number) => void;
  onOpenChange?: (open: boolean) => void;
  folderColor?: string;
  frontColor?: string;
  paperColor?: string;
  itemColor?: string;
  itemTextColor?: string;
  labelColor?: string;
  width?: number;
  height?: number;
  radius?: number;
  spread?: number;
  lift?: number;
  tilt?: number;
  flapAngle?: number;
  restAngle?: number;
  openDuration?: number;
  stagger?: number;
  bounce?: number;
  className?: string;
}

type Entry = { label: string; value: string; href?: string };
type Size = { w: number; h: number };
type Zone = { left: number; right: number; top: number; bottom: number };
type Drag = { i: number; id: number; dx: number; dy: number; sx: number; sy: number; moved: boolean };
interface World {
  engine: Matter.Engine | null;
  bodies: Matter.Body[];
  sizes: Size[];
  raf: number;
  last: number;
  t0: number;
  drag: Drag | null;
  zone: Zone | null;
  live: boolean;
}
interface Latest {
  onSelect?: FolderFloatProps['onSelect'];
  onOpenChange?: FolderFloatProps['onOpenChange'];
  drift: number;
  reduce: boolean;
}

const DEFAULT_ITEMS: FolderFloatItem[] = [
  'Try a warmer palette',
  'Tighten the spacing',
  'Logo feels small',
  'Love the new hero'
];
const PAD = 28;
const CHAR = 6.8;
const GAP = 12;
const ROW = 52;
const DRAG_MIN = 4;
const ZONE_PAD = 8;
const ITEM_EDGE_GUTTER = 16;

const jitter = (i: number) => {
  const x = Math.sin(i * 12.9898 + 4.1414) * 43758.5453;
  return x - Math.floor(x);
};

const layout = (list: Entry[], spread: number, lift: number, tilt: number, sizes: (Size | null)[], centerRows = false) => {
  const rows: { items: { i: number; pw: number }[]; width: number }[] = [];
  let row: { i: number; pw: number }[] = [];
  let width = 0;
  list.forEach((item, i) => {
    const pw = sizes[i]?.w ?? PAD + item.label.length * CHAR;
    if (row.length && width + GAP + pw > spread * 2) {
      rows.push({ items: row, width });
      row = [];
      width = 0;
    }
    row.push({ i, pw });
    width += (row.length > 1 ? GAP : 0) + pw;
  });
  if (row.length) rows.push({ items: row, width });
  const pos: { x: number; y: number; r: number }[] = [];
  rows.forEach((r, ri) => {
    let x = -r.width / 2;
    const shift = centerRows ? 0 : (ri % 2 ? 1 : -1) * Math.min(16, spread * 0.1);
    r.items.forEach(({ i, pw }) => {
      const j = jitter(i);
      pos[i] = { x: x + pw / 2 + shift + (j - 0.5) * 6, y: -lift - ri * ROW - j * 6, r: tilt * (j * 2 - 1) };
      x += pw + GAP;
    });
  });
  return pos;
};

const FolderFloat: React.FC<FolderFloatProps> = ({
  items = DEFAULT_ITEMS,
  label = 'Design feedback',
  sublabel = '',
  trigger = 'hover',
  defaultOpen = false,
  closeOnSelect = true,
  physics = true,
  constrainItemsToParent = false,
  drift = 0.5,
  onSelect,
  onOpenChange,
  folderColor = '#3f3f46',
  frontColor = '#52525b',
  paperColor = '#f5f5f5',
  itemColor = '#f5f5f5',
  itemTextColor = '#18181b',
  labelColor = '#f5f5f5',
  width = 200,
  height = 148,
  radius = 14,
  spread = 180,
  lift = 26,
  tilt = 8,
  flapAngle = 34,
  restAngle = 16,
  openDuration = 520,
  stagger = 45,
  bounce = 0.3,
  className = ''
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const [popped, setPopped] = useState(-1);
  const [live, setLive] = useState(false);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [itemContainerWidth, setItemContainerWidth] = useState(0);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef<(HTMLAnchorElement | HTMLButtonElement | null)[]>([]);
  const world = useRef<World>({
    engine: null,
    bodies: [],
    sizes: [],
    raf: 0,
    last: 0,
    t0: 0,
    drag: null,
    zone: null,
    live: false
  });
  const latest = useRef<Latest>({} as Latest);
  latest.current = { onSelect, onOpenChange, drift, reduce: latest.current.reduce ?? false };
  const popTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const liveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const draggedRef = useRef(false);
  const list: Entry[] = items.map(item => {
    if (typeof item === 'string') return { label: item, value: item };
    return { ...item, value: item.value ?? item.href ?? item.label };
  });
  const n = list.length;
  const sub = sublabel || `${n} ${n === 1 ? 'note' : 'notes'}`;
  const itemSpread = constrainItemsToParent && itemContainerWidth > 0
    ? Math.min(spread, Math.max(0, (itemContainerWidth - ITEM_EDGE_GUTTER * 2) / 2))
    : spread;
  const pos = layout(list, itemSpread, lift, tilt, sizes, constrainItemsToParent);

  const labelsKey = list.map(item => item.label).join('|');
  useLayoutEffect(() => {
    const measure = () => {
      const next = pillRefs.current.slice(0, n).map(el => (el ? { w: el.offsetWidth, h: el.offsetHeight } : null));
      if (next.some(s => !s)) return;
      const sized = next as Size[];
      setSizes(prev =>
        prev.length === sized.length && prev.every((s, i) => s.w === sized[i].w && s.h === sized[i].h) ? prev : sized
      );
    };
    measure();
    document.fonts?.ready.then(measure);
  }, [n, labelsKey]);

  useLayoutEffect(() => {
    if (!constrainItemsToParent) return undefined;
    const container = detailsRef.current?.parentElement;
    if (!container) return undefined;
    const measure = () => {
      const width = container.getBoundingClientRect().width;
      setItemContainerWidth(previous => Math.abs(previous - width) < 0.5 ? previous : width);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [constrainItemsToParent]);

  const stopPhysics = useCallback(() => {
    const w = world.current;
    clearTimeout(liveTimer.current);
    cancelAnimationFrame(w.raf);
    w.raf = 0;
    if (w.engine) {
      w.bodies.forEach((b, i) => {
        const el = pillRefs.current[i];
        if (!el) return;
        el.style.setProperty('--x', `${b.position.x.toFixed(1)}px`);
        el.style.setProperty('--y', `${(b.position.y - w.sizes[i].h / 2).toFixed(1)}px`);
      });
      Composite.clear(w.engine.world, false, true);
      Engine.clear(w.engine);
      w.engine = null;
    }
    w.bodies = [];
    w.drag = null;
    w.live = false;
    setLive(false);
  }, []);

  const startPhysics = useCallback(() => {
    const w = world.current;
    if (w.engine) return;
    const els = pillRefs.current.slice(0, n);
    if (els.some(el => !el)) return;
    const engine = Engine.create({ gravity: { x: 0, y: 0 } });
    engine.enableSleeping = false;
    w.engine = engine;
    w.sizes = (els as Array<HTMLAnchorElement | HTMLButtonElement>).map(el => ({ w: el.offsetWidth, h: el.offsetHeight }));
    const ys = pos.map(p => p.y);
    const horizontalExtent = constrainItemsToParent && itemContainerWidth > 0
      ? Math.min(itemSpread + ZONE_PAD, Math.max(0, itemContainerWidth / 2 - ITEM_EDGE_GUTTER / 2))
      : itemSpread + ZONE_PAD;
    const zone = {
      left: -horizontalExtent,
      right: horizontalExtent,
      top: Math.min(...ys) - ZONE_PAD,
      bottom: -lift + Math.max(...w.sizes.map(s => s.h))
    };
    w.zone = zone;
    w.bodies = els.map((el, i) => {
      const { w: bw, h: bh } = w.sizes[i];
      const b = Bodies.rectangle(pos[i].x, pos[i].y + bh / 2, bw, bh, {
        chamfer: { radius: Math.min(bh / 2 - 1, 16) },
        restitution: 0.55,
        friction: 0,
        frictionAir: 0.08,
        inertia: Infinity
      });
      (b as Matter.Body & { plugin: { phase: number } }).plugin = { phase: jitter(i) * Math.PI * 2 };
      return b;
    });
    const T = 80;
    const walls = [
      Bodies.rectangle((zone.left + zone.right) / 2, zone.top - T / 2, zone.right - zone.left + 2 * T, T, {
        isStatic: true
      }),
      Bodies.rectangle((zone.left + zone.right) / 2, zone.bottom + T / 2, zone.right - zone.left + 2 * T, T, {
        isStatic: true
      }),
      Bodies.rectangle(zone.left - T / 2, (zone.top + zone.bottom) / 2, T, zone.bottom - zone.top + 2 * T, {
        isStatic: true
      }),
      Bodies.rectangle(zone.right + T / 2, (zone.top + zone.bottom) / 2, T, zone.bottom - zone.top + 2 * T, {
        isStatic: true
      })
    ];
    Composite.add(engine.world, [...w.bodies, ...walls]);
    w.live = true;
    w.last = 0;
    w.t0 = performance.now();
    setLive(true);
    const tick = (now: number) => {
      const s = world.current;
      if (!s.engine) return;
      const dt = s.last ? Math.min(32, now - s.last) : 16;
      s.last = now;
      const t = (now - s.t0) / 1000;
      const k = latest.current.drift * 0.00005 * Math.min(1, t / 2);
      s.bodies.forEach((b, i) => {
        if (s.drag && s.drag.i === i) return;
        const ph = (b as Matter.Body & { plugin: { phase: number } }).plugin.phase;
        Body.applyForce(b, b.position, {
          x: Math.sin(t * 0.9 + ph) * k * b.mass,
          y: Math.cos(t * 1.3 + ph * 1.7) * k * b.mass
        });
      });
      Engine.update(s.engine, dt);
      s.bodies.forEach((b, i) => {
        const el = pillRefs.current[i];
        if (!el) return;
        el.style.setProperty('--x', `${b.position.x.toFixed(1)}px`);
        el.style.setProperty('--y', `${(b.position.y - s.sizes[i].h / 2).toFixed(1)}px`);
      });
      s.raf = requestAnimationFrame(tick);
    };
    w.raf = requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, itemSpread, lift, pos.map(p => `${p.x},${p.y}`).join('|'), constrainItemsToParent, itemContainerWidth]);

  const set = useCallback(
    (next: boolean) => {
      if (!next) stopPhysics();
      if (detailsRef.current && detailsRef.current.open !== next) detailsRef.current.open = next;
      setOpen(prev => {
        if (prev === next) return prev;
        latest.current.onOpenChange?.(next);
        return next;
      });
    },
    [stopPhysics]
  );

  useEffect(() => {
    clearTimeout(liveTimer.current);
    if (!open || !physics || latest.current.reduce) {
      if (!open) stopPhysics();
      else if (!physics) stopPhysics();
      return undefined;
    }
    if (world.current.engine) stopPhysics();
    liveTimer.current = setTimeout(startPhysics, openDuration + (n - 1) * stagger + 80);
    return () => clearTimeout(liveTimer.current);
  }, [open, physics, openDuration, stagger, n, startPhysics, stopPhysics, itemSpread, itemContainerWidth]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      latest.current.reduce = mq.matches;
      if (mq.matches) stopPhysics();
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [stopPhysics]);

  useEffect(() => {
    const hide = () => { if (document.hidden) set(false); };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, [set]);

  useEffect(
    () => () => {
      clearTimeout(popTimer.current);
      stopPhysics();
    },
    [stopPhysics]
  );

  const pick = (item: Entry, i: number, shouldClose = closeOnSelect) => {
    latest.current.onSelect?.(item.value, i);
    clearTimeout(popTimer.current);
    setPopped(i);
    popTimer.current = setTimeout(() => setPopped(-1), 320);
    if (shouldClose) set(false);
  };

  const pointerAt = (e: PointerEvent<HTMLElement>) => {
    const r = anchorRef.current?.getBoundingClientRect();
    return r ? { x: e.clientX - r.left, y: e.clientY - r.top } : { x: 0, y: 0 };
  };
  const down = (e: PointerEvent<HTMLElement>, i: number) => {
    draggedRef.current = false;
    const w = world.current;
    if (!w.live || e.button !== 0) return;
    const b = w.bodies[i];
    if (!b) return;
    const p = pointerAt(e);
    w.drag = {
      i,
      id: e.pointerId,
      dx: b.position.x - p.x,
      dy: b.position.y - p.y,
      sx: e.clientX,
      sy: e.clientY,
      moved: false
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };
  const move = (e: PointerEvent<HTMLElement>, i: number) => {
    const w = world.current;
    const d = w.drag;
    if (!d || d.i !== i || d.id !== e.pointerId) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) >= DRAG_MIN) {
      d.moved = true;
      draggedRef.current = true;
      e.currentTarget.setAttribute('data-drag', '');
    }
    if (!d.moved) return;
    const b = w.bodies[i];
    const { w: bw, h: bh } = w.sizes[i];
    const z = w.zone as Zone;
    const p = pointerAt(e);
    const x = Math.min(z.right - bw / 2, Math.max(z.left + bw / 2, p.x + d.dx));
    const y = Math.min(z.bottom - bh / 2, Math.max(z.top + bh / 2, p.y + d.dy));
    Body.setVelocity(b, { x: (x - b.position.x) * 0.6, y: (y - b.position.y) * 0.6 });
    Body.setPosition(b, { x, y });
  };
  const up = (e: PointerEvent<HTMLElement>, i: number) => {
    const w = world.current;
    const d = w.drag;
    if (!d || d.i !== i || d.id !== e.pointerId) return;
    w.drag = null;
    e.currentTarget.removeAttribute('data-drag');
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  const hover = trigger === 'hover';

  return (
    <details
      ref={detailsRef}
      className={`folder-float${className ? ` ${className}` : ''}`}
      open={open}
      data-open={open ? '' : undefined}
      data-live={live ? '' : undefined}
      data-physics={physics ? '' : undefined}
      data-trigger={trigger}
      onPointerEnter={hover ? e => { if (e.pointerType === 'mouse') set(true); } : undefined}
      onPointerLeave={
        hover
          ? e => {
              if (e.pointerType === 'mouse' && !world.current.drag && !e.currentTarget.contains(document.activeElement)) set(false);
            }
          : undefined
      }
      onKeyDown={(e: React.KeyboardEvent<HTMLDetailsElement>) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation();
          set(false);
        }
      }}
      style={
        {
          '--ff-w': `${width}px`,
          '--ff-h': `${height}px`,
          '--ff-r': `${radius}px`,
          '--ff-back': folderColor,
          '--ff-front': frontColor,
          '--ff-paper': paperColor,
          '--ff-item': itemColor,
          '--ff-item-ink': itemTextColor,
          '--ff-label': labelColor,
          '--ff-spread': `${itemSpread}px`,
          '--ff-lift': `${lift}px`,
          '--ff-angle': `${flapAngle}deg`,
          '--ff-rest': `${restAngle}deg`,
          '--ff-open': `${openDuration}ms`,
          '--ff-close': `${Math.round(openDuration * 0.6)}ms`,
          '--ff-stagger': `${stagger}ms`,
          '--ff-n': n,
          '--ff-spring': `cubic-bezier(0.34, ${(1 + bounce * 1.9).toFixed(2)}, 0.64, 1)`
        } as CSSProperties
      }
      onToggle={event => {
        if (event.currentTarget.open !== open) set(event.currentTarget.open);
      }}
    >
      <summary className="folder-float__trigger" aria-label={`${label}, ${sub}`}>
        <span className="folder-float__folder" aria-hidden="true">
          <span className="folder-float__back" />
          <span className="folder-float__paper" />
          <span className="folder-float__front">
            <span className="folder-float__label">{label}</span>
            <span className="folder-float__sub">{sub}</span>
          </span>
        </span>
        <span className="sr-only">{label}, {sub}</span>
      </summary>
      <div ref={anchorRef} className="folder-float__items">
        {list.map((item, i) => {
          const p = pos[i];
          const commonProps = {
            ref: (el: HTMLAnchorElement | HTMLButtonElement | null) => {
              pillRefs.current[i] = el;
            },
            className: 'folder-float__item',
            'data-pop': popped === i ? '' : undefined,
            style: {
              '--i': i,
              '--x': `${p.x.toFixed(1)}px`,
              '--y': `${p.y.toFixed(1)}px`,
              '--r': `${p.r.toFixed(2)}deg`
            } as CSSProperties,
            onPointerDown: (e: PointerEvent<HTMLElement>) => down(e, i),
            onPointerMove: (e: PointerEvent<HTMLElement>) => move(e, i),
            onPointerUp: (e: PointerEvent<HTMLElement>) => up(e, i),
            onPointerCancel: (e: PointerEvent<HTMLElement>) => { draggedRef.current = true; up(e, i); },
          };

          if (item.href) {
            return (
              <a
                {...commonProps}
                key={`${item.href}-${i}`}
                href={item.href}
                onClick={e => {
                  if (draggedRef.current && e.detail !== 0) e.preventDefault();
                  else pick(item, i, false);
                  draggedRef.current = false;
                }}
              >
                <span className="folder-float__drift">{item.label}</span>
              </a>
            );
          }

          return (
            <button
              {...commonProps}
              key={`${item.value}-${i}`}
              type="button"
              onClick={e => {
                if (!draggedRef.current || e.detail === 0) pick(item, i);
                draggedRef.current = false;
              }}
            >
              <span className="folder-float__drift">{item.label}</span>
            </button>
          );
        })}
      </div>
    </details>
  );
};

export default FolderFloat;
