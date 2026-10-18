import { useRef } from "react";
import { joystickInput } from "../../lib/joystickInput";

const BASE_RADIUS = 52; // px - must match the CSS .sh-joystick width/2

/** On-screen GTA5-style movement stick, bottom-right of the walkthrough canvas. Writes directly
 * into joystickInput (not React state) so dragging is perfectly smooth - WalkCharacter reads it
 * every frame and prefers it over keyboard input whenever it's actively held. Works with mouse or
 * touch (pointer events cover both), with pointer capture so dragging past the pad's edge while
 * held still tracks correctly instead of losing the gesture. */
export function VirtualJoystick() {
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const activePointerId = useRef<number | null>(null);

  function updateFromClient(clientX: number, clientY: number) {
    const base = baseRef.current;
    const knob = knobRef.current;
    if (!base || !knob) return;
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > BASE_RADIUS) {
      dx = (dx / dist) * BASE_RADIUS;
      dy = (dy / dist) * BASE_RADIUS;
    }
    joystickInput.x = dx / BASE_RADIUS;
    joystickInput.y = -dy / BASE_RADIUS; // screen-down is positive dy; "up" on the pad = forward
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  function resetKnob() {
    joystickInput.active = false;
    joystickInput.x = 0;
    joystickInput.y = 0;
    if (knobRef.current) knobRef.current.style.transform = "translate(0px, 0px)";
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointerId.current = e.pointerId;
    joystickInput.active = true;
    updateFromClient(e.clientX, e.clientY);
  }
  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (activePointerId.current !== e.pointerId) return;
    updateFromClient(e.clientX, e.clientY);
  }
  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (activePointerId.current !== e.pointerId) return;
    activePointerId.current = null;
    resetKnob();
  }

  return (
    <div
      ref={baseRef}
      className="sh-joystick"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div ref={knobRef} className="sh-joystick__knob" />
    </div>
  );
}
