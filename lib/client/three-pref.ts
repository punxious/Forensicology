"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether to show the 3D scenes. Defaults to on when the device can handle
 * WebGL comfortably; players can switch to the flat layout at any time and the
 * choice is remembered in this browser.
 */
const KEY = "fx-3d";
const EVENT = "fx-3d-change";

/**
 * Cheap capability check. Creating a real WebGL context here would cost a lot
 * of main-thread time on every page; if context creation fails later, the
 * scene's error boundary falls back to the flat layout.
 */
function webglSupported(): boolean {
  return typeof window !== "undefined" && ("WebGL2RenderingContext" in window || "WebGLRenderingContext" in window);
}

let cachedDefault: boolean | null = null;
function deviceDefault(): boolean {
  if (cachedDefault !== null) return cachedDefault;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const weak = (nav.deviceMemory !== undefined && nav.deviceMemory < 4) || nav.connection?.saveData === true;
  cachedDefault = webglSupported() && !weak;
  return cachedDefault;
}

function read(): "on" | "off" {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "on") return webglSupported() ? "on" : "off";
    if (v === "off") return "off";
  } catch {
    /* storage unavailable */
  }
  return deviceDefault() ? "on" : "off";
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function setThreeD(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** "pending" during server rendering and hydration, then "on" or "off". */
export function useThreeD(): "pending" | "on" | "off" {
  return useSyncExternalStore(subscribe, read, () => "pending");
}

const motionQuery = "(prefers-reduced-motion: reduce)";
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = matchMedia(motionQuery);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => matchMedia(motionQuery).matches,
    () => false,
  );
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => matchMedia(query).matches,
    () => false,
  );
}
