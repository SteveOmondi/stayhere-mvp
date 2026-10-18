import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { RoomPolygon, WallOpening } from "../../lib/floorPlanGeometry";
import { polygonCentroid, findEntryPoint } from "../../lib/floorPlanGeometry";
import { findUnreachableRooms } from "../../lib/roomGeometry";
import { resolveWallCollisions, type WallCollider } from "../../lib/wallColliders";
import { useWalkInput } from "../../hooks/useWalkInput";
import { walkRuntime } from "../../lib/walkRuntime";
import { joystickInput, JOYSTICK_RUN_THRESHOLD } from "../../lib/joystickInput";
import { useLayoutStore } from "../../store/layoutStore";

/** Verified via full bind-pose skeleton matrix composition (not a guess): Soldier.glb at scale=1
 * stands ~1.83m head-to-ground - an accurate, realistic adult height, not an oversized asset.
 * This is a deliberate perceptual trade-off on top of that correct baseline: in small rooms
 * (closets, bathrooms) an accurately-sized adult understandably reads as "filling the room" -
 * that's correct scale, not a bug, but a slightly smaller character is more comfortable to
 * navigate with across typical room sizes, which matters more here than strict realism. Applied
 * uniformly to the collision radius too, so the visual size and what you actually bump into stay
 * consistent with each other. */
const CHARACTER_SCALE_ADJUSTMENT = 0.85;
export const CHARACTER_RADIUS = 0.28 * CHARACTER_SCALE_ADJUSTMENT;
// Noticeably slower than before (was 1.6/3.2 m/s) - deliberately a bit more restrained than real
// human walking/running pace, since a joystick or arrow-key tap covering a lot of ground in one
// press reads as imprecise/hard to control, especially over short in-room distances.
const WALK_SPEED = 1.1; // m/s
const RUN_SPEED = 2.1; // m/s
/** Input doesn't snap straight to full speed - it eases in/out over this many seconds, so a single
 * key tap or a small joystick nudge moves a little rather than lurching at full pace instantly. */
const INPUT_SMOOTHING_SECONDS = 0.18;
const TURN_RATE_PER_SECOND = 10;
const CLIP_CROSSFADE_SECONDS = 0.3;

export type MotionState = "idle" | "walk" | "run";

interface CharacterAsset {
  url: string;
  clips: Record<MotionState, string>;
  /** One-line scale correction if the model reads too big/small in-browser - these two specific
   * files are used AS-IS (no manual rescaling) in three.js's own official animation examples, so
   * this starts at 1; static analysis of a SKINNED mesh's raw accessor bounds can't reliably
   * predict final rendered size (the skeleton's joint transforms determine it, not the mesh's bind-
   * pose vertex data alone - confirmed empirically before writing this), so this needs an actual
   * look in a browser, not a calculation, to tune if needed. */
  scale: number;
  yOffset: number;
}

export interface CharacterOption {
  id: string;
  label: string;
  bodyColor: string;
  headColor: string;
  /** Omitted = use the procedural primitive placeholder below instead of a real rigged model. */
  asset?: CharacterAsset;
}

export const CHARACTER_OPTIONS: CharacterOption[] = [
  {
    id: "xbot",
    label: "Alex",
    bodyColor: "#3b4a5a",
    headColor: "#c99b73",
    asset: {
      url: "/models/characters/Xbot.glb",
      clips: { idle: "idle", walk: "walk", run: "run" },
      scale: CHARACTER_SCALE_ADJUSTMENT,
      yOffset: 0,
    },
  },
  {
    id: "soldier",
    label: "Jordan",
    bodyColor: "#44515f",
    headColor: "#c99b73",
    asset: {
      url: "/models/characters/Soldier.glb",
      clips: { idle: "Idle", walk: "Walk", run: "Run" },
      scale: CHARACTER_SCALE_ADJUSTMENT,
      yOffset: 0,
    },
  },
  {
    id: "robot",
    label: "Rex",
    bodyColor: "#8a94a6",
    headColor: "#c9a227",
    asset: {
      url: "/models/characters/RobotExpressive.glb",
      clips: { idle: "Idle", walk: "Walking", run: "Running" },
      scale: CHARACTER_SCALE_ADJUSTMENT,
      yOffset: 0,
    },
  },
  { id: "amber", label: "Amara", bodyColor: "#c9972e", headColor: "#e8c48b" },
  { id: "violet", label: "Vivian", bodyColor: "#6b4e9e", headColor: "#d9a776" },
];

useGLTF.preload("/models/characters/Xbot.glb");
useGLTF.preload("/models/characters/Soldier.glb");
useGLTF.preload("/models/characters/RobotExpressive.glb");

/** Real rigged character: loads the glTF once (cached/shared across instances by useGLTF), plays
 * idle/walk/run via three.js's own AnimationMixer (drei's useAnimations wires the mixer into r3f's
 * render loop automatically), crossfading between clips as motionRef changes. This never drives
 * position/rotation - the group it's nested inside (see WalkCharacter below) owns that entirely, so
 * swapping or adding more characters here never touches the movement/collision code at all. */
function AnimatedCharacterMesh({ asset, motionRef }: { asset: CharacterAsset; motionRef: React.RefObject<MotionState> }) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(asset.url);
  const { actions } = useAnimations(animations, group);
  const currentMotion = useRef<MotionState | null>(null);

  // Plain Object3D.clone() deep-clones the node hierarchy but does NOT rebind a SkinnedMesh's
  // skeleton to the cloned bones - it ends up pointing at the original skeleton, which renders
  // as invisible/degenerate (collapsed bounding box) for a rigged character. SkeletonUtils.clone
  // is the three.js-documented fix: it clones bones and skinned meshes together, correctly
  // re-binding each clone's skeleton to its own bone hierarchy.
  const clonedScene = useMemo(() => cloneSkeleton(scene), [scene]);

  useEffect(() => {
    const idleAction = actions[asset.clips.idle];
    idleAction?.reset().play();
    currentMotion.current = "idle";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions]);

  useFrame(() => {
    const next = motionRef.current ?? "idle";
    const prev = currentMotion.current;
    if (next === prev) return;
    const from = prev ? actions[asset.clips[prev]] : null;
    const to = actions[asset.clips[next]];
    if (to) {
      to.reset().fadeIn(CLIP_CROSSFADE_SECONDS).play();
      from?.fadeOut(CLIP_CROSSFADE_SECONDS);
    }
    currentMotion.current = next;
  });

  return (
    <group ref={group} scale={asset.scale} position={[0, asset.yOffset, 0]}>
      <primitive object={clonedScene} />
    </group>
  );
}

/** Darkens a hex color by the given fraction (0-1) - used to derive a "pants" tone from
 * bodyColor so legs read as clothing instead of reusing the skin-tone headColor. */
function darken(hex: string, amount: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.floor(((n >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.floor(((n >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.floor((n & 0xff) * (1 - amount)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/** Placeholder character - procedural primitives in the same spirit as FurnitureMesh.tsx, for
 * character slots that don't have a real rigged asset yet. Built as distinct, non-overlapping
 * body parts (legs / torso / arms / head, ~1.7m total) rather than one blob capsule with leg boxes
 * buried inside it, with arms swinging opposite the legs for a recognizable walk cycle instead of
 * a static torso. */
function PrimitiveCharacterMesh({ option, motionRef }: { option: CharacterOption; motionRef: React.RefObject<MotionState> }) {
  const legRef = useRef<THREE.Group>(null);
  const legRef2 = useRef<THREE.Group>(null);
  const armRef = useRef<THREE.Group>(null);
  const armRef2 = useRef<THREE.Group>(null);

  const pantsColor = useMemo(() => darken(option.bodyColor, 0.45), [option.bodyColor]);

  useFrame(({ clock }) => {
    const swing = motionRef.current !== "idle" ? Math.sin(clock.elapsedTime * 8) * 0.5 : 0;
    if (legRef.current) legRef.current.rotation.x = swing;
    if (legRef2.current) legRef2.current.rotation.x = -swing;
    if (armRef.current) armRef.current.rotation.x = -swing * 0.7;
    if (armRef2.current) armRef2.current.rotation.x = swing * 0.7;
  });

  const HIP_Y = 0.85;
  const SHOULDER_Y = 1.42;
  const HEAD_Y = 1.62;

  return (
    <group scale={CHARACTER_SCALE_ADJUSTMENT}>
      {/* legs - hip to ankle, pants-colored */}
      <group ref={legRef} position={[-0.1, HIP_Y, 0]}>
        <mesh position={[0, -HIP_Y / 2, 0]} castShadow>
          <capsuleGeometry args={[0.07, HIP_Y - 0.14, 4, 8]} />
          <meshStandardMaterial color={pantsColor} roughness={0.75} />
        </mesh>
      </group>
      <group ref={legRef2} position={[0.1, HIP_Y, 0]}>
        <mesh position={[0, -HIP_Y / 2, 0]} castShadow>
          <capsuleGeometry args={[0.07, HIP_Y - 0.14, 4, 8]} />
          <meshStandardMaterial color={pantsColor} roughness={0.75} />
        </mesh>
      </group>

      {/* torso - hip to shoulders, shirt-colored */}
      <mesh position={[0, (HIP_Y + SHOULDER_Y) / 2, 0]} castShadow>
        <capsuleGeometry args={[0.19, SHOULDER_Y - HIP_Y - 0.1, 4, 8]} />
        <meshStandardMaterial color={option.bodyColor} roughness={0.6} />
      </mesh>

      {/* arms - shoulder to wrist, shirt-colored with skin-tone hands */}
      <group ref={armRef} position={[-0.27, SHOULDER_Y - 0.05, 0]}>
        <mesh position={[0, -0.22, 0]} castShadow>
          <capsuleGeometry args={[0.055, 0.3, 4, 8]} />
          <meshStandardMaterial color={option.bodyColor} roughness={0.6} />
        </mesh>
        <mesh position={[0, -0.42, 0]} castShadow>
          <sphereGeometry args={[0.055, 8, 8]} />
          <meshStandardMaterial color={option.headColor} roughness={0.5} />
        </mesh>
      </group>
      <group ref={armRef2} position={[0.27, SHOULDER_Y - 0.05, 0]}>
        <mesh position={[0, -0.22, 0]} castShadow>
          <capsuleGeometry args={[0.055, 0.3, 4, 8]} />
          <meshStandardMaterial color={option.bodyColor} roughness={0.6} />
        </mesh>
        <mesh position={[0, -0.42, 0]} castShadow>
          <sphereGeometry args={[0.055, 8, 8]} />
          <meshStandardMaterial color={option.headColor} roughness={0.5} />
        </mesh>
      </group>

      {/* head + simple hair cap */}
      <mesh position={[0, HEAD_Y, 0]} castShadow>
        <sphereGeometry args={[0.13, 14, 14]} />
        <meshStandardMaterial color={option.headColor} roughness={0.5} />
      </mesh>
      <mesh position={[0, HEAD_Y + 0.06, 0]} castShadow>
        <sphereGeometry args={[0.135, 14, 14, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial color={darken(option.headColor, 0.75)} roughness={0.8} />
      </mesh>
    </group>
  );
}

interface Props {
  rooms: RoomPolygon[];
  openings: WallOpening[];
  colliders: WallCollider[];
  characterId: string;
}

export function WalkCharacter({ rooms, openings, colliders, characterId }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const draggingId = useLayoutStore((s) => s.draggingId);

  const entry = useMemo(() => {
    const found = findEntryPoint(rooms, openings);
    if (found) return found;
    const first = rooms[0];
    if (!first) return { position: [0, 0] as [number, number], facingYaw: 0, roomId: "" };
    const [cx, cz] = polygonCentroid(first.points);
    return { position: [cx, cz] as [number, number], facingYaw: 0, roomId: first.id };
  }, [rooms, openings]);

  useEffect(() => {
    // Dev-only diagnostic: a disconnected floor plan is otherwise silent - nothing in the 3D scene
    // itself can tell you "this room has no door," only a player wandering into a dead end (as
    // reported: living room only reaching a bedroom and closet, no way to the rest of the unit).
    // This checks the SAME door connectivity the walkthrough itself uses, so it reports exactly
    // what you'd hit by walking it, immediately and in detail, instead of by exploring blind.
    if (import.meta.env.DEV) {
      const unreachable = findUnreachableRooms(rooms, openings, entry.roomId || null);
      if (unreachable.length > 0) {
        console.warn(
          `[Walkthrough] ${unreachable.length} room(s) have no door path from the entry room ` +
            `("${entry.roomId}"): ${unreachable.map((r) => `${r.label} (${r.id})`).join(", ")}. ` +
            `This means the floor plan's digitized data has no door opening connecting them - not ` +
            `a walkthrough bug. Check this listing's stored "openings" array for a missing door on ` +
            `the wall between these rooms and the rest of the unit.`,
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, openings]);

  const yawRef = useRef(entry.facingYaw);
  const motionRef = useRef<MotionState>("idle");
  const input = useWalkInput(true);
  const smoothedInputRef = useRef({ forward: 0, strafe: 0 });

  const spawn = useMemo(() => new THREE.Vector3(entry.position[0], 0, entry.position[1]), [entry]);

  const option = CHARACTER_OPTIONS.find((c) => c.id === characterId) ?? CHARACTER_OPTIONS[0];

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    // Rearranging furniture (the in-walkthrough organizer mode) takes over mouse/drag input for
    // repositioning items - pausing movement here avoids WASD fighting with a drag in progress.
    let forward: number;
    let strafe: number;
    let running: boolean;
    if (draggingId) {
      forward = 0;
      strafe = 0;
      running = false;
    } else if (joystickInput.active) {
      // The on-screen stick takes over completely while held, rather than summing with keyboard -
      // mixing the two would make "nudge the stick a little AND hold W" behave unpredictably.
      forward = joystickInput.y;
      strafe = joystickInput.x;
      running = Math.hypot(joystickInput.x, joystickInput.y) > JOYSTICK_RUN_THRESHOLD;
    } else {
      ({ forward, strafe, running } = input.current);
    }
    // Without this, moving diagonally (forward+strafe both at full magnitude) would move faster
    // than a straight line, since the two components just add - a classic "controls feel off" bug.
    const inputMag = Math.hypot(forward, strafe);
    if (inputMag > 1) {
      forward /= inputMag;
      strafe /= inputMag;
    }
    const isMoving = forward !== 0 || strafe !== 0;
    motionRef.current = isMoving ? (running ? "run" : "walk") : "idle";

    // Eases toward the raw input target instead of snapping straight to it, so a single key tap
    // or small joystick nudge ramps up smoothly rather than lurching at full speed instantly -
    // directly what "one click and the movement is a lot" was describing. Snaps back to zero the
    // instant input releases (no deceleration tail) so it never visually fights the idle pose.
    const smoothed = smoothedInputRef.current;
    if (isMoving) {
      const smoothAlpha = Math.min(1, delta / INPUT_SMOOTHING_SECONDS);
      smoothed.forward += (forward - smoothed.forward) * smoothAlpha;
      smoothed.strafe += (strafe - smoothed.strafe) * smoothAlpha;
    } else {
      smoothed.forward = 0;
      smoothed.strafe = 0;
    }

    if (isMoving) {
      forward = smoothed.forward;
      strafe = smoothed.strafe;
      const speed = running ? RUN_SPEED : WALK_SPEED;
      const azimuth = walkRuntime.cameraAzimuth;
      // Camera-relative movement: "forward" walks in the direction the camera is looking (away
      // from the camera, into the scene), GTA-style, regardless of the character's current facing.
      // three.js's OrbitControls azimuth convention (confirmed against its Spherical source:
      // theta = atan2(x, z), i.e. offset.x = r*sin(theta), offset.z = r*cos(theta)) puts the camera
      // BEHIND the target at theta=0 (offset +Z), so the camera's own forward (camera->target) is
      // -Z there - forward movement must be negative-Z at azimuth 0, not positive.
      const sinA = Math.sin(azimuth);
      const cosA = Math.cos(azimuth);
      const moveX = (strafe * cosA - forward * sinA) * speed * delta;
      const moveZ = (-strafe * sinA - forward * cosA) * speed * delta;

      const desiredX = group.position.x + moveX;
      const desiredZ = group.position.z + moveZ;
      const [resolvedX, resolvedZ] = resolveWallCollisions(desiredX, desiredZ, CHARACTER_RADIUS, colliders);
      group.position.set(resolvedX, 0, resolvedZ);

      // atan2(moveX, moveZ) would put the character's facing exactly PI radians (180deg) opposite
      // the camera azimuth it was just computed from - harmless on its own, but WalkCameraRig's
      // auto-follow (which rotates the camera to match this facing) then chases a target that's
      // always offset by the camera's OWN last position, so the two endlessly chase each other -
      // "walking in a circle" no matter which direction is held. Negating both args fixes the
      // phase so straight-forward movement yields a facing that EQUALS the camera azimuth (verified
      // numerically before applying this), giving the auto-follow a stable target instead of a
      // moving one.
      const desiredYaw = Math.atan2(-moveX, -moveZ);
      let yawDiff = desiredYaw - yawRef.current;
      while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
      while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
      const turnAlpha = Math.min(1, TURN_RATE_PER_SECOND * delta);
      yawRef.current += yawDiff * turnAlpha;
      group.rotation.y = yawRef.current;
    }

    walkRuntime.characterPosition.copy(group.position);
    walkRuntime.characterFacingYaw = yawRef.current;
    walkRuntime.isMoving = isMoving;
  });

  return (
    <group ref={groupRef} position={spawn} rotation={[0, entry.facingYaw, 0]}>
      {option.asset ? (
        <AnimatedCharacterMesh asset={option.asset} motionRef={motionRef} />
      ) : (
        <PrimitiveCharacterMesh option={option} motionRef={motionRef} />
      )}
    </group>
  );
}
