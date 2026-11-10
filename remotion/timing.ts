import type { Plan, Scene } from "@/lib/schema";

export const FPS = 30;
const MIN_SECONDS = 4;
const WORDS_PER_SEC = 2.5; // a little slower than speech, so the voice-over fits in its scene

// time a scene's visual needs on top of its narration: reveals, steps, the quiz pause
function visualSeconds(scene: Scene) {
  const v = scene.visual;
  switch (v.type) {
    case "list":
      return v.points.length * 1.3 + 2;
    case "timeline":
      return v.events.length * 1.3 + 2;
    case "comparison":
      return v.rows.length * 1.2 + 2.5;
    case "equation":
    case "code":
      return v.steps.length * 2.8 + 1.5;
    case "quiz":
      return 10;
    case "definition":
    case "answer":
    case "hint":
      return 6;
    case "chart":
      return 5;
    default:
      return MIN_SECONDS;
  }
}

// each scene lasts long enough for its narration to be spoken and its visual to play out
export function sceneFrames(plan: Plan) {
  return plan.scenes.map((s) => {
    const words = s.narration.trim().split(/\s+/).length;
    const seconds = Math.max(MIN_SECONDS, words / WORDS_PER_SEC + 1, visualSeconds(s));
    return Math.ceil(seconds * FPS);
  });
}

export function totalFrames(plan: Plan) {
  return sceneFrames(plan).reduce((a, b) => a + b, 0);
}

// which scene is showing at this frame, when it started, and how long it lasts
export function sceneAt(plan: Plan, frame: number) {
  const frames = sceneFrames(plan);
  let start = 0;
  for (let i = 0; i < frames.length; i++) {
    if (frame < start + frames[i] || i === frames.length - 1) return { index: i, start, duration: frames[i] };
    start += frames[i];
  }
  return { index: 0, start: 0, duration: frames[0] };
}
