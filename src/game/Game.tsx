import { Canvas } from "@react-three/fiber";
import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import * as THREE from "three";
import { City, getBuildingBounds, getShopMarkerBounds } from "./City";
import { Player, type PlayerHandle, type CollisionBox } from "./Player";
import { SkyAndLights } from "./Sky";
import { Zombies } from "./Zombies";
import { Bullets, type BulletsHandle } from "./Bullets";
import { HUD } from "./HUD";
import { StartScreen, DeathScreen } from "./StartScreen";
import { ShopUI } from "./ShopUI";
import {
  Interior,
  getInteriorBounds,
  getInteriorWorldLimits,
  DOOR_POS,
} from "./Interior";
import { Owner } from "./Owner";
import { useGame, SHOPS, type SceneId } from "./store";
import { RemotePlayers } from "@/multiplayer/RemotePlayers";
import { MultiplayerBridge } from "@/multiplayer/MultiplayerBridge";
import { ProfileSync } from "@/multiplayer/ProfileSync";
import { RoomBar } from "@/multiplayer/RoomBar";
import { KillFeed } from "@/multiplayer/KillFeed";
import { useMultiplayer } from "@/multiplayer/MultiplayerProvider";
import { Lobby } from "@/multiplayer/Lobby";
import { useAuth } from "@/multiplayer/AuthProvider";
import { AuthScreen } from "@/multiplayer/AuthScreen";

const CITY_LIMITS = {
  min: { x: -180, z: -180 },
  max: { x: 180, z: 180 },
};

export function Game() {
  const started = useGame((s) => s.started);
  const health = useGame((s) => s.health);
  const scene = useGame((s) => s.scene);
  const shopUIOpen = useGame((s) => s.shopUIOpen);
  const enterScene = useGame((s) => s.enterScene);
  const exitToCity = useGame((s) => s.exitToCity);
  const openShopUI = useGame((s) => s.openShopUI);

  const playerRef = useRef<PlayerHandle>(null);
  const playerPosRef = useRef<THREE.Vector3 | null>(null);
  const bulletsApi = useRef<BulletsHandle | null>(null);
  // Hit handlers — set by Zombies or Owner. We dispatch to whichever is active.
  const zombieHitRef = useRef<
    ((o: THREE.Vector3, d: THREE.Vector3, isMelee: boolean) => void) | null
  >(null);
  const ownerHitRef = useRef<
    ((o: THREE.Vector3, d: THREE.Vector3, isMelee: boolean) => void) | null
  >(null);

  // Track player position cheaply
  useEffect(() => {
    const id = setInterval(() => {
      if (playerRef.current) {
        const p = playerRef.current.getPosition();
        playerPosRef.current = p;
        (window as any).__playerRefPos = { x: p.x, z: p.z };
      }
    }, 50);
    return () => clearInterval(id);
  }, []);

  // City bounds (buildings + shop awnings)
  const cityBounds = useMemo<CollisionBox[]>(
    () => [...getBuildingBounds(), ...getShopMarkerBounds()],
    []
  );
  const interiorBounds = useMemo<CollisionBox[]>(() => getInteriorBounds(), []);
  const interiorLimits = useMemo(() => getInteriorWorldLimits(), []);

  // Pick start position based on scene
  const startPos = useMemo(() => {
    if (scene === "city") {
      // Spawn in front of last shop you exited (or default origin)
      const last = (window as any).__lastShop as SceneId | undefined;
      if (last && last !== "city") {
        const s = SHOPS.find((x) => x.id === last);
        if (s) return { x: s.x, z: s.z + 4, yaw: Math.PI };
      }
      return { x: 0, z: 0, yaw: 0 };
    }
    // Interior: spawn near door facing counter
    return { x: DOOR_POS.x, z: DOOR_POS.z - 1, yaw: 0 };
  }, [scene]);

  // Interaction: press E
  const handleInteract = useCallback(() => {
    const pos = playerRef.current?.getPosition();
    if (!pos) return;
    if (scene === "city") {
      // Check proximity to any shop
      for (const shop of SHOPS) {
        const dx = pos.x - shop.x;
        const dz = pos.z - shop.z;
        if (dx * dx + dz * dz < 16) {
          (window as any).__lastShop = shop.id;
          enterScene(shop.id);
          return;
        }
      }
    } else if (scene === "bodega") {
      // Pressing E in bodega does nothing extra — must shoot owner
      // But allow exit if near door
      if (Math.abs(pos.x - DOOR_POS.x) < 2 && pos.z > DOOR_POS.z - 1.5) {
        exitToCity();
      }
    } else {
      // gun/blade/clothing shop: open UI
      const pos2 = playerRef.current?.getPosition();
      if (!pos2) return;
      // Open if near counter or anywhere inside really
      openShopUI(scene);
    }
  }, [scene, enterScene, exitToCity, openShopUI]);

  // Auto-exit interior when walking through the door
  useEffect(() => {
    if (scene === "city") return;
    const id = setInterval(() => {
      const pos = playerRef.current?.getPosition();
      if (!pos) return;
      if (pos.z > DOOR_POS.z + 0.3 && Math.abs(pos.x - DOOR_POS.x) < 1.2) {
        exitToCity();
      }
    }, 100);
    return () => clearInterval(id);
  }, [scene, exitToCity]);

  // Auto-open shop UI when near counter (non-bodega shops)
  useEffect(() => {
    if (scene === "city" || scene === "bodega") return;
    const id = setTimeout(() => {
      // Auto-open after entering
      openShopUI(scene);
    }, 400);
    return () => clearTimeout(id);
  }, [scene, openShopUI]);

  // Combine hit dispatchers: shooting fires both — only one will be active per scene
  const handleShoot = useCallback((origin: THREE.Vector3, dir: THREE.Vector3) => {
    bulletsApi.current?.spawn(origin, dir);
    if (scene === "city") zombieHitRef.current?.(origin, dir, false);
    else if (scene === "bodega") ownerHitRef.current?.(origin, dir, false);
    // PvP hit test against remote players
    (window as any).__mpHitTest?.(origin, dir, false);
    // Broadcast shot tracer to other players
    (window as any).__mpBroadcastShot?.(origin, dir, "gun");
  }, [scene]);
  const handleMelee = useCallback((origin: THREE.Vector3, dir: THREE.Vector3) => {
    if (scene === "city") zombieHitRef.current?.(origin, dir, true);
    else if (scene === "bodega") ownerHitRef.current?.(origin, dir, true);
    (window as any).__mpHitTest?.(origin, dir, true);
  }, [scene]);

  // Bullet tracer for owner shots
  const spawnTracer = useCallback((from: THREE.Vector3, to: THREE.Vector3) => {
    const dir = to.clone().sub(from).normalize();
    bulletsApi.current?.spawn(from, dir);
  }, []);

  const inCity = scene === "city";
  const playerInputEnabled = started && !shopUIOpen && health > 0;

  return (
    <div className="absolute inset-0">
      <Canvas
        shadows
        camera={{ fov: 70, near: 0.1, far: 400, position: [0, 4, 8] }}
        gl={{ antialias: true }}
      >
        {inCity ? (
          <>
            <SkyAndLights />
            <City />
            {started && (
              <>
                <Zombies
                  playerRef={playerPosRef}
                  registerHit={(h) => (zombieHitRef.current = h)}
                />
              </>
            )}
          </>
        ) : (
          <Interior sceneId={scene} />
        )}

        {started && (
          <>
            <Player
              ref={playerRef}
              onShoot={handleShoot}
              onMelee={handleMelee}
              onInteract={handleInteract}
              bounds={inCity ? cityBounds : interiorBounds}
              worldMin={inCity ? CITY_LIMITS.min : interiorLimits.min}
              worldMax={inCity ? CITY_LIMITS.max : interiorLimits.max}
              inputEnabled={playerInputEnabled}
              startPos={startPos}
            />
            {scene === "bodega" && (
              <Owner
                playerPosRef={playerPosRef}
                registerHit={(h) => (ownerHitRef.current = h)}
                spawnTracer={spawnTracer}
              />
            )}
            <Bullets apiRef={bulletsApi} />
          </>
        )}
      </Canvas>

      {started && <HUD />}
      {started && <InteractionPrompt />}
      {!started && <StartScreen />}
      {started && health <= 0 && <DeathScreen />}
      <ShopUI />
      {started && !shopUIOpen && health > 0 && <ClickToFocus />}
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

function InteractionPrompt() {
  const scene = useGame((s) => s.scene);
  const [near, setNear] = useState<string | null>(null);

  useEffect(() => {
    if (scene !== "city") {
      setNear(null);
      return;
    }
    const id = setInterval(() => {
      // Read player pos from window (set by Game's interval)
      const w = window as any;
      const pos = w.__playerPos as THREE.Vector3 | undefined;
      // We don't have direct access; fallback: query the canvas? Skip — use a global
      // Actually let's use a simpler approach: dispatch via custom event from Game
      // Re-implement by reading a global ref:
      const pr = w.__playerRefPos as { x: number; z: number } | undefined;
      if (!pr) return;
      let found: string | null = null;
      for (const shop of SHOPS) {
        const dx = pr.x - shop.x;
        const dz = pr.z - shop.z;
        if (dx * dx + dz * dz < 25) {
          found = shop.id === "bodega" ? "ROB the bodega" : `Enter ${shop.label}`;
          break;
        }
      }
      setNear(found);
    }, 150);
    return () => clearInterval(id);
  }, [scene]);

  if (!near) return null;
  return (
    <div className="pointer-events-none absolute bottom-32 left-1/2 -translate-x-1/2 z-20">
      <div className="panel rounded-md px-5 py-3 flex items-center gap-3">
        <span className="font-mono text-xs px-2 py-1 rounded border border-primary text-primary">E</span>
        <span className="font-display text-lg tracking-wide">{near}</span>
      </div>
    </div>
  );
}
