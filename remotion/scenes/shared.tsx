import { Easing, interpolate } from "remotion";
import type { ReactNode } from "react";

export const W = 1280;
export const H = 720;

// every scene draws its visual inside this box: the heading sits above it,
// the "From your slide" strip below it (layout.ts uses the same bounds)
export const CONTENT = { top: 150, bottom: 620, left: 56, right: W - 56 };
export const CONTENT_W = CONTENT.right - CONTENT.left;
export const CONTENT_H = CONTENT.bottom - CONTENT.top;

export const SERIF = "var(--font-serif), Georgia, serif";
export const SANS = "var(--font-sans), system-ui, sans-serif";
export const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

export const THEME = {
  light: { bg: "#fffdf9", ink: "#111111", muted: "#4b5563", line: "#e3e3ea", card: "#ffffff" },
  dark: { bg: "#0f172a", ink: "#f8fafc", muted: "#cbd5e1", line: "#334155", card: "#1e293b" },
};
export type Theme = (typeof THEME)["light"];

export const PASTELS = ["#dce8fb", "#f9d4f2", "#fce38a", "#b9f2c5", "#ffe3cc"];
export const ACCENT = "#fce38a";
export const MINT = "#b9f2c5";

export type SceneProps<V> = { visual: V; local: number; duration: number; theme: Theme };

// 0 to 1 over `length` frames starting at `start`, eased, clamped
export function appear(local: number, start = 0, length = 14) {
  return interpolate(local, [start, start + length], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

// style for an item fading and sliding into place
export function enter(p: number, dy = 18): React.CSSProperties {
  return { opacity: p, transform: `translateY(${(1 - p) * dy}px)` };
}

// when item i of n starts to appear: spread over the first ~70% of the scene
export function revealFrame(i: number, n: number, duration: number) {
  const span = Math.max(1, duration * 0.7 - 10);
  return 10 + (i * span) / Math.max(1, n);
}

// which of n steps is current, stepping evenly through the scene
export function currentStep(n: number, local: number, duration: number) {
  const per = Math.max(1, (duration - 8) / n);
  return Math.min(n - 1, Math.max(0, Math.floor((local - 4) / per)));
}

export function Content({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        position: "absolute",
        left: CONTENT.left,
        top: CONTENT.top,
        width: CONTENT_W,
        height: CONTENT_H,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
