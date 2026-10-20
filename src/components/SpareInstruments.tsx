// SPARE INSTRUMENTS
// Side arsenals resting on the floor, built from primitives to match the
// other procedural instruments:
// - Babe Needleman (at [-0.8, 0, -1.4]): banjo + accordion

export default function SpareInstruments() {
  return (
    <>
      <BabeGear />
      <BabeAccordion />
    </>
  );
}

function BabeGear() {
  return (
    <group position={[-1.55, 0, -1.95]} rotation={[0, 0.55, 0]}>
      {/* BANJO — leaning back against the wall side, head up */}
      <group rotation={[-0.18, 0, -0.42]} position={[0, 0.2, 0]}>
        {/* rim */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.17, 0.17, 0.06, 20]} />
          <meshStandardMaterial color="#6b4423" roughness={0.6} />
        </mesh>
        {/* metal tension hoop */}
        <mesh>
          <torusGeometry args={[0.17, 0.012, 8, 24]} />
          <meshStandardMaterial color="#b8b0a0" metalness={0.7} roughness={0.35} />
        </mesh>
        {/* drumhead */}
        <mesh position={[0, 0, 0.035]}>
          <circleGeometry args={[0.16, 20]} />
          <meshStandardMaterial color="#e6d7b8" roughness={0.8} />
        </mesh>
        {/* neck */}
        <mesh position={[0, 0.42, 0.01]}>
          <boxGeometry args={[0.045, 0.52, 0.04]} />
          <meshStandardMaterial color="#5a3416" roughness={0.6} />
        </mesh>
        {/* headstock */}
        <mesh position={[0, 0.71, 0.01]} rotation={[0.35, 0, 0]}>
          <boxGeometry args={[0.06, 0.11, 0.04]} />
          <meshStandardMaterial color="#3d2410" />
        </mesh>
        {/* strings hint */}
        <mesh position={[0, 0.3, 0.045]}>
          <boxGeometry args={[0.03, 0.75, 0.002]} />
          <meshStandardMaterial color="#d8c8a8" metalness={0.4} roughness={0.4} />
        </mesh>
      </group>

    </group>
  );
}

// On the floor in FRONT of Babe (he sits at [-0.8, 0, -1.4] facing the
// circle center), keyboard side angled toward him.
function BabeAccordion() {
  return (
    <group position={[-1.2, 0, -0.65]} rotation={[0, 0.4, 0]}>
      <group position={[0, 0.14, 0]} rotation={[0, 0, 0.05]}>
        {/* left end (bass side) */}
        <mesh position={[-0.17, 0, 0]}>
          <boxGeometry args={[0.09, 0.27, 0.18]} />
          <meshStandardMaterial color="#7e1f1a" roughness={0.35} />
        </mesh>
        {/* bellows pleats */}
        {[-0.1, -0.06, -0.02, 0.02, 0.06, 0.1].map((x, i) => (
          <mesh key={i} position={[x, 0, 0]}>
            <boxGeometry args={[0.038, 0.23, 0.15]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? "#e8dcc0" : "#2a1c14"}
              roughness={0.85}
            />
          </mesh>
        ))}
        {/* right end (treble side) */}
        <mesh position={[0.17, 0, 0]}>
          <boxGeometry args={[0.09, 0.27, 0.18]} />
          <meshStandardMaterial color="#7e1f1a" roughness={0.35} />
        </mesh>
        {/* keyboard strip */}
        <mesh position={[0.175, 0.01, 0.095]}>
          <boxGeometry args={[0.055, 0.2, 0.015]} />
          <meshStandardMaterial color="#efe6d0" roughness={0.5} />
        </mesh>
        {/* black keys */}
        {[-0.05, 0, 0.05].map((y, i) => (
          <mesh key={i} position={[0.175, y, 0.104]}>
            <boxGeometry args={[0.04, 0.018, 0.008]} />
            <meshStandardMaterial color="#1a120a" />
          </mesh>
        ))}
        {/* gold trim */}
        <mesh position={[-0.17, -0.14, 0]}>
          <boxGeometry args={[0.09, 0.012, 0.18]} />
          <meshStandardMaterial color="#a8781f" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[0.17, -0.14, 0]}>
          <boxGeometry args={[0.09, 0.012, 0.18]} />
          <meshStandardMaterial color="#a8781f" metalness={0.5} roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}
