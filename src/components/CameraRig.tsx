import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useGameStore } from "../lib/useGameStore";
import { getBandMember } from "../data/bandMembers";

// CAMERA RIG
// Curated OrbitControls (constrained), gentle idle sway, focus-on-member,
// and a reset triggered via the store's resetCameraNonce-like pattern.
// Here we expose reset by watching focusedMemberId === "__reset__" sentinel
// is avoided; instead App calls controls through the exported ref hook below.

const DEFAULT_TARGET = new Vector3(0, 0.8, 0);
const DEFAULT_POS = new Vector3(0, 2.7, 10.5);

// How far the scene drifts with the mouse (world units).
const PARALLAX_X = 0.7;
const PARALLAX_Y = 0.35;

export default function CameraRig() {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const focusedMemberId = useGameStore((s) => s.focusedMemberId);
  const reducedMotion = useGameStore((s) => s.reducedMotion);
  const isPlaying = useGameStore((s) => s.isPlaying);

  const desiredTarget = useRef(DEFAULT_TARGET.clone());
  const desiredPos = useRef(DEFAULT_POS.clone());
  // Smoothed pointer for mouse parallax (-1..1 on each axis).
  const parallax = useRef({ x: 0, y: 0 });

  // Dev aid: #cam=x,y,z,tx,ty,tz parks the camera for close-up screenshots.
  const debugCam = useRef<{ pos: Vector3; target: Vector3 } | null>(null);
  useEffect(() => {
    const m = /cam=([^&]+)/.exec(window.location.hash);
    if (!m) return;
    const v = m[1].split(",").map(Number);
    if (v.length === 6 && v.every((x) => Number.isFinite(x))) {
      debugCam.current = { pos: new Vector3(v[0], v[1], v[2]), target: new Vector3(v[3], v[4], v[5]) };
    }
  }, []);

  // Register reset handler on window so the UI button can call it.
  useEffect(() => {
    const reset = () => {
      desiredTarget.current.copy(DEFAULT_TARGET);
      desiredPos.current.copy(DEFAULT_POS);
      useGameStore.getState().focusMember(null);
    };
    window.addEventListener("reset-camera", reset);
    return () => window.removeEventListener("reset-camera", reset);
  }, []);

  // Update desired camera when focus changes
  useEffect(() => {
    if (focusedMemberId) {
      const m = getBandMember(focusedMemberId);
      if (m) {
        const [x, , z] = m.position;
        desiredTarget.current.set(x, 0.95, z);
        // Consistent frontal vantage for EVERY member: sit in front (audience
        // side, +z) at a fixed height and distance so the back-row two aren't
        // viewed from above. Slightly less zoomed-in than before.
        desiredPos.current.set(x * 0.55, 1.7, z + 4.4);
      }
    } else {
      desiredTarget.current.copy(DEFAULT_TARGET);
      desiredPos.current.copy(DEFAULT_POS);
    }
  }, [focusedMemberId]);

  useFrame((state) => {
    if (!controls.current) return;

    if (debugCam.current) {
      camera.position.copy(debugCam.current.pos);
      controls.current.target.copy(debugCam.current.target);
      controls.current.update();
      return;
    }

    // lerp target
    controls.current.target.lerp(desiredTarget.current, 0.05);

    // lerp camera position toward desired (plus subtle sway)
    const sway =
      reducedMotion || !isPlaying
        ? 0
        : Math.sin(state.clock.elapsedTime * 0.6) * 0.08;

    // Ease the smoothed pointer toward the live pointer for a fluid drift.
    const px = reducedMotion ? 0 : state.pointer.x;
    const py = reducedMotion ? 0 : state.pointer.y;
    parallax.current.x += (px - parallax.current.x) * 0.06;
    parallax.current.y += (py - parallax.current.y) * 0.06;

    const goal = desiredPos.current.clone();
    // Move the camera the same way as the cursor so the scene appears to
    // follow the mouse (mouse left → scene shifts left).
    goal.x += sway - parallax.current.x * PARALLAX_X;
    goal.y -= parallax.current.y * PARALLAX_Y;
    camera.position.lerp(goal, 0.04);

    // Nudge the look-at point the opposite way for a gentle depth shift.
    controls.current.target.x += parallax.current.x * PARALLAX_X * 0.12;

    controls.current.update();
  });

  return (
    <OrbitControls
      ref={controls}
      enablePan={false}
      minDistance={debugCam.current ? 0.3 : 5}
      maxDistance={14}
      minPolarAngle={Math.PI * 0.18}
      maxPolarAngle={Math.PI * 0.5}
      minAzimuthAngle={-Math.PI * 0.45}
      maxAzimuthAngle={Math.PI * 0.45}
      enableDamping
      dampingFactor={0.08}
    />
  );
}
