import { useMemo } from "react";
import type { FurnitureCatalogItem } from "../../types/furniture";

/** Procedural low-poly furniture built from primitives (no external GLB assets). */
export function FurnitureMesh({ item }: { item: FurnitureCatalogItem }) {
  const [w, d] = item.footprint;
  const h = item.height;
  const color = item.color;

  const body = useMemo(() => {
    switch (item.id) {
      case "bed_double":
        return (
          <group>
            <mesh position={[0, h * 0.3, 0]}>
              <boxGeometry args={[w, h * 0.6, d]} />
              <meshStandardMaterial color={color} />
            </mesh>
            <mesh position={[0, h * 0.75, -d * 0.42]}>
              <boxGeometry args={[w, h * 0.5, d * 0.14]} />
              <meshStandardMaterial color="#8A6D4E" />
            </mesh>
            <mesh position={[0, h * 0.62, -d * 0.1]}>
              <boxGeometry args={[w * 0.94, h * 0.15, d * 0.35]} />
              <meshStandardMaterial color="#FFFFFF" />
            </mesh>
          </group>
        );
      case "wardrobe":
        return (
          <mesh position={[0, h / 2, 0]}>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial color={color} />
          </mesh>
        );
      case "sofa":
        return (
          <group>
            <mesh position={[0, h * 0.35, 0]}>
              <boxGeometry args={[w, h * 0.5, d]} />
              <meshStandardMaterial color={color} />
            </mesh>
            <mesh position={[0, h * 0.75, -d * 0.35]}>
              <boxGeometry args={[w, h * 0.5, d * 0.3]} />
              <meshStandardMaterial color={color} />
            </mesh>
            <mesh position={[-w * 0.46, h * 0.55, 0]}>
              <boxGeometry args={[w * 0.08, h * 0.3, d]} />
              <meshStandardMaterial color={color} />
            </mesh>
            <mesh position={[w * 0.46, h * 0.55, 0]}>
              <boxGeometry args={[w * 0.08, h * 0.3, d]} />
              <meshStandardMaterial color={color} />
            </mesh>
          </group>
        );
      case "armchair":
        return (
          <group>
            <mesh position={[0, h * 0.35, 0]}>
              <boxGeometry args={[w, h * 0.5, d]} />
              <meshStandardMaterial color={color} />
            </mesh>
            <mesh position={[0, h * 0.75, -d * 0.3]}>
              <boxGeometry args={[w, h * 0.5, d * 0.4]} />
              <meshStandardMaterial color={color} />
            </mesh>
          </group>
        );
      case "coffee_table":
      case "dining_table":
      case "dining_table_small":
        return (
          <group>
            <mesh position={[0, h * 0.92, 0]}>
              <boxGeometry args={[w, h * 0.08, d]} />
              <meshStandardMaterial color={color} />
            </mesh>
            {[
              [-1, -1],
              [1, -1],
              [-1, 1],
              [1, 1],
            ].map(([sx, sz], i) => (
              <mesh key={i} position={[(sx * w) / 2.3, h * 0.44, (sz * d) / 2.3]}>
                <cylinderGeometry args={[0.03, 0.03, h * 0.88, 8]} />
                <meshStandardMaterial color="#3F3226" />
              </mesh>
            ))}
          </group>
        );
      case "dining_chair":
        return (
          <group>
            <mesh position={[0, h * 0.45, 0]}>
              <boxGeometry args={[w, h * 0.08, d]} />
              <meshStandardMaterial color={color} />
            </mesh>
            <mesh position={[0, h * 0.75, -d * 0.42]}>
              <boxGeometry args={[w, h * 0.55, d * 0.1]} />
              <meshStandardMaterial color={color} />
            </mesh>
          </group>
        );
      case "tv_unit":
        return (
          <group>
            <mesh position={[0, h * 0.4, 0]}>
              <boxGeometry args={[w, h * 0.8, d]} />
              <meshStandardMaterial color={color} />
            </mesh>
            <mesh position={[0, h + 0.35, d * 0.3]}>
              <boxGeometry args={[w * 0.7, 0.5, 0.04]} />
              <meshStandardMaterial color="#111827" />
            </mesh>
          </group>
        );
      case "kitchen_counter":
        return (
          <group>
            <mesh position={[0, h / 2, 0]}>
              <boxGeometry args={[w, h, d]} />
              <meshStandardMaterial color={color} />
            </mesh>
            <mesh position={[0, h + 0.02, 0]}>
              <boxGeometry args={[w * 0.35, 0.05, d * 0.5]} />
              <meshStandardMaterial color="#64748B" />
            </mesh>
          </group>
        );
      case "fridge":
        return (
          <mesh position={[0, h / 2, 0]}>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial color={color} />
          </mesh>
        );
      case "stove":
        return (
          <group>
            <mesh position={[0, h / 2, 0]}>
              <boxGeometry args={[w, h, d]} />
              <meshStandardMaterial color={color} />
            </mesh>
            {[
              [-1, -1],
              [1, -1],
              [-1, 1],
              [1, 1],
            ].map(([sx, sz], i) => (
              <mesh key={i} position={[(sx * w) / 4, h + 0.01, (sz * d) / 4]}>
                <cylinderGeometry args={[0.08, 0.08, 0.02, 12]} />
                <meshStandardMaterial color="#0F172A" />
              </mesh>
            ))}
          </group>
        );
      case "toilet":
        return (
          <group>
            <mesh position={[0, h * 0.5, d * 0.15]}>
              <boxGeometry args={[w * 0.8, h, d * 0.6]} />
              <meshStandardMaterial color={color} />
            </mesh>
            <mesh position={[0, h * 1.4, -d * 0.15]}>
              <boxGeometry args={[w * 0.7, h * 0.6, d * 0.3]} />
              <meshStandardMaterial color={color} />
            </mesh>
          </group>
        );
      case "bathroom_sink":
        return (
          <group>
            <mesh position={[0, h * 0.9, 0]}>
              <boxGeometry args={[w, h * 0.15, d]} />
              <meshStandardMaterial color={color} />
            </mesh>
            <mesh position={[0, h * 0.4, 0]}>
              <cylinderGeometry args={[0.04, 0.05, h * 0.8, 8]} />
              <meshStandardMaterial color="#CBD5E1" />
            </mesh>
          </group>
        );
      case "shower":
        return (
          <group>
            <mesh position={[0, 0.03, 0]}>
              <boxGeometry args={[w, 0.06, d]} />
              <meshStandardMaterial color="#94A3B8" />
            </mesh>
            <mesh position={[0, h / 2, 0]}>
              <boxGeometry args={[w, h, d]} />
              <meshStandardMaterial color={color} transparent opacity={0.25} />
            </mesh>
          </group>
        );
      default:
        return (
          <mesh position={[0, h / 2, 0]}>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial color={color} />
          </mesh>
        );
    }
  }, [item.id, w, d, h, color]);

  return <>{body}</>;
}
