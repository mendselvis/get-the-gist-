import Link from "next/link";

// a simple burst: 12 rounded rays around a centre
export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => (
        <line
          key={i}
          x1="16"
          y1="3"
          x2="16"
          y2={i % 2 ? "10" : "11.5"}
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          transform={`rotate(${i * 30} 16 16)`}
        />
      ))}
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 text-ink">
      <LogoMark />
      <span className="text-[17px] font-semibold tracking-tight">Get the Gist</span>
    </Link>
  );
}
