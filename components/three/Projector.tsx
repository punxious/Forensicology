"use client";

import { useMemo, useRef, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export type Vec3 = [number, number, number];
export type Anchor = { id: string; position: Vec3 };
export type AnchorRegistry = { current: Map<string, HTMLElement> };

export function useAnchorRegistry(): AnchorRegistry {
  return useRef(new Map<string, HTMLElement>());
}

/**
 * Lives inside the <Canvas>. Each frame, moves the DOM label registered for an
 * anchor to that anchor's on-screen position. The labels themselves are plain
 * DOM in the page's React tree, so they keep normal tab order.
 */
export function Projector({ anchors, registry }: { anchors: Anchor[]; registry: AnchorRegistry }) {
  const { camera, size } = useThree();
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    for (const a of anchors) {
      const el = registry.current.get(a.id);
      if (!el) continue;
      v.set(...a.position).project(camera);
      const x = (v.x * 0.5 + 0.5) * size.width;
      const y = (-v.y * 0.5 + 0.5) * size.height;
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      el.style.visibility = v.z < 1 ? "visible" : "hidden";
    }
  });
  return null;
}

/** A DOM label that the Projector positions. Hidden (not unmounted) when `visible` is false. */
export function Label({ id, registry, visible = true, children }: { id: string; registry: AnchorRegistry; visible?: boolean; children: ReactNode }) {
  return (
    <div
      ref={(el) => {
        if (el) registry.current.set(id, el);
        else registry.current.delete(id);
      }}
      hidden={!visible}
      className="pointer-events-auto absolute top-0 left-0 z-10"
      style={{ visibility: "hidden" }}
    >
      {children}
    </div>
  );
}
