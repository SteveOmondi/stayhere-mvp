import * as THREE from "three";

const cache = new Map<string, THREE.CanvasTexture>();
let sharedRoughnessMap: THREE.CanvasTexture | null = null;

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Grayscale speckle noise shared by every floor/wall material as a roughnessMap - without this,
 * meshStandardMaterial's specular highlight is perfectly uniform across a whole wall/floor, which
 * reads as "plastic CG render" under the new Environment lighting. A real painted/tiled surface
 * has microscopic variation in how it catches light; this fakes that cheaply (one shared 256x256
 * texture, reused everywhere - no additional cost per room). */
function getSharedRoughnessMap(): THREE.CanvasTexture {
  if (sharedRoughnessMap) return sharedRoughnessMap;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const rand = mulberry32(1337);
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = 150 + Math.floor(rand() * 90);
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v;
    img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  sharedRoughnessMap = texture;
  return texture;
}

/** Procedural tile-floor texture (grout-lined squares with per-tile tone variation + speckle),
 * cached by tint so repeated rooms of the same floor type share one GPU upload instead of
 * re-generating per room. 256px (up from 128) since walk mode's close-up camera makes a low-res
 * tile pattern read as blurry/pixelated in a way the orbiting view's camera distance never exposed. */
export function getFloorTileTexture(tint: string): THREE.CanvasTexture {
  const cached = cache.get(tint);
  if (cached) return cached;

  const size = 256;
  const tilePx = size / 4; // 4x4 tiles per texture repeat
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const rand = mulberry32(hashString(tint));

  for (let ty = 0; ty < 4; ty++) {
    for (let tx = 0; tx < 4; tx++) {
      const x = tx * tilePx;
      const y = ty * tilePx;
      const toneShift = (rand() - 0.5) * 14;
      ctx.fillStyle = shiftTone(tint, toneShift);
      ctx.fillRect(x, y, tilePx, tilePx);
      ctx.strokeStyle = "rgba(90,70,50,0.28)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, tilePx - 2, tilePx - 2);
    }
  }

  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, "rgba(255,255,255,0.08)");
  gradient.addColorStop(1, "rgba(0,0,0,0.06)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  cache.set(tint, texture);
  return texture;
}

export function getFloorRoughnessMap(): THREE.CanvasTexture {
  return getSharedRoughnessMap();
}

/** Subtle painted-plaster wall texture: soft blotchy tone variation + fine speckle, no visible
 * repeating grid (unlike the floor tiles) since wall pieces vary in length and each gets its own
 * 0-1 UV range - a pattern with an obvious repeat unit would look misaligned/stretched differently
 * per wall segment, but unstructured noise tolerates that without looking wrong. */
export function getWallPlasterTexture(tint: string): THREE.CanvasTexture {
  const key = `wall:${tint}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, size, size);

  const rand = mulberry32(hashString(key));
  // Soft low-frequency blotches (paint tone variation)
  for (let i = 0; i < 40; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 18 + rand() * 40;
    const shade = (rand() - 0.5) * 10;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, shiftTone(tint, shade, 0.12));
    grad.addColorStop(1, shiftTone(tint, 0, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Fine speckle for close-up micro-detail
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < size * size; i++) {
    const speck = (rand() - 0.5) * 10;
    img.data[i * 4] = clamp255(img.data[i * 4] + speck);
    img.data[i * 4 + 1] = clamp255(img.data[i * 4 + 1] + speck);
    img.data[i * 4 + 2] = clamp255(img.data[i * 4 + 2] + speck);
  }
  ctx.putImageData(img, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, texture);
  return texture;
}

export function getWallRoughnessMap(): THREE.CanvasTexture {
  return getSharedRoughnessMap();
}

function clamp255(v: number): number {
  return Math.max(0, Math.min(255, v));
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

function shiftTone(hex: string, amount: number, alphaOverride?: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = clamp255(((n >> 16) & 0xff) + amount);
  const g = clamp255(((n >> 8) & 0xff) + amount);
  const b = clamp255((n & 0xff) + amount);
  if (alphaOverride !== undefined) return `rgba(${r},${g},${b},${alphaOverride})`;
  return `rgb(${r},${g},${b})`;
}
