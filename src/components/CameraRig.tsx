import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Vector3, type PerspectiveCamera } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useGameStore } from "../lib/useGameStore";
import { getBandMember } from "../data/bandMembers";

// CAMERA RIG
// Curated OrbitControls (constrained), gentle idle sway, mouse parallax,
// focus-on-member, and a reset triggered by the header's "reset-camera"
// window event. Framing adapts to the viewport: a portrait phone backs the
// camera off and widens the lens so the whole band fits across the narrow
// screen; landscape keeps the cinematic framing.

type Framing = { pos: Vector3; target: Vector3; fov: number; maxDistance: number };

function framingFor(portrait: boolean): Framing {
  return portrait
    ? { pos: new Vector3(0, 3.0, 13.5), target: new Vector3(0, 0.9, 0.2), fov: 58, maxDistance: 18 }
    : { pos: new Vector3(0, 2.7, 10.5), target: new Vector3(0, 0.8, 0), fov: 45, maxDistance: 14 };
}

// How far the scene drifts with the mouse (world units). Off on touch.
const PARALLAX_X = 0.7;
const PARALLAX_Y = 0.35;

export default function CameraRig() {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera, size, gl } = useThree();
  const portrait = size.height > size.width;
  const mobile = size.width < 768 || size.height < 520;
  const focusedMemberId = useGameStore((s) => s.focusedMemberId);
  const reducedMotion = useGameStore((s) => s.reducedMotion);
  const isPlaying = useGameStore((s) => s.isPlaying);

  const framing = useMemo(() => framingFor(portrait), [portrait]);
  const framingRef = useRef(framing);
  const desiredTarget = useRef(framing.target.clone());
  const desiredPos = useRef(framing.pos.clone());
  const goal = useRef(new Vector3());
  // Smoothed pointer for mouse parallax (-1..1 on each axis).
  const parallax = useRef({ x: 0, y: 0 });

  // Dev aids: #cam=x,y,z,tx,ty,tz parks the camera for close-up screenshots;
  // #instant skips the camera glide so a screenshot shows the settled view.
  const debugCam = useRef<{ pos: Vector3; target: Vector3 } | null>(null);
  const instant = useRef(false);
  useEffect(() => {
    instant.current = /instant/.test(window.location.hash);
    const m = /cam=([^&]+)/.exec(window.location.hash);
    if (!m) return;
    const v = m[1].split(",").map(Number);
    if (v.length === 6 && v.every((x) => Number.isFinite(x))) {
      debugCam.current = { pos: new Vector3(v[0], v[1], v[2]), target: new Vector3(v[3], v[4], v[5]) };
    }
  }, []);

  // Lens and default framing follow the viewport orientation.
  useEffect(() => {
    framingRef.current = framing;
    const cam = camera as PerspectiveCamera;
    if ("fov" in cam) {
      cam.fov = framing.fov;
      cam.updateProjectionMatrix();
    }
    if (!useGameStore.getState().focusedMemberId) {
      desiredTarget.current.copy(framing.target);
      desiredPos.current.copy(framing.pos);
    }
  }, [camera, framing]);

  // Touch: vertical swipes scroll the page down to the band and shows,
  // horizontal drags orbit, pinch zooms. OrbitControls sets touch-action to
  // none when it connects, which would swallow every swipe, so override it.
  useEffect(() => {
    gl.domElement.style.touchAction = mobile ? "pan-y" : "none";
  }, [gl, mobile]);

  // Register reset handler on window so the UI button can call it.
  useEffect(() => {
    const reset = () => {
      desiredTarget.current.copy(framingRef.current.target);
      desiredPos.current.copy(framingRef.current.pos);
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
        if (portrait) {
          // the info sheet covers the bottom of a phone screen, so frame
          // the musician in the upper half
          desiredTarget.current.set(x, 0.6, z);
          desiredPos.current.set(x * 0.55, 1.9, z + 5.2);
        } else {
          // Consistent frontal vantage for every member: sit in front
          // (audience side, +z) at a fixed height and distance.
          desiredTarget.current.set(x, 0.95, z);
          desiredPos.current.set(x * 0.55, 1.7, z + 4.4);
        }
      }
    } else {
      desiredTarget.current.copy(framingRef.current.target);
      desiredPos.current.copy(framingRef.current.pos);
    }
  }, [focusedMemberId, portrait]);

  useFrame((state) => {
    if (!controls.current) return;

    if (debugCam.current) {
      camera.position.copy(debugCam.current.pos);
      controls.current.target.copy(debugCam.current.target);
      controls.current.update();
      return;
    }

    // lerp target
    controls.current.target.lerp(desiredTarget.current, instant.current ? 1 : 0.05);

    // lerp camera position toward desired (plus subtle sway)
    const sway = reducedMotion || !isPlaying ? 0 : Math.sin(state.clock.elapsedTime * 0.6) * 0.08;

    // Ease the smoothed pointer toward the live pointer for a fluid drift.
    const px = reducedMotion || mobile ? 0 : state.pointer.x;
    const py = reducedMotion || mobile ? 0 : state.pointer.y;
    parallax.current.x += (px - parallax.current.x) * 0.06;
    parallax.current.y += (py - parallax.current.y) * 0.06;

    const g = goal.current.copy(desiredPos.current);
    // Move the camera the same way as the cursor so the scene appears to
    // follow the mouse (mouse left → scene shifts left).
    g.x += sway - parallax.current.x * PARALLAX_X;
    g.y -= parallax.current.y * PARALLAX_Y;
    camera.position.lerp(g, instant.current ? 1 : 0.04);

    // Nudge the look-at point the opposite way for a gentle depth shift.
    controls.current.target.x += parallax.current.x * PARALLAX_X * 0.12;

    controls.current.update();
  });

  return (
    <OrbitControls
      ref={controls}
      enablePan={false}
      minDistance={debugCam.current ? 0.3 : 5}
      maxDistance={framing.maxDistance}
      minPolarAngle={Math.PI * 0.18}
      maxPolarAngle={Math.PI * 0.5}
      minAzimuthAngle={-Math.PI * 0.45}
      maxAzimuthAngle={Math.PI * 0.45}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={mobile ? 0.6 : 1}
    />
  );
}
