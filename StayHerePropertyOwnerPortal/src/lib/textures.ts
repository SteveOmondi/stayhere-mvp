import * as THREE from "three";

const cache = new Map<string, THREE.CanvasTexture>();

/** Procedural tile-floor texture (light grout-lined squares), cached by tint so repeated
 * rooms of the same floor type share one GPU upload instead of re-generating per room. */
export function getFloorTileTexture(tint: string): THREE.CanvasTexture {
  const cached = cache.get(tint);
  if (cached) return cached;

  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "rgba(90,70,50,0.25)";
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, size - 3, size - 3);
  // subtle diagonal sheen so flat tiles don't read as a flat color swatch
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, "rgba(255,255,255,0.08)");
  gradient.addColorStop(1, "rgba(0,0,0,0.05)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  cache.set(tint, texture);
  return texture;
}
