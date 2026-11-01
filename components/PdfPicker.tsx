"use client";

import { useRef, useState } from "react";

type Props = {
  onPick: (imageBase64: string, mediaType: string) => void;
  busy: boolean;
};

export default function PdfPicker({ onPick, busy }: Props) {
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const pdfRef = useRef<any>(null);

  // draw one page to a canvas at the given width and return a JPEG data URL
  async function renderPage(pageNumber: number, width: number, quality: number) {
    const page = await pdfRef.current.getPage(pageNumber);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: width / base.width });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;

    await page.render({ canvas, canvasContext: ctx, viewport } as any).promise;
    return canvas.toDataURL("image/jpeg", quality);
  }

  async function loadPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setThumbs([]);
    setSelected(null);
    setStatus("Reading your slides on this device...");

    try {
      // loaded here, in the browser only, because pdf.js needs browser APIs
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();

      const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
      pdfRef.current = pdf;

      for (let i = 1; i <= pdf.numPages; i++) {
        const url = await renderPage(i, 240, 0.6);
        setThumbs((t) => [...t, url]);
        setStatus(`Loaded ${i} of ${pdf.numPages} slides`);
      }
      setStatus("");
    } catch {
      setStatus("Could not open that PDF. Try exporting your slides to PDF again.");
    }
  }

  async function makeVideo() {
    if (selected === null) return;
    // big enough for the model to read, small enough to upload fast
    const url = await renderPage(selected + 1, 1500, 0.85);
    onPick(url.split(",")[1], "image/jpeg");
  }

  return (
    <div>
      <input type="file" accept="application/pdf" onChange={loadPdf} disabled={busy} />

      {status && <p style={{ marginTop: 12, color: "#555" }}>{status}</p>}

      {thumbs.length > 0 && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
              gap: 10,
              marginTop: 16,
            }}
          >
            {thumbs.map((src, i) => (
              <button
                key={i}
                onClick={() => setSelected(i)}
                style={{
                  padding: 0,
                  border: selected === i ? "3px solid #0369a1" : "3px solid transparent",
                  borderRadius: 8,
                  background: "none",
                  cursor: "pointer",
                  position: "relative",
                }}
              >
                <img src={src} alt={`Slide ${i + 1}`} style={{ width: "100%", borderRadius: 6, display: "block" }} />
                <span
                  style={{
                    position: "absolute",
                    left: 6,
                    bottom: 6,
                    background: "#0f172a",
                    color: "#fff",
                    fontSize: 12,
                    padding: "2px 6px",
                    borderRadius: 4,
                  }}
                >
                  {i + 1}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={makeVideo}
            disabled={selected === null || busy}
            style={{
              marginTop: 16,
              padding: "12px 20px",
              fontSize: 16,
              borderRadius: 8,
              border: "none",
              background: selected === null || busy ? "#94a3b8" : "#0369a1",
              color: "#fff",
              cursor: selected === null || busy ? "not-allowed" : "pointer",
            }}
          >
            {selected === null ? "Pick a slide first" : `Make video from slide ${selected + 1}`}
          </button>
        </>
      )}
    </div>
  );
}
