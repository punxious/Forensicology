"use client";

import { Component, useEffect, useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";

/** If WebGL fails mid-flight, drop the scene and keep the page working. */
class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

type Props = {
  children: ReactNode;
  camera: { position: [number, number, number]; fov?: number };
  className?: string;
  /** Pause rendering (e.g. a full-screen panel covers the scene). */
  paused?: boolean;
  shadows?: boolean;
  onFail?: () => void;
  /** DOM layer above the canvas (e.g. projected labels). */
  overlay?: ReactNode;
};

/**
 * Shared WebGL canvas. The <canvas> is hidden from assistive tech: every
 * interactive object has a real DOM button (hotspot) instead.
 */
export default function SceneCanvas({ children, camera, className = "", paused = false, shadows = true, onFail, overlay }: Props) {
  const [fontsReady, setFontsReady] = useState(false);
  const [visible, setVisible] = useState(false);

  // Canvas textures draw text, so wait for the web fonts first.
  useEffect(() => {
    let alive = true;
    const fonts = document.fonts;
    Promise.all([fonts.load('40px "Special Elite"'), fonts.load('26px "Courier Prime"')])
      .catch(() => undefined)
      .then(() => alive && setFontsReady(true));
    return () => {
      alive = false;
    };
  }, []);

  if (!fontsReady) return null;
  const mobile = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;

  return (
    <div className={`transition-opacity duration-700 ${visible ? "opacity-100" : "opacity-0"} ${className}`}>
      <SceneBoundary onError={() => onFail?.()}>
        <Canvas
          shadows={shadows && !mobile ? { type: THREE.PCFShadowMap } : false}
          dpr={[1, mobile ? 1.5 : 1.75]}
          frameloop={paused ? "demand" : "always"}
          camera={{ position: camera.position, fov: camera.fov ?? 40, near: 0.05, far: 60 }}
          gl={{ antialias: true, powerPreference: "high-performance" }}
          onCreated={({ gl }) => {
            gl.domElement.setAttribute("aria-hidden", "true");
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.05;
            setVisible(true);
          }}
        >
          {children}
        </Canvas>
        {overlay && (
          <div data-scene-overlay className="pointer-events-none absolute inset-0 overflow-hidden">
            {overlay}
          </div>
        )}
      </SceneBoundary>
    </div>
  );
}
