"use client";

import { useState, type ReactNode } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import type { StationKind } from "@/lib/engine/stations";
import { WALL_STATIONS } from "@/lib/engine/stations";
import SceneCanvas from "./SceneCanvas";
import { Label, Projector, useAnchorRegistry, type Anchor } from "./Projector";
import { CameraRig, type CameraPose } from "./CameraRig";
import {
  CaseBox,
  Corkboard,
  Desk,
  DeskLamp,
  EvidenceBag,
  FinalReport,
  Flask,
  Folder,
  Journal,
  LightBox,
  Lockbox,
  Microscope,
  Mug,
  Paper,
  PulseRing,
  Room,
  Safe,
  SealTape,
  TapeRecorder,
  TimelineWall,
  UVTorch,
} from "./objects";

export type LabStation = {
  index: number;
  kind: StationKind;
  /** null while the puzzle is still locked. */
  puzzleId: string | null;
  title?: string;
  solved?: boolean;
};

import type { Vec3 } from "./Projector";

const DESK_SLOTS: { pos: Vec3; rot: number }[] = [
  { pos: [-1.1, 0, 0.3], rot: 0.25 },
  { pos: [1.15, 0, 0.35], rot: -0.3 },
  { pos: [-0.5, 0, -0.42], rot: 0.1 },
  { pos: [0.4, 0, -0.42], rot: -0.05 },
  { pos: [1.2, 0, -0.42], rot: -0.35 },
  { pos: [-1.25, 0, -0.4], rot: 0.35 },
  { pos: [-0.85, 0, 0.62], rot: 0.15 },
  { pos: [0.95, 0, 0.66], rot: -0.15 },
];
const WALL_SLOTS: Vec3[] = [
  [-0.85, 0.82, -1.66],
  [0.85, 0.82, -1.66],
  [0, 1.45, -1.66],
];
// Portrait phones: a narrow, deep desk in two columns.
const MOBILE_DESK_SLOTS: { pos: Vec3; rot: number }[] = [
  { pos: [-0.42, 0, 0.15], rot: 0.15 },
  { pos: [0.42, 0, 0.15], rot: -0.15 },
  { pos: [-0.42, 0, -0.35], rot: 0.1 },
  { pos: [0.42, 0, -0.35], rot: -0.1 },
  { pos: [-0.42, 0, -0.82], rot: 0.1 },
  { pos: [0.42, 0, -0.82], rot: -0.1 },
  { pos: [-0.42, 0, -1.25], rot: 0.1 },
  { pos: [0.42, 0, -1.25], rot: -0.1 },
];
const MOBILE_WALL_SLOTS: Vec3[] = [
  [-0.42, 0.6, -1.66],
  [0.42, 0.6, -1.66],
  [0, 1.05, -1.66],
];
const CASE_FILE_POS: Vec3 = [-0.33, 0, 0.5];
const REPORT_POS: Vec3 = [0.33, 0, 0.5];
const MOBILE_CASE_FILE_POS: Vec3 = [-0.4, 0, 0.62];
const MOBILE_REPORT_POS: Vec3 = [0.4, 0, 0.62];

/** Assigns each station a fixed spot so props never jump around as puzzles unlock. */
export function layoutStations(stations: LabStation[], mobile = false) {
  const deskSlots = mobile ? MOBILE_DESK_SLOTS : DESK_SLOTS;
  const wallSlots = mobile ? MOBILE_WALL_SLOTS : WALL_SLOTS;
  let desk = 0;
  let wall = 0;
  return stations.map((s) => {
    if (s.kind === "report") return { ...s, pos: mobile ? MOBILE_REPORT_POS : REPORT_POS, rot: 0, wall: false };
    if (WALL_STATIONS.has(s.kind)) {
      const pos = wallSlots[wall++ % wallSlots.length]!;
      return { ...s, pos, rot: 0, wall: true };
    }
    const slot = deskSlots[desk % deskSlots.length]!;
    const row = Math.floor(desk++ / deskSlots.length);
    return { ...s, pos: [slot.pos[0], slot.pos[1], slot.pos[2] - row * 0.25] as Vec3, rot: slot.rot, wall: false };
  });
}

function Prop({ kind }: { kind: StationKind }) {
  switch (kind) {
    case "lockbox":
      return <Lockbox />;
    case "journal":
      return <Journal />;
    case "safe":
      return <Safe />;
    case "microscope":
      return <Microscope />;
    case "recorder":
      return <TapeRecorder />;
    case "lightbox":
      return <LightBox />;
    case "corkboard":
      return <Corkboard w={1.3} h={0.82} />;
    case "timeline":
      return <TimelineWall />;
    case "report":
      return <FinalReport />;
  }
}

function Interactive({ children, onSelect, disabled }: { children: ReactNode; onSelect?: () => void; disabled?: boolean }) {
  const [hover, setHover] = useState(false);
  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (disabled) return;
    setHover(true);
    document.body.style.cursor = "pointer";
  };
  const out = () => {
    setHover(false);
    document.body.style.cursor = "";
  };
  return (
    <group
      onPointerOver={over}
      onPointerOut={out}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) {
          out();
          onSelect?.();
        }
      }}
      position-y={hover ? 0.025 : 0}
    >
      {children}
    </group>
  );
}

const pill =
  "flex max-w-[42vw] items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-left text-[11px] font-semibold shadow-lg backdrop-blur sm:max-w-[15rem] sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-sm";

type Props = {
  mode: "intro" | "play" | "done";
  caseTitle: string;
  stations: (LabStation & { title?: string; solved?: boolean })[];
  evidenceCount: number;
  newEvidence: number;
  focus: string | null;
  /** Shift the focused prop left so it stays visible beside a side panel. */
  panelSide: boolean;
  showHotspots: boolean;
  reducedMotion: boolean;
  paused: boolean;
  mobile: boolean;
  onSelect: (puzzleId: string) => void;
  onOpenCaseFile: () => void;
  onFail: () => void;
};

export default function LabScene(props: Props) {
  const { mode, stations, focus, panelSide, mobile } = props;
  const registry = useAnchorRegistry();
  const laid = layoutStations(stations, mobile);
  const caseFilePos = mobile ? MOBILE_CASE_FILE_POS : CASE_FILE_POS;
  const wallScale = mobile ? 0.6 : 1;
  const focused = focus === "case-file" ? { pos: caseFilePos, wall: false } : laid.find((s) => s.puzzleId && s.puzzleId === focus);

  const overview: CameraPose = mobile
    ? { position: [0, 3.3, 3.1], target: [0, 0.15, -0.4] }
    : { position: [0, 2.15, 3.0], target: [0, 0.32, -0.45] };
  let pose = overview;
  if (mode === "intro") pose = mobile ? { position: [0, 1.5, 1.9], target: [0, 0.1, 0.2] } : { position: [0.2, 1.05, 1.55], target: [0.45, 0.1, 0.25] };
  else if (focused) {
    const [x, y, z] = focused.pos;
    const shift = panelSide ? 0.5 : 0;
    pose = focused.wall
      ? { position: [x, y + 0.1, z + 2.1], target: [x + shift * 1.5, y, z] }
      : { position: [x - 0.05, y + 0.95, z + 1.3], target: [x + shift, y + 0.1, z] };
  }

  const labelHeight = (s: (typeof laid)[number]) => (s.wall ? 0.6 * wallScale : s.kind === "microscope" ? 0.52 : 0.38);
  const anchors: Anchor[] =
    mode === "play"
      ? [
          { id: "case-file", position: [caseFilePos[0], 0.16, caseFilePos[2]] },
          ...laid.map((s) => ({ id: `station-${s.index}`, position: [s.pos[0], s.pos[1] + labelHeight(s), s.pos[2] + (s.wall ? 0.1 : 0)] as Vec3 })),
        ]
      : [];

  const overlay =
    mode === "play" ? (
      <>
        <Label id="case-file" registry={registry} visible={props.showHotspots}>
          <button type="button" onClick={props.onOpenCaseFile} className={`${pill} border-[#d4b679] bg-[#2b2519]/90 text-[#f3e6c4]`}>
            <span aria-hidden="true">📁</span>
            <span>
              Case file · {props.evidenceCount}
              {props.newEvidence > 0 && <span className="ml-1 rounded-sm bg-[#e0644f] px-1 text-[10px] text-black">{props.newEvidence} new</span>}
            </span>
          </button>
        </Label>
        {laid.map((s) => (
          <Label key={s.index} id={`station-${s.index}`} registry={registry} visible={props.showHotspots}>
            {s.puzzleId ? (
              <button
                type="button"
                onClick={() => props.onSelect(s.puzzleId!)}
                className={`${pill} ${s.solved ? "border-[#6fd69a]/60 bg-[#0f1a14]/85 text-[#cfeedd]" : "border-[#b393ff] bg-[#140f22]/90 text-white"}`}
              >
                <span aria-hidden="true">{s.solved ? "✔" : s.kind === "report" ? "⚖" : "◉"}</span>
                <span className="truncate">{s.title}</span>
                <span className="text-[10px] tracking-wider uppercase opacity-80">{s.solved ? "Solved" : "Open"}</span>
              </button>
            ) : (
              <span className={`${pill} border-[#e8c21a]/50 bg-black/70 text-[#e8c21a]`}>
                <span aria-hidden="true">🔒</span> Sealed lead
              </span>
            )}
          </Label>
        ))}
      </>
    ) : null;

  return (
    <SceneCanvas
      camera={{ position: overview.position, fov: mobile ? 52 : 40 }}
      className="absolute inset-0"
      paused={props.paused}
      onFail={props.onFail}
      overlay={overlay}
    >
      <color attach="background" args={["#0b0d10"]} />
      <fog attach="fog" args={["#0b0d10", 4, 11]} />
      <ambientLight intensity={0.32} color="#9fb3d1" />
      <pointLight position={[0, 1.7, -0.9]} intensity={3.5} distance={3.2} color="#cfd8e8" />
      <directionalLight position={[-3, 4, 2]} intensity={0.25} color="#8aa0c8" />
      <pointLight position={[2.5, 2.2, -1]} intensity={4} distance={6} color="#8f5cff" />
      <CameraRig pose={pose} reducedMotion={props.reducedMotion} parallax={focused ? 0.04 : 0.15} drift={mode === "done" ? 0.15 : 0} />
      <Projector anchors={anchors} registry={registry} />

      <Room />
      {mobile ? <Desk width={1.75} depth={3.1} position={[0, 0, -0.3]} /> : <Desk />}
      <DeskLamp position={mobile ? [0.8, 0, 0.95] : [-1.5, 0, -0.62]} rotation-y={mobile ? 2.2 : -0.35} intensity={mode === "intro" ? 34 : 26} />

      {/* set dressing (desktop only; phones keep the desk clear) */}
      {!mobile && (
        <>
          <Flask position={[1.5, 0, 0.05]} />
          <Mug position={[1.48, 0, 0.62]} />
          <UVTorch position={[0.05, 0.02, 0.82]} rotation-y={0.4} />
          <EvidenceBag seed={1} position={[-1.45, 0, 0.72]} rotation-y={0.4} />
          <EvidenceBag seed={2} position={[1.55, 0, -0.75]} rotation-y={-0.2} />
          <Paper seed={9} position={[0.95, 0, 0.15]} rotation-y={-0.4} stamp="EV" />
        </>
      )}

      {mode === "intro" ? (
        <>
          <CaseBox title={props.caseTitle} sub="CASE FILE · RESTRICTED" position={[0.5, 0, 0.15]} rotation-y={-0.25} />
          <Paper seed={3} title="BRIEFING" position={[-0.1, 0, 0.45]} rotation-y={0.2} />
        </>
      ) : (
        <>
          {/* Case file: the stack grows with the evidence count */}
          <group position={caseFilePos} rotation-y={0.08}>
            <Interactive onSelect={props.onOpenCaseFile}>
              <Folder label="CASE FILE" sub={`${props.evidenceCount} items`} count={Math.max(2, Math.ceil(props.evidenceCount / 3))} />
            </Interactive>
          </group>

          {laid.map((s) => {
            const open = !!s.puzzleId;
            return (
              <group key={s.index} position={s.pos} rotation-y={s.rot} scale={s.wall ? wallScale : 1}>
                <Interactive disabled={!open} onSelect={() => s.puzzleId && props.onSelect(s.puzzleId)}>
                  <group scale={open ? 1 : 0.96}>
                    <Prop kind={s.kind} />
                  </group>
                </Interactive>
                {!open && !s.wall && <SealTape position={[0, s.kind === "microscope" ? 0.16 : 0.12, 0]} />}
                {!open && s.wall && (
                  <mesh position={[0, 0, 0.05]} rotation-z={0.25}>
                    <planeGeometry args={[1.4, 0.07]} />
                    <meshStandardMaterial color="#e8c21a" />
                  </mesh>
                )}
                {open && !s.solved && mode === "play" && !s.wall && <PulseRing radius={0.3} />}
              </group>
            );
          })}
        </>
      )}
    </SceneCanvas>
  );
}
