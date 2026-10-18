import imageCompression from "browser-image-compression";

const MAX_SIZE_MB = 1.5;       // hard ceiling the library will iterate toward
const MAX_LONG_EDGE_PX = 2000; // matches MainManagementPortal's listingImages.ts convention
const QUALITY = 0.82;

/**
 * Compresses an image File for upload: resizes to a max long edge, re-encodes as WebP, runs off
 * the main thread via a Web Worker so large phone photos don't freeze the UI. This is the only
 * version of the image that ever reaches R2 - there's no separate "decompress" step needed, since
 * a browser's <img> tag already decodes WebP/JPEG natively and for free whenever it renders one.
 *
 * Non-image files, or any file the browser can't decode (e.g. HEIC in browsers with no HEIC canvas
 * support), pass through UNCHANGED rather than throwing - an upload should never hard-fail just
 * because compression couldn't run.
 */
export async function compressImageFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: MAX_SIZE_MB,
      maxWidthOrHeight: MAX_LONG_EDGE_PX,
      initialQuality: QUALITY,
      useWebWorker: true,
      fileType: "image/webp",
    });
    // Rename so the extension matches the new format - getPresignedUrl/R2's BuildFileKey derive
    // the stored key from this filename, and the PUT's Content-Type header must match it exactly.
    const newName = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return new File([compressed], newName, { type: "image/webp" });
  } catch (err) {
    console.warn("Image compression failed, uploading original file instead:", err);
    return file;
  }
}
