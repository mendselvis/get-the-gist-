"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import AskPanel from "@/components/AskPanel";
import VideoPanel, { type VideoController } from "@/components/VideoPanel";
import type { Plan, Verification } from "@/lib/schema";
import type { StoredMessage } from "@/lib/sessions";

function VerificationBadges({ plan }: { plan: Plan }) {
  if (!plan.verification?.length) return null;
  const many = plan.questions.length > 1;
  const label = (v: Verification) => (many ? `Question ${v.question + 1}: ` : "");
  return (
    <ul className="mt-3 flex flex-wrap gap-2" aria-label="Answer checks">
      {plan.verification.map((v) => (
        <li
          key={v.question}
          className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
            v.status === "unverified" ? "border border-line bg-white text-muted" : "border border-[#111] bg-mint text-[#111]"
          }`}
        >
          {label(v)}
          {v.status === "verified" && "✓ Answer checked by running code"}
          {v.status === "corrected" && "✓ Answer corrected after running code"}
          {v.status === "unverified" &&
            (v.computed ? `Running code gave ${v.computed}, which doesn’t match. Check this one carefully.` : "Couldn’t check this answer by running code")}
        </li>
      ))}
    </ul>
  );
}

// the video (hint first, if asked), its checks and extra questions, then the follow-up chat
export function Explanation({
  plan,
  meta,
  actions,
  initialMessages,
  onMessagesChange,
  onSolveQuestion,
  solveUnavailable,
}: {
  plan: Plan;
  meta?: string;
  actions?: ReactNode;
  initialMessages?: StoredMessage[];
  onMessagesChange?: (messages: StoredMessage[]) => void;
  // solve one of the slide's extra questions as a new explanation
  onSolveQuestion?: (question: string) => void;
  // why the extra questions can't be solved right now, if they can't
  solveUnavailable?: string;
}) {
  const videoRef = useRef<VideoController | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  // "Give me a hint first": play only the leading hint scenes until the student asks for the rest
  const hintCount = plan.scenes.findIndex((s) => s.visual.type !== "hint");
  const hasHint = hintCount > 0;
  const [revealed, setRevealed] = useState(!hasHint);
  const visiblePlan = useMemo(() => (revealed ? plan : { ...plan, scenes: plan.scenes.slice(0, hintCount) }), [plan, revealed, hintCount]);

  function jumpToScene(index: number) {
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    videoRef.current?.seekToScene(index);
  }

  return (
    <>
      <section ref={sectionRef} className="mt-8 scroll-mt-20" aria-label="Your explainer">
        <VideoPanel key={revealed ? "full" : "hint"} plan={visiblePlan} controllerRef={videoRef} />

        {!revealed && (
          <div className="mt-4 flex flex-col items-start gap-2 rounded-[24px] bg-butter/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-medium">Have a go with the hint first. When you’re ready, watch the full solution.</p>
            <button
              type="button"
              onClick={() => {
                setRevealed(true);
                // the full video starts at the first solution scene
                requestAnimationFrame(() => videoRef.current?.seekToScene(hintCount));
              }}
              className="h-11 shrink-0 rounded-full bg-[#111] px-5 font-medium text-white hover:bg-black/80"
            >
              Show full solution
            </button>
          </div>
        )}

        {revealed && <VerificationBadges plan={plan} />}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          {meta ? <p className="text-sm text-muted">Built by {meta}</p> : <span />}
          {actions}
        </div>

        {revealed && plan.moreQuestions.length > 0 && (
          <div className="mt-5 rounded-[24px] border border-line bg-white p-5">
            <h2 className="font-semibold">More questions on this slide</h2>
            <p className="mt-0.5 text-sm text-muted">{solveUnavailable ?? "Pick one to solve next."}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {plan.moreQuestions.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => onSolveQuestion?.(q)}
                  disabled={!onSolveQuestion || !!solveUnavailable}
                  className="rounded-2xl border border-line bg-sky/50 px-4 py-2 text-left text-sm font-medium text-[#111] hover:border-[#111] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
      <AskPanel plan={visiblePlan} onJump={jumpToScene} initialMessages={initialMessages} onMessagesChange={onMessagesChange} />
    </>
  );
}
