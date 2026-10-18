/** Real, textured furniture models (CC0 - Poly Haven, https://polyhaven.com, public domain, no
 * attribution required) swapped in for a subset of the procedural box-based catalog items. Scale
 * and rotationYOffset were derived by downloading each asset and computing its true world-space
 * bounding box directly from the glTF's own accessor min/max (reliable for these - static,
 * unskinned meshes, unlike the walk-mode character assets' skinned-mesh scale problem), then
 * comparing against this catalog item's existing footprint/height fields. A handful of catalog
 * items (wardrobe, bed_double, tv_unit, kitchen/bathroom fixtures) have no good CC0 match in Poly
 * Haven's furniture set and were deliberately left on the procedural renderer rather than ship a
 * visually-wrong substitute (e.g. the best "wardrobe" candidate available was a 0.68m-tall
 * sideboard, not a tall closet).
 */
export interface ExternalFurnitureAsset {
  /** Path to the .gltf (not .glb - these ship as gltf+bin+textures, preserved as-is). */
  url: string;
  /** Uniform scale bringing the asset's real-world size roughly in line with this catalog item's footprint. */
  scale: number;
  /** Baked yaw correction (radians) for assets authored with their long axis on the "wrong" side
   * relative to this catalog's [width, depth] footprint convention - verify visually; if a swapped
   * item looks sideways, flip this between +-Math.PI/2. */
  rotationYOffset?: number;
  source: string;
}

export const EXTERNAL_FURNITURE_ASSETS: Record<string, ExternalFurnitureAsset> = {
  sofa: {
    url: "/models/furniture/sofa_02/sofa_02_1k.gltf",
    scale: 1.1,
    source: "CC0 - polyhaven.com/a/sofa_02",
  },
  armchair: {
    url: "/models/furniture/modern_arm_chair_01/modern_arm_chair_01_1k.gltf",
    scale: 0.95,
    source: "CC0 - polyhaven.com/a/modern_arm_chair_01",
  },
  coffee_table: {
    url: "/models/furniture/modern_coffee_table_01/modern_coffee_table_01_1k.gltf",
    scale: 0.83,
    rotationYOffset: Math.PI / 2,
    source: "CC0 - polyhaven.com/a/modern_coffee_table_01",
  },
  dining_table: {
    url: "/models/furniture/dining_table/dining_table_1k.gltf",
    scale: 0.68,
    source: "CC0 - polyhaven.com/a/dining_table",
  },
  dining_chair: {
    url: "/models/furniture/dining_chair_02/dining_chair_02_1k.gltf",
    scale: 0.9,
    source: "CC0 - polyhaven.com/a/dining_chair_02",
  },
};
