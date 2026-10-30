"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export type CameraPose = { position: [number, number, number]; target: [number, number, number] };

/**
 * Eases the camera towards a pose. Adds a little pointer parallax for depth
 * unless reduced motion is on, in which case it cuts straight to the pose.
 */
export function CameraRig({ pose, parallax = 0.12, reducedMotion = false, drift = 0 }: { pose: CameraPose; parallax?: number; reducedMotion?: boolean; drift?: number }) {
  const { camera, pointer } = useThree();
  const lookAt = useRef(new THREE.Vector3(...pose.target));
  const goalPos = useRef(new THREE.Vector3());
  const goalTarget = useRef(new THREE.Vector3());
  const first = useRef(true);

  useFrame(({ clock }, dt) => {
    const p = reducedMotion ? 0 : parallax;
    const t = clock.elapsedTime;
    const d = reducedMotion ? 0 : drift;
    goalPos.current.set(
      pose.position[0] + pointer.x * p + Math.sin(t * 0.15) * d,
      pose.position[1] + pointer.y * p * 0.5 + Math.sin(t * 0.11) * d * 0.4,
      pose.position[2],
    );
    goalTarget.current.set(...pose.target);
    if (reducedMotion || first.current) {
      camera.position.copy(goalPos.current);
      lookAt.current.copy(goalTarget.current);
      first.current = false;
    } else {
      const k = 1 - Math.exp(-dt * 3.2);
      camera.position.lerp(goalPos.current, k);
      lookAt.current.lerp(goalTarget.current, k);
    }
    camera.lookAt(lookAt.current);
  });
  return null;
}
