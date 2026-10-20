import { useEffect, useRef, useState } from "react";
import { useGameStore } from "../lib/useGameStore";
import { MAX_BOTTLES, BOTTLE_SPAWN_HEIGHT, BOTTLE_SPAWN_SPREAD } from "../lib/constants";
import { audioManager } from "../lib/audioManager";
import FallingBottle from "./FallingBottle";

// BOTTLE SPAWNER — no physics engine.
// Listens to the store spawn nonce; manages a flat array of active bottles.

type BottleInstance = {
  id: number;
  position: [number, number, number];
  vx: number;
  vz: number;
  rotSpeed: [number, number, number];
};

let counter = 0;

export default function BottleSpawner() {
  const [bottles, setBottles] = useState<BottleInstance[]>([]);
  const spawnNonce = useGameStore((s) => s.bottleSpawnNonce);
  const lastSpawnPoint = useGameStore((s) => s.lastSpawnPoint);
  const prevNonce = useRef(0);

  useEffect(() => {
    if (spawnNonce === prevNonce.current) return;
    prevNonce.current = spawnNonce;

    const count = 3 + Math.floor(Math.random() * 3);
    const cx = lastSpawnPoint?.[0] ?? 0;
    const cz = lastSpawnPoint?.[2] ?? 0;

    const newBottles: BottleInstance[] = Array.from({ length: count }).map(() => {
      counter += 1;
      return {
        id: counter,
        position: [
          cx + (Math.random() - 0.5) * BOTTLE_SPAWN_SPREAD,
          BOTTLE_SPAWN_HEIGHT + Math.random() * 2,
          cz + (Math.random() - 0.5) * BOTTLE_SPAWN_SPREAD,
        ],
        vx: (Math.random() - 0.5) * 2.5,
        vz: (Math.random() - 0.5) * 2.5,
        rotSpeed: [
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 6,
        ],
      };
    });

    audioManager.playSfx("/audio/clink.mp3", 0.3);

    setBottles((prev) => {
      const merged = [...prev, ...newBottles];
      return merged.length > MAX_BOTTLES ? merged.slice(-MAX_BOTTLES) : merged;
    });
  }, [spawnNonce, lastSpawnPoint]);

  const removeBottle = (id: number) =>
    setBottles((prev) => prev.filter((b) => b.id !== id));

  return (
    <>
      {bottles.map((b) => (
        <FallingBottle
          key={b.id}
          id={b.id}
          position={b.position}
          vx={b.vx}
          vz={b.vz}
          rotSpeed={b.rotSpeed}
          onDone={removeBottle}
        />
      ))}
    </>
  );
}
