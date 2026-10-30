"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import SceneCanvas from "./SceneCanvas";
import { CameraRig } from "./CameraRig";
import { CaseBox, Desk, DeskLamp, EvidenceBag, Flask, Folder, Mug, Paper, Room, UVTorch } from "./objects";
import { FONT_STAMP, fingerprintTexture } from "./textures";

/** Text written in "UV ink": only glows where the torch beam falls. */
function uvInkTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#c8a6ff";
  ctx.font = `64px ${FONT_STAMP}`;
  ctx.textAlign = "center";
  ctx.fillText("WHO DID IT?", 256, 120);
  ctx.font = `30px ${FONT_STAMP}`;
  ctx.fillText("check the flask", 256, 180);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A UV torch that sweeps across a document, revealing hidden writing. */
function UVSweep({ still }: { still: boolean }) {
  const torch = useRef<THREE.Group>(null);
  const ink = useRef<THREE.MeshBasicMaterial>(null);
  const light = useRef<THREE.SpotLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  const tex = useMemo(() => uvInkTexture(), []);
  const inkCentre = useMemo(() => new THREE.Vector3(0.45, 0, 0.3), []);

  useFrame(({ clock }) => {
    const t = still ? 1.2 : clock.elapsedTime * 0.45;
    const x = 0.45 + Math.sin(t) * 0.42;
    const z = 0.3 + Math.cos(t * 1.3) * 0.12;
    torch.current?.position.set(x - 0.05, 0.42, z + 0.28);
    torch.current?.lookAt(x, 0, z);
    target.position.set(x, 0, z);
    target.updateMatrixWorld();
    if (ink.current) {
      const d = Math.hypot(x - inkCentre.x, z - inkCentre.z);
      ink.current.opacity = Math.max(0, 1 - d / 0.32);
    }
    if (light.current) light.current.target = target;
  });

  return (
    <>
      <primitive object={target} />
      <group ref={torch}>
        <group rotation-y={-Math.PI / 2}>
          <UVTorch beam />
        </group>
        <spotLight ref={light} angle={0.32} penumbra={0.7} intensity={9} distance={2} color="#9d6bff" />
      </group>
      <Paper seed={21} title="EXHIBIT 14" position={[0.45, 0.001, 0.3]} rotation-y={0.05} w={0.42} h={0.3} />
      <mesh rotation-x={-Math.PI / 2} position={[0.45, 0.006, 0.3]} rotation-z={0.05}>
        <planeGeometry args={[0.36, 0.18]} />
        <meshBasicMaterial ref={ink} map={tex} transparent opacity={0} toneMapped={false} />
      </mesh>
    </>
  );
}

export default function LandingScene({ reducedMotion, mobile }: { reducedMotion: boolean; mobile: boolean }) {
  const pose = mobile
    ? { position: [0.1, 2.2, 2.2] as [number, number, number], target: [0.1, 0, 0.1] as [number, number, number] }
    : { position: [-0.35, 1.25, 1.75] as [number, number, number], target: [0.35, 0.05, 0.05] as [number, number, number] };
  return (
    <SceneCanvas camera={{ position: pose.position, fov: mobile ? 50 : 38 }} className="absolute inset-0">
      <color attach="background" args={["#08090c"]} />
      <fog attach="fog" args={["#08090c", 3, 8]} />
      <ambientLight intensity={0.15} color="#9fb3d1" />
      <pointLight position={[2, 2, -1]} intensity={3} distance={5} color="#7a4dff" />
      <CameraRig pose={pose} reducedMotion={reducedMotion} parallax={0.18} drift={0.06} />
      <Room />
      <Desk />
      <DeskLamp position={[-1.3, 0, -0.55]} rotation-y={-0.5} intensity={30} />
      <CaseBox title="The Greenhouse Affair" sub="CASE AV-0614" lid={false} position={[1.05, 0, -0.35]} rotation-y={-0.5} />
      <CaseBox title="Classified" sub="COMING SOON" classified position={[1.35, 0, 0.35]} rotation-y={-0.9} />
      <Folder label="AV-0614" sub="Marchetti, O." stamp="OPEN" position={[-0.35, 0, 0.25]} rotation-y={0.25} count={6} />
      <Paper seed={5} title="POLICE REPORT" position={[-0.15, 0.02, -0.25]} rotation-y={-0.3} />
      <mesh rotation-x={-Math.PI / 2} position={[-0.75, 0.004, 0.45]} rotation-z={0.3}>
        <planeGeometry args={[0.16, 0.16]} />
        <meshStandardMaterial map={fingerprintTexture(3)} />
      </mesh>
      <EvidenceBag seed={3} position={[-0.95, 0, 0.1]} rotation-y={0.6} />
      <Flask position={[0.05, 0, -0.45]} />
      <Mug position={[-1.0, 0, -0.2]} />
      <UVSweep still={reducedMotion} />
    </SceneCanvas>
  );
}
