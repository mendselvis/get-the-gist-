import type { VisualOf } from "@/lib/schema";
import { Content, MINT, SANS, SERIF, appear, enter, type SceneProps } from "./shared";

// a key term, what it means, and an everyday analogy that arrives a beat later
export function DefinitionScene({ visual, local, duration, theme }: SceneProps<VisualOf<"definition">>) {
  const termSize = Math.min(96, 1100 / Math.max(6, visual.term.length * 0.55));

  return (
    <Content style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 26 }}>
      <div style={{ ...enter(appear(local, 0), 24), fontFamily: SERIF, fontSize: termSize, lineHeight: 1, color: theme.ink }}>{visual.term}</div>
      <div style={{ ...enter(appear(local, 12)), maxWidth: 1080, fontFamily: SANS, fontSize: 36, lineHeight: 1.3, color: theme.ink }}>
        {visual.meaning}
      </div>
      {visual.analogy && (
        <div
          style={{
            ...enter(appear(local, Math.round(duration * 0.4)), 20),
            display: "flex",
            gap: 20,
            alignItems: "flex-start",
            maxWidth: 1080,
            padding: "22px 28px",
            borderRadius: 24,
            background: MINT,
            color: "#111",
            fontFamily: SANS,
          }}
        >
          <svg viewBox="0 0 24 24" width={40} height={40} style={{ flexShrink: 0 }} aria-hidden="true">
            <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" fill="none" stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", opacity: 0.75 }}>Think of it like</div>
            <div style={{ marginTop: 6, fontSize: 30, lineHeight: 1.3 }}>{visual.analogy}</div>
          </div>
        </div>
      )}
    </Content>
  );
}
