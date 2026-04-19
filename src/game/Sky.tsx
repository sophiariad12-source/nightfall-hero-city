import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { useGame } from "./store";

export function SkyAndLights() {
  const sunRef = useRef<THREE.DirectionalLight>(null!);
  const ambientRef = useRef<THREE.AmbientLight>(null!);
  const moonRef = useRef<THREE.DirectionalLight>(null!);
  const { scene } = useThree();
  const setTimeOfDay = useGame((s) => s.setTimeOfDay);

  useFrame((_, dt) => {
    // Time progresses; full day = 180s
    const t = useGame.getState().timeOfDay + dt / 180;
    setTimeOfDay(t);
    const tod = useGame.getState().timeOfDay;

    // Sun position
    const sunAngle = (tod - 0.25) * Math.PI * 2;
    const sunY = Math.sin(sunAngle);
    const sunX = Math.cos(sunAngle);
    if (sunRef.current) {
      sunRef.current.position.set(sunX * 100, sunY * 100, 50);
      sunRef.current.intensity = Math.max(0, sunY) * 1.5;
    }
    if (moonRef.current) {
      moonRef.current.position.set(-sunX * 100, -sunY * 100, 50);
      moonRef.current.intensity = Math.max(0, -sunY) * 0.4;
    }

    // Sky color blend
    const dayColor = new THREE.Color("#7eb8d9");
    const sunsetColor = new THREE.Color("#d97a3a");
    const nightColor = new THREE.Color("#0a0a18");
    let bg: THREE.Color;
    if (sunY > 0.2) bg = dayColor;
    else if (sunY > -0.1) {
      const k = (sunY + 0.1) / 0.3;
      bg = nightColor.clone().lerp(sunsetColor, Math.min(1, k * 1.5)).lerp(dayColor, Math.max(0, k - 0.5) * 2);
    } else bg = nightColor;
    scene.background = bg;
    scene.fog = new THREE.Fog(bg, 40, 180);

    if (ambientRef.current) {
      ambientRef.current.intensity = sunY > 0 ? 0.5 + sunY * 0.3 : 0.15;
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.4} />
      <directionalLight
        ref={sunRef}
        castShadow
        intensity={1.2}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-camera-far={300}
        color="#fff4d6"
      />
      <directionalLight ref={moonRef} intensity={0} color="#9bb8d9" />
    </>
  );
}
