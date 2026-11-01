"use client";

import { useState } from "react";
import { Player } from "@remotion/player";
import { FlowVideo, FPS, STEP_FRAMES } from "@/remotion/FlowVideo";
import PdfPicker from "@/components/PdfPicker";
import type { Plan } from "@/lib/schema";

export default function Home() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState("");

  async function generate(image: string, mediaType: string) {
    setLoading(true);
    setError("");
    setPlan(null);
    setMeta("");

    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, mediaType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setPlan(data.plan as Plan);
      setMeta(`${data.provider}, ${(data.ms / 1000).toFixed(1)}s`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: 24,
        fontFamily: "system-ui, sans-serif",
        background: "#fff",
        color: "#111",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>Get the Gist</h1>
      <p style={{ marginBottom: 4 }}>Get the gist of any slide.</p>
      <p style={{ color: "#555", marginBottom: 20 }}>
        Choose your slides as a PDF, tap the page you want, and watch it explained.
      </p>

      <PdfPicker onPick={generate} busy={loading} />

      {loading && <p style={{ marginTop: 20 }}>Reading the slide and building the video...</p>}
      {error && <p style={{ marginTop: 20, color: "#b91c1c" }}>{error}</p>}
      {meta && <p style={{ marginTop: 12, color: "#555" }}>Built by {meta}</p>}

      {plan && (
        <div style={{ marginTop: 24 }}>
          <Player
            component={FlowVideo}
            inputProps={{ plan }}
            durationInFrames={plan.steps.length * STEP_FRAMES}
            fps={FPS}
            compositionWidth={1280}
            compositionHeight={720}
            controls
            style={{ width: "100%" }}
          />
        </div>
      )}
    </main>
  );
}
