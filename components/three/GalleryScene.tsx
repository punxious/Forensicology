"use client";

import { useState } from "react";
import { RoundedBox } from "@react-three/drei";
import SceneCanvas from "./SceneCanvas";
import { CameraRig, type CameraPose } from "./CameraRig";
import { Label, Projector, useAnchorRegistry } from "./Projector";
import { CaseBox } from "./objects";
import { wallTexture } from "./textures";

export type ShelfCase = { slug: string; title: string; sub: string };

const SLOTS = 8;

/** Archive shelving. Real cases sit among classified boxes still to come. */
export default function GalleryScene({ cases, onOpen, reducedMotion, mobile }: { cases: ShelfCase[]; onOpen: (slug: string) => void; reducedMotion: boolean; mobile: boolean }) {
  const [hover, setHover] = useState<string | null>(null);
  const [opening, setOpening] = useState<number | null>(null);
  const registry = useAnchorRegistry();
  const perShelf = mobile ? 2 : 4;
  const shelves = Math.ceil(SLOTS / perShelf);
  const slot = (i: number): [number, number, number] => [
    ((i % perShelf) - (perShelf - 1) / 2) * 0.62,
    1.55 - Math.floor(i / perShelf) * 0.55,
    0,
  ];
  const width = perShelf * 0.62 + 0.2;
  const centreY = 1.55 - ((shelves - 1) * 0.55) / 2 + 0.15;
  const overview: CameraPose = mobile
    ? { position: [0, centreY + 0.1, 3.6], target: [0, centreY + 0.05, 0] }
    : { position: [0, centreY + 0.15, 2.7], target: [0, centreY + 0.05, 0] };
  const pose: CameraPose =
    opening !== null ? { position: [slot(opening)[0], slot(opening)[1] + 0.2, 0.9], target: [slot(opening)[0], slot(opening)[1] + 0.15, 0] } : overview;

  const open = (slug: string, i: number) => {
    setOpening(i);
    setTimeout(() => onOpen(slug), reducedMotion ? 0 : 650);
  };

  const anchors = cases.slice(0, SLOTS).map((c, i) => {
    const [x, y, z] = slot(i);
    // Labels stay put when a box lifts, so a press never slides out from under the pointer.
    return { id: c.slug, position: [x, y + 0.48, z + 0.1] as [number, number, number] };
  });
  const overlay = cases.slice(0, SLOTS).map((c, i) => (
    <Label key={c.slug} id={c.slug} registry={registry} visible={opening === null}>
      <button
        type="button"
        onClick={() => open(c.slug, i)}
        onFocus={() => setHover(c.slug)}
        onBlur={() => setHover(null)}
        className="flex items-center gap-1.5 rounded-full border border-[#b393ff] bg-[#140f22]/90 px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-white shadow-lg sm:text-sm"
      >
        <span aria-hidden="true">◉</span> Open {c.title}
      </button>
    </Label>
  ));

  return (
    <SceneCanvas camera={{ position: overview.position, fov: mobile ? 55 : 42 }} className="absolute inset-0" overlay={overlay}>
      <Projector anchors={anchors} registry={registry} />
      <color attach="background" args={["#0a0b0e"]} />
      <fog attach="fog" args={["#0a0b0e", 3, 7]} />
      <ambientLight intensity={0.25} color="#a9b8d0" />
      <spotLight position={[0, 3.2, 1.6]} angle={0.75} penumbra={0.7} intensity={30} distance={7} decay={1.5} color="#ffdcae" castShadow />
      <pointLight position={[-2, 1.5, 1]} intensity={2.5} color="#7a4dff" distance={5} />
      <CameraRig pose={pose} reducedMotion={reducedMotion} parallax={0.12} />

      <mesh position={[0, 1.2, -0.45]} receiveShadow>
        <planeGeometry args={[8, 4]} />
        <meshStandardMaterial map={wallTexture()} />
      </mesh>
      {/* shelving unit */}
      {Array.from({ length: shelves }, (_, s) => (
        <mesh key={s} position={[0, 1.55 - s * 0.55 - 0.02, 0]} receiveShadow castShadow>
          <boxGeometry args={[width, 0.03, 0.5]} />
          <meshStandardMaterial color="#4a4f57" metalness={0.6} roughness={0.45} />
        </mesh>
      ))}
      {[-1, 1].map((sx) => (
        <RoundedBox key={sx} args={[0.04, shelves * 0.55 + 0.3, 0.5]} radius={0.005} position={[(sx * width) / 2, 1.55 - ((shelves - 1) * 0.55) / 2, 0]}>
          <meshStandardMaterial color="#3b3f46" metalness={0.6} roughness={0.45} />
        </RoundedBox>
      ))}

      {Array.from({ length: SLOTS }, (_, i) => {
        const c = cases[i];
        const [x, y, z] = slot(i);
        const lifted = c && (hover === c.slug || opening === i);
        return (
          <group key={i} position={[x, y, z + (lifted ? 0.12 : 0)]} rotation-y={c ? 0 : ((i * 7) % 5 - 2) * 0.03}>
            <group
              scale={0.95}
              onPointerOver={(e) => {
                if (!c) return;
                e.stopPropagation();
                setHover(c.slug);
                document.body.style.cursor = "pointer";
              }}
              onPointerOut={() => {
                setHover(null);
                document.body.style.cursor = "";
              }}
              onClick={(e) => {
                if (!c) return;
                e.stopPropagation();
                document.body.style.cursor = "";
                open(c.slug, i);
              }}
            >
              <CaseBox title={c?.title ?? "Classified"} sub={c?.sub ?? "COMING SOON"} classified={!c} />
            </group>
          </group>
        );
      })}
    </SceneCanvas>
  );
}
