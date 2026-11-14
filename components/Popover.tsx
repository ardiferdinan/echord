"use client";
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * Button + native popover: drawn in the top layer (never clipped by a scrolling row), light-dismiss and
 * Escape come from the browser. Placed under the button, flipped above it near the bottom of the screen.
 */
export function Popover({
  label,
  button,
  buttonClass,
  panelClass = "w-72",
  children,
}: {
  label: string;
  button: ReactNode | ((open: boolean) => ReactNode);
  buttonClass: string;
  panelClass?: string;
  children: (close: () => void) => ReactNode;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const id = useId();
  const close = () => document.getElementById(id)?.hidePopover(); // by id: the render-time callback must not touch refs

  const place = () => {
    const t = trigger.current?.getBoundingClientRect(), el = panel.current;
    if (!t || !el) return;
    const { width: w, height: h } = el.getBoundingClientRect();
    const below = t.bottom + 6 + h <= innerHeight - 8 || t.top < h + 14;
    el.style.top = `${Math.max(8, below ? t.bottom + 6 : t.top - 6 - h)}px`;
    const left = t.left < innerWidth / 2 ? t.left : t.right - w; // open toward the middle of the screen
    el.style.left = `${Math.min(Math.max(8, left), innerWidth - w - 8)}px`;
  };
  // content renders after the popover opens, so measure once it is there (and when it changes size)
  useLayoutEffect(() => {
    if (!open || !panel.current) return;
    place();
    const ro = new ResizeObserver(place);
    ro.observe(panel.current);
    return () => ro.disconnect();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const off = (e: Event) => !(e.target instanceof Node && panel.current?.contains(e.target)) && panel.current?.hidePopover(); // resize targets window
    addEventListener("scroll", off, true);
    addEventListener("resize", off);
    return () => {
      removeEventListener("scroll", off, true);
      removeEventListener("resize", off);
    };
  }, [open]);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label={label}
        title={label}
        aria-expanded={open}
        data-open={open || undefined}
        className={buttonClass}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (open) panel.current?.hidePopover();
          else panel.current?.showPopover();
        }}
      >
        {typeof button === "function" ? button(open) : button}
      </button>
      <div
        ref={panel}
        id={id}
        popover="auto"
        role="dialog"
        aria-label={label}
        onToggle={(e) => setOpen(e.newState === "open")}
        onClick={(e) => e.stopPropagation()}
        className={`fixed inset-auto m-0 max-h-[min(70vh,480px)] overflow-y-auto on-dark rounded-md bg-[#282828] p-1 text-ink shadow-[0_16px_24px_rgba(0,0,0,.5)] ${panelClass}`}
      >
        {open && children(close)}
      </div>
    </>
  );
}

export const menuItem = "flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left text-sm font-medium text-ink/90 hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none";
