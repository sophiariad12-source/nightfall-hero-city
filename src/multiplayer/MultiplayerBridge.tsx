import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGame, weaponDamage } from "@/game/store";
import { useMultiplayer } from "./MultiplayerProvider";
import { useAuth } from "./AuthProvider";
import type { PlayerHandle } from "@/game/Player";
import type { BulletsHandle } from "@/game/Bullets";

interface Props {
  playerRef: React.RefObject<PlayerHandle | null>;
  bulletsApi: React.MutableRefObject<BulletsHandle | null>;
  inCity: boolean;
}

/**
 * Lives inside the Canvas. Each frame:
 *  - broadcasts our position/yaw/health/weapon to the room
 *  - listens for incoming damage and applies it to our local health
 *  - listens for remote shots and renders bullet tracers
 *  - exposes a hit-test against remote players (dispatched via window event from Game)
 */
export function MultiplayerBridge({ playerRef, bulletsApi, inCity }: Props) {
  const { user } = useAuth();
  const {
    room,
    broadcastPosition,
    broadcastDamageReport,
    broadcastKill,
    onIncomingDamage,
    onRemoteShot,
    remotePlayers,
  } = useMultiplayer();
  const health = useGame((s) => s.health);
  const activeWeapon = useGame((s) => s.activeWeapon);
  const takeDamage = useGame((s) => s.takeDamage);
  const addMoney = useGame((s) => s.addMoney);
  const addXP = useGame((s) => s.addXP);

  // Listen for damage from other players
  useEffect(() => {
    if (!room) return;
    return onIncomingDamage((dmg) => {
      takeDamage(dmg);
    });
  }, [room, onIncomingDamage, takeDamage]);

  // Render remote shot tracers
  useEffect(() => {
    if (!room) return;
    return onRemoteShot((s) => {
      const origin = new THREE.Vector3(s.ox, s.oy, s.oz);
      const dir = new THREE.Vector3(s.dx, s.dy, s.dz).normalize();
      bulletsApi.current?.spawn(origin, dir);
    });
  }, [room, onRemoteShot, bulletsApi]);

  // PvP hit dispatcher — exposed via window for Game to call when player shoots/melees
  useEffect(() => {
    if (!room || !user) return;
    (window as any).__mpHitTest = (
      origin: THREE.Vector3,
      dir: THREE.Vector3,
      isMelee: boolean
    ) => {
      if (!inCity) return; // PvP only in the city scene
      const state = useGame.getState();
      const dmg = weaponDamage(
        state.activeWeapon,
        state.activeWeapon === "gun" ? state.gunLevel : state.swordLevel
      );
      const range = isMelee ? 2.8 : 60;
      let bestId: string | null = null;
      let bestName: string | null = null;
      let bestHealth = 0;
      let bestDot = isMelee ? 0.5 : 0.985;
      for (const p of remotePlayers.values()) {
        if (p.health <= 0) continue;
        const target = new THREE.Vector3(p.x, p.y + 1.2, p.z);
        const to = target.clone().sub(origin);
        const dist = to.length();
        if (dist > range) continue;
        to.normalize();
        const dot = to.dot(dir);
        if (dot > bestDot) {
          bestDot = dot;
          bestId = p.userId;
          bestName = p.username;
          bestHealth = p.health;
        }
      }
      if (bestId && bestName) {
        broadcastDamageReport(bestId, dmg);
        // If we estimate this kill drops them, broadcast kill + claim reward
        if (bestHealth - dmg <= 0) {
          broadcastKill(bestId, bestName);
          addMoney(150);
          addXP(60);
          // mark kill in store
          useGame.setState((s) => ({
            // we'll repurpose ownersKilled-like counter via a separate field if needed
            ...s,
          }));
        }
      }
    };
    return () => {
      delete (window as any).__mpHitTest;
    };
  }, [
    room,
    user,
    inCity,
    remotePlayers,
    broadcastDamageReport,
    broadcastKill,
    addMoney,
    addXP,
  ]);

  // Broadcast our position every frame (throttled inside provider)
  useFrame(() => {
    if (!room || !playerRef.current) return;
    const pos = playerRef.current.getPosition();
    const dir = playerRef.current.getDirection();
    const yaw = Math.atan2(-dir.x, -dir.z);
    broadcastPosition({
      x: pos.x,
      y: pos.y,
      z: pos.z,
      yaw,
      health,
      weapon: activeWeapon,
    });
  });

  return null;
}
