import { Canvas } from "@react-three/fiber";
import { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { City } from "./City";
import { Player, type PlayerHandle } from "./Player";
import { SkyAndLights } from "./Sky";
import { Zombies } from "./Zombies";
import { Bullets, type BulletsHandle } from "./Bullets";
import { HUD } from "./HUD";
import { StartScreen, DeathScreen } from "./StartScreen";
import { useGame } from "./store";

export function Game() {
  const started = useGame((s) => s.started);
  const health = useGame((s) => s.health);
  const playerRef = useRef<PlayerHandle>(null);
  const playerPosRef = useRef<THREE.Vector3 | null>(null);
  const bulletsApi = useRef<BulletsHandle | null>(null);
  const hitHandlerRef = useRef<
    ((origin: THREE.Vector3, dir: THREE.Vector3, isMelee: boolean) => void) | null
  >(null);

  // Update player pos ref each frame via interval (cheap)
  useEffect(() => {
    const id = setInterval(() => {
      if (playerRef.current) {
        playerPosRef.current = playerRef.current.getPosition();
      }
    }, 50);
    return () => clearInterval(id);
  }, []);

  const handleShoot = (origin: THREE.Vector3, dir: THREE.Vector3) => {
    bulletsApi.current?.spawn(origin, dir);
    hitHandlerRef.current?.(origin, dir, false);
  };
  const handleMelee = (origin: THREE.Vector3, dir: THREE.Vector3) => {
    hitHandlerRef.current?.(origin, dir, true);
  };

  return (
    <div className="absolute inset-0">
      <Canvas
        shadows
        camera={{ fov: 70, near: 0.1, far: 400, position: [0, 4, 8] }}
        gl={{ antialias: true }}
      >
        <SkyAndLights />
        <City />
        {started && (
          <>
            <Player ref={playerRef} onShoot={handleShoot} onMelee={handleMelee} />
            <Zombies
              playerRef={playerPosRef}
              registerHit={(h) => (hitHandlerRef.current = h)}
            />
            <Bullets apiRef={bulletsApi} />
          </>
        )}
      </Canvas>

      {started && <HUD />}
      {!started && <StartScreen />}
      {started && health <= 0 && <DeathScreen />}

      {started && (
        <ClickToFocus />
      )}
    </div>
  );
}

function ClickToFocus() {
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    const f = () => setLocked(!!document.pointerLockElement);
    document.addEventListener("pointerlockchange", f);
    return () => document.removeEventListener("pointerlockchange", f);
  }, []);
  if (locked) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      <div className="panel rounded-md px-6 py-3 font-mono text-sm">
        Click to play · ESC to release mouse
      </div>
    </div>
  );
}
