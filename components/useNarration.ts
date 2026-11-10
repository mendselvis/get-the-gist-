"use client";

import { useEffect, type RefObject } from "react";
import type { PlayerRef } from "@remotion/player";
import { sceneAt } from "@/remotion/FlowVideo";
import type { Plan } from "@/lib/schema";

// voices that usually sound natural, across Chrome, Edge and Safari
const NATURAL = /natural|neural|premium|enhanced|google|siri|samantha|aria|jenny|daniel/i;

function pickVoice(voices: SpeechSynthesisVoice[]) {
  const en = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  const usOrUk = (v: SpeechSynthesisVoice) => /en[-_](us|gb)/i.test(v.lang);
  return (
    en.find((v) => NATURAL.test(v.name) && usOrUk(v)) ??
    en.find((v) => NATURAL.test(v.name)) ??
    en.find(usOrUk) ??
    en[0] ??
    null
  );
}

// speaks each step's narration in sync with the player:
// play resumes, pause pauses, seeking restarts the current step, a new step starts its own narration
export function useNarration(playerRef: RefObject<PlayerRef | null>, plan: Plan | null, muted: boolean) {
  useEffect(() => {
    const player = playerRef.current;
    if (!plan || !player || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    synth.getVoices(); // starts loading voices in Chrome, which fills them in later
    let spoken = -1; // the step whose narration is speaking, paused or done

    function speak(step: number) {
      synth.cancel();
      synth.resume(); // Chrome keeps the paused state after cancel, which would block new speech
      spoken = step;
      if (muted) return;
      const u = new SpeechSynthesisUtterance(plan!.scenes[step].narration);
      const voice = pickVoice(synth.getVoices());
      if (voice) u.voice = voice;
      u.lang = voice?.lang ?? "en-US";
      synth.speak(u);
    }

    const current = () => sceneAt(plan, player.getCurrentFrame()).index;

    const onPlay = () => {
      const step = current();
      if (step === spoken) synth.resume();
      else speak(step);
    };
    const onPause = () => synth.pause();
    const onSeeked = () => {
      synth.cancel();
      spoken = -1;
      if (player.isPlaying()) speak(current());
    };
    const onFrame = (e: { detail: { frame: number } }) => {
      if (!player.isPlaying()) return;
      const step = sceneAt(plan, e.detail.frame).index;
      if (step !== spoken) speak(step);
    };
    const onEnded = () => {
      synth.cancel();
      spoken = -1;
    };

    player.addEventListener("play", onPlay);
    player.addEventListener("pause", onPause);
    player.addEventListener("seeked", onSeeked);
    player.addEventListener("frameupdate", onFrame);
    player.addEventListener("ended", onEnded);

    // unmuting mid-video picks up the current step from its start
    if (player.isPlaying()) speak(current());

    return () => {
      player.removeEventListener("play", onPlay);
      player.removeEventListener("pause", onPause);
      player.removeEventListener("seeked", onSeeked);
      player.removeEventListener("frameupdate", onFrame);
      player.removeEventListener("ended", onEnded);
      // runs on mute, on a new plan and on unmount, so old speech never lingers
      synth.cancel();
    };
  }, [playerRef, plan, muted]);
}
