import { Suspense } from "react";
import { Preload } from "@react-three/drei";
import { clickableObjects } from "../data/clickableObjects";
import { useGameStore } from "../lib/useGameStore";
import TavernEnvironment from "./TavernEnvironment";
import BandCircle from "./BandCircle";
import SpareInstruments from "./SpareInstruments";
import Horse from "./Horse";
import Bar from "./Bar";
import Barmaid from "./Barmaid";
import Patrons from "./Patrons";
import ClickableObject from "./ClickableObject";
import BottleSpawner from "./BottleSpawner";
import LightingRig from "./LightingRig";
import CameraRig from "./CameraRig";
import Effects from "./Effects";
import GlowLights from "./GlowLights";

export default function Scene() {
  const spawnBottles = useGameStore((s) => s.spawnBottles);

  return (
    <>
      <LightingRig />
      <GlowLights />
      <CameraRig />
      {/* smoky haze: warm fog, close enough to soften the far corners
          without milking out the band */}
      <fog attach="fog" args={["#241708", 7.5, 21]} />

      {/* Invisible floor plane — clicking empty space spawns bottles */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.05, 0]}
        onClick={(e) => {
          e.stopPropagation();
          spawnBottles([e.point.x, 0, e.point.z]);
        }}
      >
        <planeGeometry args={[16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <TavernEnvironment />
      <BandCircle />
      <SpareInstruments />
      <Horse />
      <Bar />
      <Barmaid />
      <Patrons />

      {clickableObjects.map((obj) => (
        <ClickableObject key={obj.id} object={obj} />
      ))}

      <Suspense fallback={null}>
        <Effects />
      </Suspense>

      <BottleSpawner />

      {/* Compile every shader once up front instead of stalling the first
          time each material scrolls into view */}
      <Preload all />
    </>
  );
}
