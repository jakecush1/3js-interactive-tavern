import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import Scene from "./Scene";

// EXPERIENCE
// The R3F Canvas + Suspense boundary. The loading fallback shows inside the
// canvas while assets (fonts for notes, etc.) resolve.

function CanvasLoader() {
  return (
    <Html center>
      <div className="font-medieval text-tavern-linen text-sm animate-pulse">
        Tuning lutes…
      </div>
    </Html>
  );
}

export default function Experience() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.3]}
      camera={{ position: [0, 2.4, 7.5], fov: 45 }}
      gl={{ antialias: true }}
      // expose the R3F state for perf probes (window.__r3f)
      onCreated={(state) => {
        (window as unknown as { __r3f: unknown }).__r3f = state;
      }}
      // Old-master varnish: warm cast, gentler contrast, brighter timber.
      style={{ filter: "sepia(0.28) saturate(0.9) contrast(1.06) brightness(1.02)" }}
    >
      <color attach="background" args={["#241708"]} />
      <Suspense fallback={<CanvasLoader />}>
        <Scene />
      </Suspense>
    </Canvas>
  );
}
