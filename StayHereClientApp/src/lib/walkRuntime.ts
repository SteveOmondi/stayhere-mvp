import * as THREE from "three";

/** Per-frame data shared between WalkCharacter and WalkCameraRig. Plain mutable refs, not zustand
 * state - this updates every animation frame, and only one walk-mode scene is ever mounted at a
 * time, so React state/re-renders would just be wasted work here (same reasoning CameraRig/
 * FurnitureInstance already apply elsewhere in this scene). */
export const walkRuntime = {
  characterPosition: new THREE.Vector3(),
  /** radians, world-space yaw the camera currently orbits at - WalkCharacter reads this so "W"
   * always walks away from the camera, GTA-style, regardless of which way the camera is facing. */
  cameraAzimuth: 0,
  /** radians, the character's current smoothed facing - WalkCameraRig reads this to auto-rotate
   * the camera in behind the character while they're moving and the player isn't actively
   * mouse-dragging, so turning with A/D settles the camera in behind you like GTA5, instead of
   * leaving the camera looking at your old facing while you spin away from it. */
  characterFacingYaw: 0,
  /** whether the character currently has nonzero movement input - WalkCameraRig only engages its
   * auto-follow-behind-character rotation while this is true, so the camera never drifts on its
   * own while you're standing still looking around. */
  isMoving: false,
};
