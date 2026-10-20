import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Color, PMREMGenerator, type DirectionalLight, type AmbientLight } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useGameStore } from "../lib/useGameStore";
import { getSong } from "../data/songs";
import { MOOD_LIGHT } from "../lib/constants";

// LIGHTING RIG
// Candle-lit chiaroscuro: a low ambient so shadows actually read as
// shadow, a warm key from the front-top for shape and cast shadows, a
// faint cool fill from the windows, and a subtle environment map so
// metal, glass and varnished wood have something to reflect. The point
// lights that do most of the work live with their candles, the hearth
// and the chandelier in TavernEnvironment. A mood light shifts colour and
// intensity to match the current song.

function EnvironmentMap() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.22;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

export default function LightingRig() {
  const ambient = useRef<AmbientLight>(null);
  const key = useRef<DirectionalLight>(null);
  const targetColor = useRef(new Color(MOOD_LIGHT.idle.color));
  const targetIntensity = useRef(MOOD_LIGHT.idle.intensity);

  const isPlaying = useGameStore((s) => s.isPlaying);
  const currentSongId = useGameStore((s) => s.currentSongId);

  useFrame(() => {
    const song = getSong(currentSongId);
    const mood = isPlaying && song ? MOOD_LIGHT[song.mood] : MOOD_LIGHT.idle;
    targetColor.current.set(mood.color);
    targetIntensity.current = mood.intensity;

    if (key.current) {
      key.current.color.lerp(targetColor.current, 0.04);
      key.current.intensity += (targetIntensity.current * 1.1 - key.current.intensity) * 0.04;
    }
    if (ambient.current) {
      const ambIntensity = isPlaying ? 0.26 : 0.3;
      ambient.current.intensity += (ambIntensity - ambient.current.intensity) * 0.04;
    }
  });

  return (
    <>
      <EnvironmentMap />
      <ambientLight ref={ambient} intensity={0.3} color="#e9d3ac" />
      <hemisphereLight args={["#d9c39a", "#2a1a0c", 0.35]} />
      <directionalLight
        ref={key}
        position={[3, 6, 5]}
        intensity={MOOD_LIGHT.idle.intensity * 1.1}
        color={MOOD_LIGHT.idle.color}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={24}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      {/* soft warm fill from the front so faces toward the camera read */}
      <pointLight position={[0, 3, 6]} intensity={0.45} color="#f0dcb0" distance={16} decay={1.6} />
      {/* cool rim from the windows on the left */}
      <directionalLight position={[-8, 4, 2]} intensity={0.25} color="#8ea8c8" />
    </>
  );
}
