import type { VisualOf } from "@/lib/schema";
import { ACCENT, Content, SANS, SERIF, appear, enter, type SceneProps } from "./shared";

// a nudge before the full solution
export function HintScene({ visual, local, duration, theme }: SceneProps<VisualOf<"hint">>) {
  return (
    <Content style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", gap: 26, fontFamily: SANS }}>
      <div style={{ ...enter(appear(local, 0)), display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ display: "grid", placeItems: "center", width: 72, height: 72, borderRadius: 999, background: ACCENT }}>
          <svg viewBox="0 0 24 24" width={40} height={40} aria-hidden="true">
            <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" fill="none" stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span style={{ color: theme.muted, fontSize: 26, fontWeight: 700, letterSpacing: 1.6, textTransform: "uppercase" }}>Hint</span>
      </div>
      <div style={{ ...enter(appear(local, 10), 22), maxWidth: 1080, fontFamily: SERIF, fontSize: 52, lineHeight: 1.15, color: theme.ink }}>
        {visual.hint}
      </div>
      <div style={{ ...enter(appear(local, Math.round(duration * 0.5))), color: theme.muted, fontSize: 26 }}>
        Try the next step yourself before watching the solution.
      </div>
    </Content>
  );
}
