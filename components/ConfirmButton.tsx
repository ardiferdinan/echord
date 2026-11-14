"use client";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Two taps instead of window.confirm (which some browsers and installed web apps block silently):
 * the first tap arms it and shows `confirmLabel`, a second tap within 4 s runs `onConfirm`.
 */
export function ConfirmButton({ children, confirmLabel, onConfirm, className, armedClassName = "", label }: {
  children: ReactNode; confirmLabel: ReactNode; onConfirm: () => void; className: string; armedClassName?: string; label?: string;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button"
      aria-label={armed ? undefined : label}
      title={label}
      onClick={() => (armed ? (setArmed(false), onConfirm()) : setArmed(true))}
      onBlur={() => setArmed(false)}
      className={`${className} ${armed ? armedClassName : ""}`}
    >
      {armed ? confirmLabel : children}
    </button>
  );
}
