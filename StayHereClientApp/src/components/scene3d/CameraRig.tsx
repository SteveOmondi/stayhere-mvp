import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useLayoutStore } from "../../store/layoutStore";
import { roomCameraView, type FloorPlanScene } from "../../lib/floorPlanGeometry";

interface Props {
  listing: FloorPlanScene;
  defaultPos: [number, number, number];
  defaultTarget: [number, number, number];
}

const ARRIVE_EPSILON = 0.05;
/** lerp-per-second rate; frame-rate independent. */
const LERP_RATE_PER_SECOND = 5;

export function CameraRig({ listing, defaultPos, defaultTarget }: Props) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const camera = useThree((s) => s.camera);
  const activeHotspotId = useLayoutStore((s) => s.activeHotspotId);
  const draggingId = useLayoutStore((s) => s.draggingId);
  const targetPos = useRef(new THREE.Vector3(...defaultPos));
  const targetLook = useRef(new THREE.Vector3(...defaultTarget));
  const isAnimating = useRef(false);
  const hasMounted = useRef(false);

  useEffect(() => {
    const hs = listing.hotspots.find((h) => h.id === activeHotspotId);
    const room = hs ? listing.rooms.find((r) => r.id === hs.roomId) : undefined;
    if (room) {
      const { cameraPos, target } = roomCameraView(room.points);
      targetPos.current.set(...cameraPos);
      targetLook.current.set(...target);
    } else {
      targetPos.current.set(...defaultPos);
      targetLook.current.set(...defaultTarget);
    }

    if (!hasMounted.current) {
      hasMounted.current = true;
      camera.position.copy(targetPos.current);
      if (controlsRef.current) {
        controlsRef.current.target.copy(targetLook.current);
        controlsRef.current.update();
      }
      isAnimating.current = false;
    } else {
      isAnimating.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeHotspotId, listing, defaultPos, defaultTarget]);

  useFrame(({ camera }, delta) => {
    if (!isAnimating.current) return;
    const alpha = 1 - Math.exp(-LERP_RATE_PER_SECOND * delta);
    camera.position.lerp(targetPos.current, alpha);
    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetLook.current, alpha);
      controlsRef.current.update();
    }
    const posArrived = camera.position.distanceTo(targetPos.current) < ARRIVE_EPSILON;
    const lookArrived = !controlsRef.current || controlsRef.current.target.distanceTo(targetLook.current) < ARRIVE_EPSILON;
    if (posArrived && lookArrived) {
      isAnimating.current = false;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={!draggingId}
      enablePan={false}
      minDistance={1.2}
      maxDistance={30}
      maxPolarAngle={Math.PI / 2.05}
      onStart={() => {
        isAnimating.current = false;
      }}
    />
  );
}
