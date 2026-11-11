"use client";
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { blobPath, type Corner, type Cut } from "@/lib/blob";

type Slot = { node: ReactNode; tint?: string };

/**
 * A card/slab whose outline is cut around corner elements (the "blobby" look):
 * the shape is an SVG path with every corner rounded by a tangent arc, so cuts flow smoothly with no sharp tips.
 * Corner elements are measured, so the cut always fits them plus `gap`.
 * A slot with `tint` also fills its cut with a translucent tab that tucks under the card (reference "arrow" tabs).
 */
export function Blob({
  fill,
  radius = 28,
  gap = 10,
  slots = {},
  className = "",
  style,
  children,
}: {
  fill: string;
  radius?: number;
  gap?: number;
  slots?: Partial<Record<Corner, Slot>>;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const slotKey = Object.keys(slots).join();
  const refs = useRef<Partial<Record<Corner, HTMLDivElement | null>>>({});
  const [geo, setGeo] = useState<{ w: number; h: number; cuts: Partial<Record<Corner, Cut>> } | null>(null);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      const cuts: Partial<Record<Corner, Cut>> = {};
      for (const [c, s] of Object.entries(refs.current)) {
        if (!s) continue;
        cuts[c as Corner] = s.dataset.tint
          ? { w: s.offsetWidth, h: s.offsetHeight }
          : { w: s.offsetWidth + (c === "t" ? 2 * gap : gap), h: s.offsetHeight + gap };
      }
      setGeo({ w: el.offsetWidth, h: el.offsetHeight, cuts });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    Object.values(refs.current).forEach((s) => s && ro.observe(s));
    return () => ro.disconnect();
  }, [gap, slotKey]);

  const pos: Record<Corner, string> = {
    tl: "left-0 top-0",
    tr: "right-0 top-0",
    bl: "bottom-0 left-0",
    br: "bottom-0 right-0",
    t: "left-1/2 top-0 -translate-x-1/2",
  };

  return (
    <div
      ref={box}
      className={`relative isolate ${className}`}
      // until measured (SSR / first paint) show a plain rounded shape
      style={{ ...style, borderRadius: geo ? undefined : radius, background: geo ? undefined : fill }}
    >
      {geo &&
        Object.entries(slots).map(([c, s]) =>
          s?.tint && geo.cuts[c as Corner] ? (
            <span
              key={"tint" + c}
              aria-hidden
              className={`absolute -z-20 ${pos[c as Corner]}`}
              style={{ width: geo.cuts[c as Corner]!.w + radius, height: geo.cuts[c as Corner]!.h + radius, background: s.tint, borderRadius: radius }}
            />
          ) : null,
        )}
      {geo && (
        <svg className="pointer-events-none absolute inset-0 -z-10 h-full w-full overflow-visible" aria-hidden>
          <path d={blobPath(geo.w, geo.h, geo.cuts, radius)} fill={fill} />
        </svg>
      )}
      {children}
      {Object.entries(slots).map(([c, s]) =>
        s ? (
          <div
            key={c}
            ref={(el) => {
              refs.current[c as Corner] = el;
            }}
            data-tint={s.tint ? "1" : undefined}
            className={`absolute z-10 ${pos[c as Corner]}`}
          >
            {s.node}
          </div>
        ) : null,
      )}
    </div>
  );
}
