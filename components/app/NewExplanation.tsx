"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import InstructionBox from "@/components/InstructionBox";
import SlidePicker from "@/components/SlidePicker";
import type { Approach } from "@/lib/providers/shared";
import type { Plan } from "@/lib/schema";
import { createSession } from "@/lib/sessions";
import { useDeck, useSessions } from "./AppContext";
import { Explanation } from "./Explanation";

const LOADING_STEPS = [
  { after: 0, text: "Reading your slide…" },
  { after: 3000, text: "Drawing the diagram…" },
  { after: 9000, text: "Writing the narration…" },
  { after: 16000, text: "Checking the working…" },
  { after: 28000, text: "Still working, almost there…" },
];

function BuildingCard() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - started), 500);
    return () => clearInterval(id);
  }, []);
  const text = [...LOADING_STEPS].reverse().find((s) => elapsed >= s.after)!.text;

  return (
    <div role="status" aria-live="polite" className="mt-10 rounded-[28px] border border-line bg-white p-6 sm:p-8">
      <div className="flex aspect-video items-center justify-center rounded-[20px] bg-[#fafafa]">
        <div className="flex items-center gap-3 sm:gap-5">
          {["bg-sky", "bg-butter", "bg-mint"].map((bg, i) => (
            <div key={bg} className="flex items-center gap-3 sm:gap-5">
              <div
                className={`${bg} h-12 w-16 animate-pulse rounded-xl border border-ink/10 sm:h-16 sm:w-24`}
                style={{ animationDelay: `${i * 0.25}s` }}
              />
              {i < 2 && <div className="h-0.5 w-5 bg-ink/20 sm:w-8" />}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-5 text-center text-lg font-medium">{text}</p>
    </div>
  );
}

// /app/new: pick a slide, build the video, save it as a session and open it
export default function NewExplanation() {
  const router = useRouter();
  const { deck } = useDeck();
  const { setActiveId } = useSessions();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [instruction, setInstruction] = useState("");
  const [approach, setApproach] = useState<Approach | undefined>(undefined);
  // only used when this browser can't save sessions (some private modes block IndexedDB)
  const [unsaved, setUnsaved] = useState<{ plan: Plan; meta: string } | null>(null);

  useEffect(() => setActiveId(null), [setActiveId]);

  // Next keeps this page alive (hidden) after navigating away, so reset the build state when it hides;
  // otherwise coming back via "Explain another slide" would find it still "loading"
  const visible = useRef(true);
  useLayoutEffect(() => {
    visible.current = true;
    return () => {
      visible.current = false;
      setLoading(false);
      setError("");
      setUnsaved(null);
    };
  }, []);

  async function generate(image: string, mediaType: string, pageIndex: number, thumbnail: string) {
    window.speechSynthesis?.cancel();
    setLoading(true);
    setError("");
    setUnsaved(null);

    let plan: Plan, meta: string;
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, mediaType, instruction: instruction.trim() || undefined, approach }),
      });
      // a host timeout returns an HTML page, not JSON
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong. Try again.");
      plan = data.plan as Plan;
      meta = `${data.provider}, ${(data.ms / 1000).toFixed(1)}s`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
      return;
    }

    try {
      const session = await createSession({
        title: plan.title,
        pdfName: deck?.fileName ?? "Slides",
        source: deck?.kind ?? "pdf",
        pageNumber: pageIndex + 1,
        slideThumbnail: thumbnail,
        plan,
        meta,
      });
      // still saved if the student moved on while it was building, but don't pull them back
      if (visible.current) router.push(`/app/${session.id}`);
    } catch {
      setUnsaved({ plan, meta });
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-8 sm:px-6 sm:pt-14 lg:pl-16">
      <h1 className="font-serif text-5xl leading-none tracking-[-0.02em] sm:text-6xl">Explain a slide</h1>
      <p className="mt-3 max-w-xl text-[17px] leading-relaxed text-muted">
        {deck?.kind === "pdf"
          ? `Pick another slide from ${deck.fileName}, or choose a different file.`
          : deck?.kind === "image"
            ? "Make a video from this image, or choose a different file."
            : "Choose a PDF, screenshot or photo of your slide and watch it explained. Your file stays on this device."}
      </p>

      <div className="mt-8">
        <SlidePicker
          onPick={generate}
          busy={loading}
          beforeAction={
            <InstructionBox
              value={instruction}
              onChange={setInstruction}
              approach={approach}
              onApproachChange={setApproach}
              disabled={loading}
            />
          }
        />
      </div>

      {loading && <BuildingCard />}
      {error && (
        <p role="alert" className="mt-8 rounded-2xl bg-blush px-5 py-4 font-medium">
          {error}
        </p>
      )}

      {unsaved && (
        <>
          <p role="status" className="mt-8 rounded-2xl bg-butter/60 px-5 py-4 font-medium">
            This browser isn’t letting Get the Gist save history, so this explanation won’t be kept after you leave.
          </p>
          <Explanation plan={unsaved.plan} meta={unsaved.meta} />
        </>
      )}
    </main>
  );
}
