/** Matches PropertyService listing image limit. */
export const MAX_LISTING_IMAGES = 15;
const MAX_DATA_URL_CHARS = 950_000;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ""));
    r.onerror = () => reject(new Error("Could not read file"));
    r.readAsDataURL(file);
  });
}

/** Resize to max width/height and export JPEG data URL for smaller JSON payloads. */
export async function compressImageFileToJpegDataUrl(
  file: File,
  maxSide: number,
  quality: number
): Promise<string> {
  const dataUrl = await readFileAsDataUrl(file);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Invalid image"));
    img.src = dataUrl;
  });

  let { width, height } = img;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  width = Math.round(width * scale);
  height = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");
  ctx.drawImage(img, 0, 0, width, height);
  const jpeg = canvas.toDataURL("image/jpeg", quality);
  if (jpeg.length > MAX_DATA_URL_CHARS) {
    return canvas.toDataURL("image/jpeg", Math.max(0.5, quality - 0.15));
  }
  return jpeg;
}

/** Turn uploaded image files into data URLs (max 15). Non-images skipped. */
export async function filesToListingImageDataUrls(files: FileList | File[]): Promise<string[]> {
  const list = Array.from(files).slice(0, MAX_LISTING_IMAGES);
  const out: string[] = [];
  for (const file of list) {
    if (!file.type.startsWith("image/")) continue;
    const url = await compressImageFileToJpegDataUrl(file, 2000, 0.82);
    if (url.length > MAX_DATA_URL_CHARS) {
      throw new Error(
        `Image "${file.name}" is too large after compression. Use a smaller photo or add an HTTPS URL instead.`
      );
    }
    out.push(url);
    if (out.length >= MAX_LISTING_IMAGES) break;
  }
  return out;
}

/** Split textarea / lines into https URLs, cap at 15. */
export function parseImageUrlLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s))
    .slice(0, MAX_LISTING_IMAGES);
}
