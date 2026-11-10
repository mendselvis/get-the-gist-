import Link from "next/link";
import type { ReactNode } from "react";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

const variants = {
  solid: "bg-ink text-white hover:bg-black/80",
  outline: "border border-ink text-ink hover:bg-ink/5",
};

const sizes = {
  md: "h-11 px-5 text-[15px]",
  lg: "h-14 px-7 text-base",
};

export function pillClass(variant: keyof typeof variants = "solid", size: keyof typeof sizes = "md") {
  return `${base} ${variants[variant]} ${sizes[size]}`;
}

export function Pill({
  href,
  children,
  variant = "solid",
  size = "md",
}: {
  href: string;
  children: ReactNode;
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}) {
  const className = pillClass(variant, size);
  // in-page anchors are plain links so the browser scrolls smoothly
  if (href.startsWith("#")) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
