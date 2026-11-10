"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { useDeck } from "@/components/app/AppContext";
import { renderForModel, renderPage } from "@/lib/pdfRender";

type Props = {
  // pageIndex is 0-based; thumbnail is the small preview already shown in the grid
  onPick: (imageBase64: string, mediaType: string, pageIndex: number, thumbnail: string) => void;
  busy: boolean;
  // shown under the slide grid, above the Make video button
  beforeAction?: React.ReactNode;
};

const MAX_PDF_BYTES = 50 * 1024 * 1024;
function Thumb({
  index,
  src,
  ratio,
  selected,
  onVisible,
  onSelect,
}: {
  index: number;
  src?: string;
  ratio: number;
  selected: boolean;
  onVisible: (i: number) => void;
  onSelect: (i: number) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  // render this page only once it is near the viewport
  useEffect(() => {
    if (src || !ref.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          onVisible(index);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [src, index, onVisible]);

  return (
    <button
      ref={ref}
      onClick={() => onSelect(index)}
      aria-pressed={selected}
      aria-label={`Slide ${index + 1}`}
      className={`group relative rounded-2xl bg-white p-1.5 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
        selected
          ? "shadow-[0_12px_30px_-14px_rgba(17,17,17,0.5)] ring-[3px] ring-ink"
          : "ring-1 ring-line hover:-translate-y-0.5 hover:ring-ink/30"
      }`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- thumbnails are data URLs made in the browser
        <img src={src} alt="" className="block w-full rounded-xl" style={{ aspectRatio: ratio }} />
      ) : (
        <div className="w-full animate-pulse rounded-xl bg-[#f1f1f4]" style={{ aspectRatio: ratio }} />
      )}
      <span
        className={`absolute bottom-3 left-3 rounded-full px-2 py-0.5 text-xs font-semibold ${
          selected ? "bg-ink text-white" : "bg-white/90 text-ink"
        }`}
      >
        {index + 1}
      </span>
      {selected && (
        <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-butter ring-2 ring-ink">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
            <path d="m5 12 5 5 9-10" fill="none" stroke="#111" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
    </button>
  );
}

export default function PdfPicker({ onPick, busy, beforeAction }: Props) {
  // the open PDF and its thumbnails are shared with the rest of /app, so they survive moving between pages
  const { deck, setDeck, thumbs, setThumb, requested } = useDeck();
  const numPages = deck?.numPages ?? 0;
  const ratio = deck?.ratio ?? 4 / 3;
  const fileName = deck?.fileName ?? "";
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  useEffect(() => {
    pdfRef.current = deck?.pdf ?? null;
  }, [deck]);
  const [selected, setSelected] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // stable across renders, so thumbnails don't re-observe on every state change
  const renderThumb = useCallback(async (i: number) => {
    const pdf = pdfRef.current;
    if (!pdf || requested.current.has(i)) return;
    requested.current.add(i);
    try {
      const url = await renderPage(pdf, i + 1, 240, 0.6);
      // ignore results from a PDF that has since been replaced
      if (pdfRef.current === pdf) setThumb(i, url);
    } catch {
      requested.current.delete(i);
    }
  }, [requested, setThumb]);

  async function loadFile(file: File) {
    setDeck(null);
    setSelected(null);

    if (file.type && file.type !== "application/pdf") {
      setStatus("That file isn't a PDF. Export your slides as a PDF and try again.");
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      const mb = (file.size / 1024 / 1024).toFixed(0);
      setStatus(`That PDF is ${mb} MB, and the limit is 50 MB. Try exporting just the slides you need, or compressing the PDF.`);
      return;
    }

    setStatus("Reading your slides on this device…");

    try {
      // loaded here, in the browser only, because pdf.js needs browser APIs
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();

      const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;

      // page 1's shape sizes the placeholders, so the grid doesn't jump as thumbnails arrive
      const first = (await pdf.getPage(1)).getViewport({ scale: 1 });
      setDeck({ pdf, fileName: file.name, numPages: pdf.numPages, ratio: first.width / first.height });
      setStatus("");
    } catch {
      setStatus("Could not open that PDF. Try exporting your slides to PDF again.");
    }
  }

  function onInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // so choosing the same file again still fires
    if (file) loadFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && !busy) loadFile(file);
  }

  async function makeVideo() {
    if (selected === null || !pdfRef.current) return;
    const image = await renderForModel(pdfRef.current, selected + 1);
    if (!image) return setStatus("That slide is too detailed to send. Try a different slide.");
    const thumbnail = thumbs[selected] ?? (await renderPage(pdfRef.current, selected + 1, 240, 0.6));
    onPick(image, "image/jpeg", selected, thumbnail);
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center gap-4 rounded-[28px] border-2 border-dashed px-6 py-10 text-center transition-colors sm:flex-row sm:justify-between sm:py-7 sm:text-left ${
          dragging ? "border-ink bg-butter/40" : "border-line bg-sky/40"
        }`}
      >
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white shadow-sm">
            <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
              <path d="M7 3h7l5 5v13H7z" fill="none" stroke="#111" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M14 3v5h5M10 14l2.5-2.5L15 14m-2.5-2.5V18" fill="none" stroke="#111" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <p className="text-lg font-semibold">{fileName || "Drop your lecture PDF here"}</p>
            <p className="text-sm text-muted">
              {fileName ? `${numPages} slides · tap one below` : "Up to 50 MB. It never leaves your device."}
            </p>
          </div>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="h-11 shrink-0 rounded-full bg-ink px-5 text-[15px] font-medium text-white transition-colors hover:bg-black/80 disabled:cursor-not-allowed disabled:bg-ink/40"
        >
          {fileName ? "Choose another PDF" : "Choose a PDF"}
        </button>
        <input ref={inputRef} type="file" accept="application/pdf" onChange={onInput} disabled={busy} className="sr-only" />
      </div>

      {status && (
        <p role="status" className="mt-4 rounded-2xl bg-[#fafafa] px-5 py-3 text-muted">
          {status}
        </p>
      )}

      {numPages > 0 && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
            {Array.from({ length: numPages }, (_, i) => (
              <Thumb
                key={i}
                index={i}
                src={thumbs[i]}
                ratio={ratio}
                selected={selected === i}
                onVisible={renderThumb}
                onSelect={setSelected}
              />
            ))}
          </div>

          {beforeAction && <div className="mt-6">{beforeAction}</div>}

          {/* stays in reach while scrolling a long deck */}
          <div className="sticky bottom-4 z-10 mt-6 flex justify-center">
            <button
              onClick={makeVideo}
              disabled={selected === null || busy}
              className="h-14 rounded-full bg-ink px-7 text-base font-medium text-white shadow-[0_16px_40px_-16px_rgba(17,17,17,0.6)] transition-colors hover:bg-black/80 disabled:cursor-not-allowed disabled:bg-[#a1a1aa]"
            >
              {busy ? "Building your video…" : selected === null ? "Pick a slide first" : `Make video from slide ${selected + 1}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
