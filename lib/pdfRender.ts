import type { PDFDocumentProxy } from "pdfjs-dist";

// Rendering PDF pages in the browser, shared by the slide picker and saved sessions.

const MAX_JPEG_BYTES = 1024 * 1024;

// tried in order until the slide JPEG fits under MAX_JPEG_BYTES
const ENCODINGS = [
  { width: 1500, quality: 0.85 },
  { width: 1500, quality: 0.7 },
  { width: 1200, quality: 0.7 },
  { width: 1000, quality: 0.6 },
  { width: 800, quality: 0.5 },
];

// draw one page to a canvas at the given width and return a JPEG data URL
export async function renderPage(pdf: PDFDocumentProxy, pageNumber: number, width: number, quality: number) {
  const page = await pdf.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: width / base.width });

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvas, viewport }).promise;
  const url = canvas.toDataURL("image/jpeg", quality);
  canvas.width = canvas.height = 0; // free the canvas memory straight away
  return url;
}

// decoded size of a base64 data URL, without decoding it
export function dataUrlBytes(url: string) {
  const b64 = url.slice(url.indexOf(",") + 1);
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return (b64.length * 3) / 4 - padding;
}

// the page as a JPEG big enough for the model to read but always under 1 MB; null if even the smallest is too big
export async function renderForModel(pdf: PDFDocumentProxy, pageNumber: number) {
  for (const { width, quality } of ENCODINGS) {
    const url = await renderPage(pdf, pageNumber, width, quality);
    if (dataUrlBytes(url) <= MAX_JPEG_BYTES) return url.split(",")[1];
  }
  return null;
}
