import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3, type Object3D, type PointLight } from "three";
import { ACTIVE_COLOR, HOVER_COLOR, glowAnchors } from "../lib/glow";

// GLOW LIGHTS
// Two always-mounted point lights that fade in on whatever object is
// registered in lib/glow.ts (hovered prop / playing song's trigger), so the
// light count never changes and no shaders get recompiled mid-interaction.

const INTENSITY = 1.2;

export default function GlowLights() {
  const hover = useRef<PointLight>(null);
  const active = useRef<PointLight>(null);
  const last = useRef<{ hover: Object3D | null; active: Object3D | null }>({ hover: null, active: null });
  const tmp = useMemo(() => new Vector3(), []);

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 10);
    const drive = (light: PointLight | null, anchor: Object3D | null, key: "hover" | "active") => {
      if (!light) return;
      if (anchor) {
        anchor.getWorldPosition(tmp);
        // snap when the target changes, glide while it moves (the barmaid walks)
        if (last.current[key] !== anchor) light.position.copy(tmp);
        else light.position.lerp(tmp, Math.min(1, k * 3));
        light.intensity += (INTENSITY - light.intensity) * k;
      } else {
        light.intensity += (0 - light.intensity) * k;
      }
      last.current[key] = anchor;
    };
    drive(hover.current, glowAnchors.hover, "hover");
    drive(active.current, glowAnchors.active, "active");
  });

  return (
    <>
      <pointLight ref={hover} color={HOVER_COLOR} intensity={0} distance={1.6} decay={2} />
      <pointLight ref={active} color={ACTIVE_COLOR} intensity={0} distance={1.6} decay={2} />
    </>
  );
}
