"use client";

/**
 * Low-poly noir props, modelled in code. Units are roughly metres; the desk
 * top sits at y = 0. Every prop takes standard group props (position, rotation).
 */
import { useMemo, useRef } from "react";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import {
  caseBoxTexture,
  corkTexture,
  fingerprintTexture,
  floorTexture,
  folderTexture,
  keypadTexture,
  paperTexture,
  tapeTexture,
  timelineTexture,
  wallTexture,
  woodTexture,
} from "./textures";

type G = ThreeElements["group"];

const metal = { color: "#5b5f66", metalness: 0.75, roughness: 0.35 } as const;
const darkMetal = { color: "#2a2c31", metalness: 0.6, roughness: 0.45 } as const;

// ------------------------------------------------------------------ room

export function Room({ width = 9, depth = 7, wallZ = -1.7 }: { width?: number; depth?: number; wallZ?: number }) {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.78, wallZ + depth / 2]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial map={floorTexture()} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.4, wallZ]} receiveShadow>
        <planeGeometry args={[width, 4.4]} />
        <meshStandardMaterial map={wallTexture()} roughness={0.95} />
      </mesh>
    </group>
  );
}

export function Desk({ width = 3.4, depth = 1.7, ...props }: G & { width?: number; depth?: number }) {
  const tex = useMemo(() => {
    const t = woodTexture().clone();
    t.needsUpdate = true;
    return t;
  }, []);
  return (
    <group {...props}>
      <mesh position={[0, -0.04, 0]} receiveShadow castShadow>
        <boxGeometry args={[width, 0.08, depth]} />
        <meshStandardMaterial map={tex} roughness={0.55} />
      </mesh>
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[(sx * (width - 0.16)) / 2, -0.42, (sz * (depth - 0.16)) / 2]} castShadow>
            <boxGeometry args={[0.08, 0.72, 0.08]} />
            <meshStandardMaterial color="#24170d" roughness={0.7} />
          </mesh>
        )),
      )}
      {/* green desk blotter */}
      <mesh position={[0, 0.002, 0.15]} receiveShadow>
        <boxGeometry args={[width * 0.45, 0.004, depth * 0.45]} />
        <meshStandardMaterial color="#1f3a2c" roughness={0.9} />
      </mesh>
    </group>
  );
}

export function DeskLamp({ on = true, intensity = 28, ...props }: G & { on?: boolean; intensity?: number }) {
  const target = useMemo(() => new THREE.Object3D(), []);
  return (
    <group {...props}>
      <mesh position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.15, 0.04, 24]} />
        <meshStandardMaterial {...darkMetal} />
      </mesh>
      <mesh position={[0, 0.3, 0]} rotation-z={0.2} castShadow>
        <cylinderGeometry args={[0.015, 0.015, 0.6, 8]} />
        <meshStandardMaterial {...metal} />
      </mesh>
      <mesh position={[0.17, 0.62, 0]} rotation-z={-1.1} castShadow>
        <cylinderGeometry args={[0.015, 0.015, 0.45, 8]} />
        <meshStandardMaterial {...metal} />
      </mesh>
      <group position={[0.38, 0.72, 0]} rotation-z={-2.3}>
        <mesh castShadow>
          <coneGeometry args={[0.13, 0.2, 24, 1, true]} />
          <meshStandardMaterial color="#1f4d38" metalness={0.4} roughness={0.4} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, -0.05, 0]}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshStandardMaterial emissive="#ffd9a0" emissiveIntensity={on ? 3 : 0} color="#fff" />
        </mesh>
      </group>
      <primitive object={target} position={[1.1, 0, 0.35]} />
      {on && (
        <spotLight
          position={[0.4, 0.68, 0]}
          target={target}
          angle={0.85}
          penumbra={0.6}
          intensity={intensity}
          distance={6}
          decay={1.6}
          color="#ffd7a1"
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0004}
        />
      )}
    </group>
  );
}

// ------------------------------------------------------------------ paper & folders

export function Paper({ seed = 1, title, stamp, w = 0.21, h = 0.28, tint, ...props }: G & { seed?: number; title?: string; stamp?: string; w?: number; h?: number; tint?: string }) {
  return (
    <group {...props}>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.003, 0]} receiveShadow castShadow>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={paperTexture(seed, { title, stamp, tint })} roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export function Folder({ label, sub, stamp, count = 3, ...props }: G & { label: string; sub?: string; stamp?: string; count?: number }) {
  return (
    <group {...props}>
      {Array.from({ length: Math.min(count, 8) }, (_, i) => (
        <mesh key={i} position={[0.004 * i, 0.004 + i * 0.006, -0.003 * i]} rotation-y={(i % 3) * 0.02} castShadow receiveShadow>
          <boxGeometry args={[0.32, 0.004, 0.24]} />
          <meshStandardMaterial color="#efe6cf" roughness={0.95} />
        </mesh>
      ))}
      <mesh position={[0, 0.01 + Math.min(count, 8) * 0.006, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.34, 0.006, 0.26]} />
        <meshStandardMaterial attach="material-0" color="#c9a868" />
        <meshStandardMaterial attach="material-1" color="#c9a868" />
        <meshStandardMaterial attach="material-2" map={folderTexture(label, sub, stamp)} roughness={0.9} />
        <meshStandardMaterial attach="material-3" color="#c9a868" />
        <meshStandardMaterial attach="material-4" color="#c9a868" />
        <meshStandardMaterial attach="material-5" color="#c9a868" />
      </mesh>
      {/* tab */}
      <mesh position={[-0.08, 0.01 + Math.min(count, 8) * 0.006, -0.14]}>
        <boxGeometry args={[0.1, 0.006, 0.03]} />
        <meshStandardMaterial color="#c9a868" />
      </mesh>
    </group>
  );
}

// ------------------------------------------------------------------ stations

/** Steel lockbox with keypad (keypad / padlock locks). */
export function Lockbox(props: G) {
  return (
    <group {...props}>
      <RoundedBox args={[0.42, 0.2, 0.3]} radius={0.015} position={[0, 0.1, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#4c535b" metalness={0.7} roughness={0.38} />
      </RoundedBox>
      <mesh position={[0.1, 0.11, 0.152]}>
        <planeGeometry args={[0.1, 0.125]} />
        <meshStandardMaterial map={keypadTexture()} emissive="#8dffb0" emissiveIntensity={0.05} />
      </mesh>
      <mesh position={[-0.1, 0.11, 0.16]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.035, 0.008, 8, 24, Math.PI]} />
        <meshStandardMaterial {...metal} />
      </mesh>
    </group>
  );
}

/** Leather journal with a brass word lock. */
export function Journal(props: G) {
  return (
    <group {...props}>
      <RoundedBox args={[0.22, 0.05, 0.3]} radius={0.01} position={[0, 0.025, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#4a2416" roughness={0.65} />
      </RoundedBox>
      <mesh position={[0.112, 0.025, 0]}>
        <boxGeometry args={[0.012, 0.03, 0.06]} />
        <meshStandardMaterial color="#b8923a" metalness={0.8} roughness={0.3} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0.122, 0.025, -0.02 + i * 0.02]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.012, 0.012, 0.01, 12]} />
          <meshStandardMaterial color="#d6b25a" metalness={0.8} roughness={0.25} />
        </mesh>
      ))}
    </group>
  );
}

/** Wall safe with a dial (dial locks). */
export function Safe(props: G) {
  return (
    <group {...props}>
      <RoundedBox args={[0.36, 0.36, 0.32]} radius={0.02} position={[0, 0.18, 0]} castShadow>
        <meshStandardMaterial color="#2e3a33" metalness={0.6} roughness={0.4} />
      </RoundedBox>
      <mesh position={[0, 0.19, 0.165]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.06, 0.06, 0.02, 32]} />
        <meshStandardMaterial color="#c9ccd2" metalness={0.9} roughness={0.2} />
      </mesh>
    </group>
  );
}

/** Microscope with a test-tube rack (lab analysis). */
export function Microscope(props: G) {
  return (
    <group {...props}>
      <mesh position={[0, 0.02, 0]} castShadow>
        <boxGeometry args={[0.2, 0.04, 0.24]} />
        <meshStandardMaterial color="#e8e6e0" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.2, -0.08]} rotation-x={0.25} castShadow>
        <boxGeometry args={[0.05, 0.34, 0.06]} />
        <meshStandardMaterial color="#e8e6e0" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.32, 0.0]} rotation-x={-0.5} castShadow>
        <cylinderGeometry args={[0.025, 0.03, 0.22, 16]} />
        <meshStandardMaterial {...darkMetal} />
      </mesh>
      <mesh position={[0, 0.14, 0.02]}>
        <boxGeometry args={[0.14, 0.012, 0.12]} />
        <meshStandardMaterial {...darkMetal} />
      </mesh>
      {/* tube rack */}
      <group position={[0.24, 0, 0.04]}>
        <mesh position={[0, 0.05, 0]} castShadow>
          <boxGeometry args={[0.2, 0.02, 0.06]} />
          <meshStandardMaterial color="#d8d4ca" />
        </mesh>
        {["#b393ff", "#e0644f", "#6fd69a", "#f2d16b"].map((c, i) => (
          <mesh key={c} position={[-0.075 + i * 0.05, 0.08, 0]} castShadow>
            <cylinderGeometry args={[0.012, 0.012, 0.13, 12]} />
            <meshPhysicalMaterial color={c} transparent opacity={0.75} roughness={0.1} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** Reel-to-reel recorder with transcripts (witness statements). */
export function TapeRecorder(props: G) {
  const reels = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    reels.current?.children.forEach((c) => (c.rotation.y -= dt * 0.6));
  });
  return (
    <group {...props}>
      <RoundedBox args={[0.36, 0.08, 0.26]} radius={0.01} position={[0, 0.04, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#3a332b" roughness={0.6} />
      </RoundedBox>
      <group ref={reels}>
        {[-0.09, 0.09].map((x) => (
          <mesh key={x} position={[x, 0.09, -0.02]} castShadow>
            <cylinderGeometry args={[0.07, 0.07, 0.012, 24]} />
            <meshStandardMaterial color="#8a8f96" metalness={0.7} roughness={0.3} />
          </mesh>
        ))}
      </group>
      <mesh position={[0, 0.081, 0.09]}>
        <boxGeometry args={[0.24, 0.004, 0.04]} />
        <meshStandardMaterial color="#1b1b1b" />
      </mesh>
      <Paper seed={42} title="STATEMENT" position={[0.33, 0, 0.02]} rotation-y={-0.15} />
      <Paper seed={43} position={[0.35, 0.004, 0.0]} rotation-y={-0.05} />
    </group>
  );
}

/** Light box with a print card (fingerprint comparison). */
export function LightBox(props: G) {
  return (
    <group {...props}>
      <mesh position={[0, 0.025, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.4, 0.05, 0.3]} />
        <meshStandardMaterial color="#22252b" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.052, 0]}>
        <planeGeometry args={[0.36, 0.26]} />
        <meshStandardMaterial color="#ffffff" emissive="#eaf2ff" emissiveIntensity={0.9} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[-0.06, 0.054, 0]} rotation-z={0.08}>
        <planeGeometry args={[0.14, 0.14]} />
        <meshStandardMaterial map={fingerprintTexture(2)} transparent opacity={0.9} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0.09, 0.055, 0.02]} rotation-z={-0.1}>
        <planeGeometry args={[0.12, 0.12]} />
        <meshStandardMaterial map={fingerprintTexture(5)} transparent opacity={0.9} />
      </mesh>
      <pointLight position={[0, 0.15, 0]} intensity={0.6} distance={0.8} color="#dfe9ff" />
    </group>
  );
}

/** Corkboard with pinned notes and red string (evidence board). */
export function Corkboard({ w = 1.5, h = 0.95, ...props }: G & { w?: number; h?: number }) {
  const pins: [number, number][] = [
    [-0.5, 0.25],
    [-0.45, -0.2],
    [0.05, 0.28],
    [0.15, -0.15],
    [0.5, 0.2],
    [0.48, -0.25],
  ];
  const strings: [number, number][] = [
    [0, 3],
    [3, 4],
    [1, 2],
  ];
  return (
    <group {...props}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w + 0.08, h + 0.08, 0.04]} />
        <meshStandardMaterial color="#4d3420" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0, 0.021]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={corkTexture()} roughness={1} />
      </mesh>
      {pins.map(([x, y], i) => (
        <group key={i} position={[x * (w / 1.5), y * (h / 0.95), 0.024]} rotation-z={(i % 3 - 1) * 0.06}>
          <mesh>
            <planeGeometry args={[0.2, 0.15]} />
            <meshStandardMaterial map={paperTexture(100 + i, { tint: i % 2 ? "#fdf6c9" : "#f2ead6" })} />
          </mesh>
          <mesh position={[0, 0.06, 0.01]}>
            <sphereGeometry args={[0.012, 10, 10]} />
            <meshStandardMaterial color="#b0161a" />
          </mesh>
        </group>
      ))}
      {strings.map(([a, b]) => {
        const pa = new THREE.Vector3(pins[a]![0] * (w / 1.5), pins[a]![1] * (h / 0.95) + 0.06, 0.04);
        const pb = new THREE.Vector3(pins[b]![0] * (w / 1.5), pins[b]![1] * (h / 0.95) + 0.06, 0.04);
        const mid = pa.clone().add(pb).multiplyScalar(0.5);
        const len = pa.distanceTo(pb);
        const angle = Math.atan2(pb.y - pa.y, pb.x - pa.x);
        return (
          <mesh key={`${a}-${b}`} position={mid} rotation-z={angle - Math.PI / 2}>
            <cylinderGeometry args={[0.004, 0.004, len, 6]} />
            <meshStandardMaterial color="#c0161c" />
          </mesh>
        );
      })}
    </group>
  );
}

/** Wall-mounted timeline strip (timeline reconstruction). */
export function TimelineWall(props: G) {
  return (
    <group {...props}>
      <mesh castShadow>
        <boxGeometry args={[1.34, 0.52, 0.03]} />
        <meshStandardMaterial color="#2a2d33" />
      </mesh>
      <mesh position={[0, 0, 0.016]}>
        <planeGeometry args={[1.3, 0.48]} />
        <meshStandardMaterial map={timelineTexture()} roughness={0.9} />
      </mesh>
    </group>
  );
}

/** The final report: red-bordered folder and a magnifying glass (accusation). */
export function FinalReport(props: G) {
  return (
    <group {...props}>
      <Folder label="FINAL REPORT" sub="For the coroner" stamp="URGENT" count={2} />
      <group position={[0.22, 0.03, 0.08]} rotation-y={0.6}>
        <mesh rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.05, 0.007, 10, 32]} />
          <meshStandardMaterial color="#b8923a" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh rotation-x={Math.PI / 2}>
          <circleGeometry args={[0.05, 32]} />
          <meshPhysicalMaterial color="#cfe6ff" transparent opacity={0.25} roughness={0} />
        </mesh>
        <mesh position={[0.09, 0, 0]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.009, 0.011, 0.09, 10]} />
          <meshStandardMaterial color="#2a1a10" />
        </mesh>
      </group>
    </group>
  );
}

/** Clear evidence bag with a red strip. */
export function EvidenceBag({ seed = 1, ...props }: G & { seed?: number }) {
  return (
    <group {...props}>
      <mesh position={[0, 0.012, 0]} castShadow>
        <boxGeometry args={[0.2, 0.02, 0.26]} />
        <meshPhysicalMaterial color="#e8f0f5" transparent opacity={0.35} roughness={0.15} />
      </mesh>
      <mesh position={[0, 0.023, -0.1]}>
        <boxGeometry args={[0.2, 0.002, 0.04]} />
        <meshStandardMaterial color="#b3121a" />
      </mesh>
      <mesh position={[0, 0.012, 0.02]} rotation-y={seed}>
        <boxGeometry args={[0.07, 0.012, 0.1]} />
        <meshStandardMaterial color={seed % 2 ? "#6f8a3a" : "#8c8c90"} />
      </mesh>
    </group>
  );
}

/** Steel thermos flask (the sample case's key evidence; also decoration). */
export function Flask(props: G) {
  return (
    <group {...props}>
      <mesh position={[0, 0.11, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.22, 20]} />
        <meshStandardMaterial color="#9aa1a8" metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.235, 0]} castShadow>
        <cylinderGeometry args={[0.042, 0.042, 0.04, 20]} />
        <meshStandardMaterial color="#2b2e33" />
      </mesh>
    </group>
  );
}

export function Mug(props: G) {
  return (
    <group {...props}>
      <mesh position={[0, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.036, 0.1, 20, 1, true]} />
        <meshStandardMaterial color="#e9e4d8" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.085, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.037, 20]} />
        <meshStandardMaterial color="#2a160c" />
      </mesh>
      <mesh position={[0.045, 0.05, 0]}>
        <torusGeometry args={[0.022, 0.006, 8, 16]} />
        <meshStandardMaterial color="#e9e4d8" />
      </mesh>
    </group>
  );
}

/** UV torch with a violet lens; `beam` adds a light. */
export function UVTorch({ beam = false, ...props }: G & { beam?: boolean }) {
  return (
    <group {...props}>
      <mesh rotation-z={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.018, 0.018, 0.16, 16]} />
        <meshStandardMaterial {...darkMetal} />
      </mesh>
      <mesh position={[0.09, 0, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.026, 0.02, 0.03, 16]} />
        <meshStandardMaterial {...darkMetal} />
      </mesh>
      <mesh position={[0.106, 0, 0]} rotation-z={Math.PI / 2}>
        <circleGeometry args={[0.024, 16]} />
        <meshStandardMaterial emissive="#a77bff" emissiveIntensity={beam ? 4 : 1.2} color="#a77bff" />
      </mesh>
    </group>
  );
}

// ------------------------------------------------------------------ case boxes

export function CaseBox({ title, sub, classified = false, lid = true, ...props }: G & { title: string; sub: string; classified?: boolean; lid?: boolean }) {
  const label = caseBoxTexture(title, sub, classified);
  const cardboard = "#8f6f43";
  return (
    <group {...props}>
      <mesh position={[0, 0.16, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.46, 0.3, 0.34]} />
        <meshStandardMaterial attach="material-0" color={cardboard} roughness={0.95} />
        <meshStandardMaterial attach="material-1" color={cardboard} roughness={0.95} />
        <meshStandardMaterial attach="material-2" color={cardboard} roughness={0.95} />
        <meshStandardMaterial attach="material-3" color={cardboard} roughness={0.95} />
        <meshStandardMaterial attach="material-4" map={label} roughness={0.9} />
        <meshStandardMaterial attach="material-5" color={cardboard} roughness={0.95} />
      </mesh>
      {lid && (
        <mesh position={[0, 0.325, 0]} castShadow>
          <boxGeometry args={[0.48, 0.05, 0.36]} />
          <meshStandardMaterial color="#9b7a4c" roughness={0.95} />
        </mesh>
      )}
      {classified && (
        <mesh position={[0, 0.16, 0.172]} rotation-z={-0.35}>
          <planeGeometry args={[0.6, 0.05]} />
          <meshStandardMaterial map={tapeTexture()} />
        </mesh>
      )}
    </group>
  );
}

// ------------------------------------------------------------------ state markers

/** Diagonal "SEALED" tape over a locked station. */
export function SealTape({ width = 0.5, ...props }: G & { width?: number }) {
  return (
    <group {...props}>
      <mesh rotation-x={-Math.PI / 2} rotation-z={0.5}>
        <planeGeometry args={[width, 0.05]} />
        <meshStandardMaterial map={tapeTexture()} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} rotation-z={-0.5}>
        <planeGeometry args={[width, 0.05]} />
        <meshStandardMaterial map={tapeTexture()} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** Soft pulsing ring under an available station. */
export function PulseRing({ radius = 0.28, color = "#b393ff", ...props }: G & { radius?: number; color?: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (Math.sin(clock.elapsedTime * 2.4) + 1) / 2;
    (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.25 + t * 0.45;
    ref.current.scale.setScalar(1 + t * 0.06);
  });
  return (
    <group {...props}>
      <mesh ref={ref} rotation-x={-Math.PI / 2} position={[0, 0.004, 0]}>
        <ringGeometry args={[radius * 0.9, radius, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}
