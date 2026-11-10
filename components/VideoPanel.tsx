"use client";

import { useEffect, useRef, useState } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { FlowVideo, FPS, sceneAt, sceneFrames, totalFrames } from "@/remotion/FlowVideo";
import { useNarration } from "@/components/useNarration";
import type { Plan } from "@/lib/schema";

function formatTime(frames: number) {
  const s = Math.floor(frames / FPS);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// lets other parts of the page (the chat's "Jump to scene" buttons) drive the player
export type VideoController = { seekToScene: (index: number) => void };

// Player with its own caption area and control bar underneath,
// so captions can never sit on top of the playback controls.
export default function VideoPanel({
  plan,
  controllerRef,
}: {
  plan: Plan;
  controllerRef?: React.RefObject<VideoController | null>;
}) {
  const playerRef = useRef<PlayerRef>(null);
  const total = totalFrames(plan);
  // start the paused player a second in, after the first scene's entrance, so the poster isn't empty
  const posterFrame = Math.min(FPS, Math.max(0, total - 1));
  const [frame, setFrame] = useState(posterFrame);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const step = sceneAt(plan, frame).index;

  useNarration(playerRef, plan, muted);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const onFrame = (e: { detail: { frame: number } }) => setFrame(e.detail.frame);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    player.addEventListener("frameupdate", onFrame);
    player.addEventListener("seeked", onFrame);
    player.addEventListener("play", onPlay);
    player.addEventListener("pause", onPause);
    player.addEventListener("ended", onPause);
    return () => {
      player.removeEventListener("frameupdate", onFrame);
      player.removeEventListener("seeked", onFrame);
      player.removeEventListener("play", onPlay);
      player.removeEventListener("pause", onPause);
      player.removeEventListener("ended", onPause);
    };
  }, [plan]);

  useEffect(() => {
    if (!controllerRef) return;
    controllerRef.current = {
      seekToScene(index) {
        const player = playerRef.current;
        if (!player) return;
        const start = sceneFrames(plan).slice(0, index).reduce((a, b) => a + b, 0);
        player.seekTo(start);
        player.play();
      },
    };
    return () => {
      controllerRef.current = null;
    };
  }, [controllerRef, plan]);

  function togglePlay() {
    const player = playerRef.current;
    if (!player) return;
    if (player.isPlaying()) return player.pause();
    // replay from the start once the video has finished
    if (player.getCurrentFrame() >= total - 1) player.seekTo(0);
    player.play();
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-line bg-white shadow-[0_24px_60px_-30px_rgba(17,17,17,0.35)]">
      <Player
        ref={playerRef}
        initialFrame={posterFrame}
        component={FlowVideo}
        inputProps={{ plan }}
        durationInFrames={total}
        fps={FPS}
        compositionWidth={1280}
        compositionHeight={720}
        clickToPlay
        style={{ width: "100%", aspectRatio: "16 / 9" }}
      />

      {/* captions: their own area, above the controls */}
      <div className="border-t border-line px-5 py-4 sm:px-7 sm:py-5" aria-live="polite">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          Scene {step + 1} of {plan.scenes.length}
        </p>
        <p className="mt-1.5 min-h-[3.25em] text-[17px] leading-snug sm:text-xl">{plan.scenes[step].narration}</p>
      </div>

      {/* controls */}
      <div className="flex items-center gap-3 border-t border-line bg-[#fafafa] px-4 py-3 sm:gap-4 sm:px-6">
        <button
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-white transition-colors hover:bg-black/80"
        >
          {playing ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4" aria-hidden="true">
              <path d="M8 5v14l11-7z" fill="currentColor" />
            </svg>
          )}
        </button>

        <input
          type="range"
          min={0}
          max={total - 1}
          value={frame}
          onChange={(e) => playerRef.current?.seekTo(Number(e.target.value))}
          aria-label="Seek"
          className="h-1.5 min-w-0 flex-1 cursor-pointer accent-ink"
        />

        <span className="shrink-0 text-sm tabular-nums text-muted">
          {formatTime(frame)} / {formatTime(total)}
        </span>

        <button
          onClick={() => setMuted((m) => !m)}
          aria-pressed={!muted}
          aria-label={muted ? "Turn voice-over on" : "Turn voice-over off"}
          className={`flex h-11 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors sm:px-4 ${
            muted ? "border-line bg-white text-muted" : "border-ink bg-white text-ink"
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
            {muted ? (
              <path d="m16 9 5 6m0-6-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path d="M16 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
          <span className="hidden sm:inline">{muted ? "Voice off" : "Voice on"}</span>
        </button>
      </div>
    </div>
  );
}
