import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { Plan, Scene } from "@/lib/schema";
import { AnswerScene } from "./scenes/Answer";
import { ChartScene } from "./scenes/Chart";
import { CodeScene } from "./scenes/Code";
import { ComparisonScene } from "./scenes/Comparison";
import { DefinitionScene } from "./scenes/Definition";
import { DiagramScene } from "./scenes/Diagram";
import { EquationScene } from "./scenes/Equation";
import { HintScene } from "./scenes/Hint";
import { ListScene } from "./scenes/List";
import { QuizScene } from "./scenes/Quiz";
import { SANS, SERIF, THEME, W, type Theme } from "./scenes/shared";
import { TimelineScene } from "./scenes/Timeline";
import { sceneAt } from "./timing";

export { FPS, sceneAt, sceneFrames, totalFrames } from "./timing";

const ENTER_FRAMES = 12;
const EXIT_FRAMES = 8;

function SceneVisual({ scene, local, duration, theme }: { scene: Scene; local: number; duration: number; theme: Theme }) {
  const props = { local, duration, theme };
  const v = scene.visual;
  switch (v.type) {
    case "diagram":
      return <DiagramScene visual={v} {...props} />;
    case "list":
      return <ListScene visual={v} {...props} />;
    case "comparison":
      return <ComparisonScene visual={v} {...props} />;
    case "timeline":
      return <TimelineScene visual={v} {...props} />;
    case "equation":
      return <EquationScene visual={v} {...props} />;
    case "code":
      return <CodeScene visual={v} {...props} />;
    case "definition":
      return <DefinitionScene visual={v} {...props} />;
    case "chart":
      return <ChartScene visual={v} {...props} />;
    case "quiz":
      return <QuizScene visual={v} {...props} />;
    case "answer":
      return <AnswerScene visual={v} {...props} />;
    case "hint":
      return <HintScene visual={v} {...props} />;
  }
}

// routes each scene to its component, with the shared heading, citation and transitions
export const FlowVideo: React.FC<{ plan: Plan }> = ({ plan }) => {
  const frame = useCurrentFrame();
  const { index, start, duration } = sceneAt(plan, frame);
  const scene = plan.scenes[index];
  const local = frame - start;
  const theme = scene.visual.type === "code" ? THEME.dark : THEME.light;
  const isLast = index === plan.scenes.length - 1;

  // fade and lift in; fade out before the next scene (the last one stays up).
  // The first scene doesn't fade in, so the paused first frame (what a reopened session shows) isn't blank.
  const fadeIn = index === 0 ? 1 : interpolate(local, [0, ENTER_FRAMES], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = isLast ? 1 : interpolate(local, [duration - EXIT_FRAMES, duration], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const opacity = Math.min(fadeIn, fadeOut);
  const heading = scene.heading || (scene.visual.type === "quiz" ? "Quick check" : scene.visual.type === "answer" ? "The answer" : scene.visual.type === "hint" ? "A hint first" : plan.title);

  return (
    <AbsoluteFill style={{ background: THEME.light.bg, fontFamily: SANS }}>
      <AbsoluteFill style={{ background: theme.bg, opacity }}>
        <div style={{ position: "absolute", top: 34, left: 56, right: 56, transform: `translateY(${(1 - fadeIn) * 10}px)` }}>
          <div style={{ color: theme.muted, fontSize: 20, fontWeight: 700, letterSpacing: 1.6, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {plan.title} · {index + 1}/{plan.scenes.length}
          </div>
          <div style={{ marginTop: 6, color: theme.ink, fontFamily: SERIF, fontSize: 50, lineHeight: 1.05, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {heading}
          </div>
        </div>

        <div style={{ position: "absolute", inset: 0, transform: `translateY(${(1 - fadeIn) * 16}px)` }}>
          <SceneVisual scene={scene} local={local} duration={duration} theme={theme} />
        </div>

        {scene.source && (
          <div
            style={{
              position: "absolute",
              left: 56,
              bottom: 30,
              maxWidth: W - 112,
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 22px",
              borderRadius: 999,
              background: "#f9d4f2",
              color: "#111",
              fontSize: 24,
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            <span style={{ fontWeight: 700, flexShrink: 0 }}>From your slide:</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>“{scene.source}”</span>
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
