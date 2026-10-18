import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { WallCollider } from "../../lib/wallColliders";
import { raycastWallColliders } from "../../lib/wallColliders";
import { walkRuntime } from "../../lib/walkRuntime";
import { useLayoutStore } from "../../store/layoutStore";

const CHEST_HEIGHT = 1.4;
const DEFAULT_DISTANCE_MIN = 1.4;
const DEFAULT_DISTANCE_MAX = 7;
const DEFAULT_THIRD_PERSON_DISTANCE = 4.2;
const CAMERA_CLEARANCE = 0.35;
const FIRST_PERSON_DISTANCE = 0.05;
/** How fast the camera re-centers behind the character's facing once they start moving and the
 * player isn't actively mouse-dragging - an exponential rate, so ~90% of the way there in ~0.5-0.6s,
 * matching the settle time GTA5/most third-person games use for this "soft lock" behavior. */
const AUTO_FOLLOW_LERP_PER_SECOND = 2.6;
/** A room-scale indoor camera needs a much wider field of view than the orbiting product-shot
 * camera (45deg) - at 45deg, a follow distance close enough to fit in a small room makes the
 * character loom over the frame and the room read as cramped/impossible to navigate. 70deg matches
 * the FOV range typical third-person games (GTA5 included) use for exactly this reason. Restored
 * to the Canvas's original FOV on unmount so view/organize mode's camera is unaffected. */
const WALK_FOV = 70;

interface Props {
  colliders: WallCollider[];
  firstPerson: boolean;
}

/**
 * Third-person "GTA5-style" follow camera: mouse-drag orbits around the character (reusing drei's
 * OrbitControls for its already-proven damped drag/zoom feel), its target synced to the character's
 * live position every frame. WASD movement is relative to wherever this camera is currently
 * looking FROM (see WalkCharacter, which reads walkRuntime.cameraAzimuth) - so turning the camera
 * is how you steer, exactly like GTA5/most third-person games.
 *
 * Auto-follow: pressing A/D turns the CHARACTER to face the new movement direction immediately,
 * but without this, the camera itself only ever rotates via an explicit mouse drag - so the
 * character would visibly spin away from a camera that just sits still, reading as "the character
 * just changes direction" instead of a controlled turn. Whenever the character is moving and the
 * player isn't actively dragging the mouse to orbit, the camera smoothly re-centers in behind the
 * character's current facing (walkRuntime.characterFacingYaw) - the same "soft lock" every
 * GTA5-style third-person camera does, so A/D reads as steering, not spinning in place.
 *
 * Wall occlusion: each frame, raycasts from the character's chest toward the camera's own current
 * orbit distance and, if a wall is in the way, clamps maxDistance down to just short of that hit
 * for this frame only (restored next frame once clear) - a simple, cheap "spring arm" pull-in that
 * needs no new physics/collision engine, reusing the exact wall colliders the character already
 * collides against.
 *
 * First-person is the same rig at (near) zero distance with the character mesh hidden by the
 * caller - not a separate camera system.
 */
export function WalkCameraRig({ colliders, firstPerson }: Props) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const hasPositioned = useRef(false);
  const isUserOrbitingRef = useRef(false);
  const listenersAttachedRef = useRef(false);
  const draggingId = useLayoutStore((s) => s.draggingId);

  useEffect(() => {
    hasPositioned.current = false;
    const originalFov = camera.fov;
    camera.fov = WALK_FOV;
    camera.updateProjectionMatrix();
    return () => {
      camera.fov = originalFov;
      camera.updateProjectionMatrix();
    };
  }, [camera]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (!listenersAttachedRef.current) {
      // OrbitControls dispatches these around its own internal pointerdown/up handling - used to
      // tell "the player is actively dragging to look around" apart from "nothing is overriding
      // the camera right now", so auto-follow never fights an active manual drag.
      controls.addEventListener("start", () => {
        isUserOrbitingRef.current = true;
      });
      controls.addEventListener("end", () => {
        isUserOrbitingRef.current = false;
      });
      listenersAttachedRef.current = true;
    }

    const target = new THREE.Vector3(
      walkRuntime.characterPosition.x,
      CHEST_HEIGHT,
      walkRuntime.characterPosition.z,
    );
    controls.target.copy(target);

    if (!hasPositioned.current) {
      // First frame after entering walk mode: snap the camera in behind the character instead of
      // lerping from wherever the orbit/organize camera happened to be - that jump would be
      // disorienting the instant you click "Walk through".
      camera.position.set(target.x, target.y + 0.6, target.z + (firstPerson ? 0.01 : DEFAULT_THIRD_PERSON_DISTANCE));
      hasPositioned.current = true;
    }

    if (!firstPerson && !isUserOrbitingRef.current && walkRuntime.isMoving) {
      const currentAzimuth = controls.getAzimuthalAngle();
      const desiredAzimuth = walkRuntime.characterFacingYaw;
      let diff = desiredAzimuth - currentAzimuth;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const alpha = Math.min(1, AUTO_FOLLOW_LERP_PER_SECOND * delta);
      const newAzimuth = currentAzimuth + diff * alpha;
      const polar = controls.getPolarAngle();
      const radius = camera.position.distanceTo(target);
      const sinPhi = Math.sin(polar);
      camera.position.set(
        target.x + radius * sinPhi * Math.sin(newAzimuth),
        target.y + radius * Math.cos(polar),
        target.z + radius * sinPhi * Math.cos(newAzimuth),
      );
    }

    walkRuntime.cameraAzimuth = controls.getAzimuthalAngle();

    if (firstPerson) {
      controls.minDistance = FIRST_PERSON_DISTANCE;
      controls.maxDistance = FIRST_PERSON_DISTANCE;
      controls.update();
      return;
    }

    controls.minDistance = DEFAULT_DISTANCE_MIN;

    const dir = new THREE.Vector3().subVectors(camera.position, target);
    const dist = dir.length();
    let allowedMax = DEFAULT_DISTANCE_MAX;
    if (dist > 1e-4) {
      dir.normalize();
      const hit = raycastWallColliders(target.x, target.z, dir.x, dir.z, DEFAULT_DISTANCE_MAX, colliders);
      if (hit !== null) allowedMax = Math.max(DEFAULT_DISTANCE_MIN, hit - CAMERA_CLEARANCE);
    }
    controls.maxDistance = allowedMax;
    controls.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={!draggingId}
      enablePan={false}
      enableZoom={!firstPerson}
      minPolarAngle={0.3}
      maxPolarAngle={Math.PI / 2.05}
      rotateSpeed={0.6}
    />
  );
}
