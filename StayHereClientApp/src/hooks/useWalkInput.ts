import { useEffect, useRef } from "react";

export interface WalkInputState {
  forward: number; // -1..1
  strafe: number; // -1..1
  running: boolean;
}

const FORWARD_KEYS = new Set(["KeyW", "ArrowUp"]);
const BACK_KEYS = new Set(["KeyS", "ArrowDown"]);
const LEFT_KEYS = new Set(["KeyA", "ArrowLeft"]);
const RIGHT_KEYS = new Set(["KeyD", "ArrowRight"]);
const RUN_KEYS = new Set(["ShiftLeft", "ShiftRight"]);
const ALL_MOVEMENT_KEYS = new Set([...FORWARD_KEYS, ...BACK_KEYS, ...LEFT_KEYS, ...RIGHT_KEYS, "Space"]);

/** Set-based keydown/keyup tracking - no external input library needed for desktop WASD. Returns
 * a ref so the per-frame movement loop reads the latest state without triggering React re-renders. */
export function useWalkInput(enabled: boolean) {
  const state = useRef<WalkInputState>({ forward: 0, strafe: 0, running: false });
  const pressed = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled) {
      pressed.current.clear();
      state.current = { forward: 0, strafe: 0, running: false };
      return;
    }

    function recompute() {
      const keys = pressed.current;
      const anyPressed = (set: Set<string>) => [...set].some((k) => keys.has(k));
      let forward = 0;
      let strafe = 0;
      if (anyPressed(FORWARD_KEYS)) forward += 1;
      if (anyPressed(BACK_KEYS)) forward -= 1;
      if (anyPressed(RIGHT_KEYS)) strafe += 1;
      if (anyPressed(LEFT_KEYS)) strafe -= 1;
      state.current = {
        forward: Math.max(-1, Math.min(1, forward)),
        strafe: Math.max(-1, Math.min(1, strafe)),
        running: [...RUN_KEYS].some((k) => keys.has(k)),
      };
    }

    function onKeyDown(e: KeyboardEvent) {
      // Without this, the browser's own default behavior for arrow keys/space (scrolling the page)
      // fires alongside movement - since the walkthrough canvas isn't a focusable/scrollable element
      // the page itself scrolls instead, which is exactly the "screen keeps scrolling" symptom.
      if (ALL_MOVEMENT_KEYS.has(e.code)) e.preventDefault();
      pressed.current.add(e.code);
      recompute();
    }
    function onKeyUp(e: KeyboardEvent) {
      pressed.current.delete(e.code);
      recompute();
    }
    function onBlur() {
      pressed.current.clear();
      recompute();
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [enabled]);

  return state;
}
