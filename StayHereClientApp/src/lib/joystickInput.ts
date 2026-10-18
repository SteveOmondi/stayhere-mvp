/** Plain mutable ref written to by VirtualJoystick.tsx's pointer handlers and read by
 * WalkCharacter every frame - same "shared ref, not React state" reasoning as walkRuntime.ts:
 * this changes continuously during a drag and a re-render per pointermove would be wasted work. */
export const joystickInput = {
  /** -1..1, left/right */
  x: 0,
  /** -1..1, "up" on the pad = forward */
  y: 0,
  /** true only while a finger/pointer is actively holding the knob down */
  active: false,
};

/** Push the stick past this fraction of its max radius to engage running - mirrors how a real
 * analog stick's "sprint past a threshold" convention works, without needing a separate button. */
export const JOYSTICK_RUN_THRESHOLD = 0.75;
