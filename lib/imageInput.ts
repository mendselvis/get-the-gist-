// Turning an uploaded screenshot or photo into the JPEGs the app sends and shows, in the browser.

import { dataUrlBytes } from "@/lib/pdfRender";

export const MAX_IMAGE_BYTES = 30 * 1024 * 1024;
export const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/heic,image/heif,.heic,.heif";

const MAX_JPEG_BYTES = 1024 * 1024;
// tried in order until the image fits under MAX_JPEG_BYTES; the first almost always does
const ENCODINGS = [
  { side: 1024, quality: 0.75 },
  { side: 800, quality: 0.6 },
];
const THUMB_WIDTH = 240;

const IMAGE_EXT = /\.(png|jpe?g|webp|heic|heif)$/i;

export function isImageFile(file: File) {
  return file.type.startsWith("image/") || IMAGE_EXT.test(file.name);
}

function isHeic(file: File) {
  return /^image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

function loadImg(blob: Blob) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("could not decode image"));
    };
    img.src = url;
  });
}

// Browsers apply a photo's EXIF orientation when they decode it into an <img>, and canvas draws it that
// way up, so phone photos come out the right way round. Safari decodes HEIC itself; elsewhere it is
// converted to JPEG first, loading the converter only when needed.
async function decode(file: File) {
  try {
    return await loadImg(file);
  } catch (err) {
    if (!isHeic(file)) throw err;
    const { heicTo } = await import("heic-to");
    return loadImg(await heicTo({ blob: file, type: "image/jpeg", quality: 0.92 }));
  }
}

function toJpeg(img: HTMLImageElement, width: number, height: number, quality: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext("2d")!;
  // a transparent screenshot would otherwise turn black in JPEG
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL("image/jpeg", quality);
  canvas.width = canvas.height = 0; // free the canvas memory straight away
  return url;
}

export type PreparedImage = {
  image: string; // base64 JPEG for the model, at most 1024px on the long side
  thumbnail: string; // small JPEG data URL, like a PDF page thumbnail
  ratio: number;
};

// null if even the smallest encoding is over 1 MB
export async function prepareImage(file: File): Promise<PreparedImage | null> {
  const img = await decode(file);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const thumbnail = toJpeg(img, THUMB_WIDTH, (THUMB_WIDTH * h) / w, 0.6);
  for (const { side, quality } of ENCODINGS) {
    // never upscale a small screenshot
    const scale = Math.min(1, side / Math.max(w, h));
    const url = toJpeg(img, w * scale, h * scale, quality);
    if (dataUrlBytes(url) <= MAX_JPEG_BYTES) return { image: url.split(",")[1], thumbnail, ratio: w / h };
  }
  return null;
}
