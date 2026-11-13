"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";

type Props = { href: string; exact?: boolean; className: (current: boolean) => string; children: (current: boolean) => ReactNode; label?: string };

/** Link that knows whether it is the current page (aria-current). The pathname is request data, so the static shell renders it unmarked. */
export function ActiveLink(props: Props) {
  return (
    <Suspense fallback={<Item {...props} current={false} />}>
      <Live {...props} />
    </Suspense>
  );
}

function Live(props: Props) {
  const path = usePathname();
  const current = props.exact ? path === props.href : path === props.href || path.startsWith(props.href + "/");
  return <Item {...props} current={current} />;
}

function Item({ href, className, children, label, current }: Props & { current: boolean }) {
  return (
    <Link href={href} aria-current={current ? "page" : undefined} aria-label={label} className={className(current)}>
      {children(current)}
    </Link>
  );
}
