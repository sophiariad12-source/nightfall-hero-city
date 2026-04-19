import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { useMultiplayer, type RemotePlayerState } from "./MultiplayerProvider";
import { OUTFITS } from "@/game/store";

export function RemotePlayers() {
  const { remotePlayers } = useMultiplayer();
  return (
    <>
      {Array.from(remotePlayers.values()).map((p) => (
        <RemotePlayer key={p.userId} player={p} />
      ))}
    </>
  );
}

function RemotePlayer({ player }: { player: RemotePlayerState }) {
  const groupRef = useRef<THREE.Group>(null!);
  // smoothing
  const target = useRef(new THREE.Vector3(player.x, player.y, player.z));
  const targetYaw = useRef(player.yaw);

  // Update target whenever player updates
  target.current.set(player.x, player.y, player.z);
  targetYaw.current = player.yaw;

  useFrame((_, dt) => {
    const g = groupRef.current;
    if (!g) return;
    // lerp position
    g.position.lerp(target.current, Math.min(1, dt * 12));
    // shortest-arc yaw lerp
    let diff = targetYaw.current - g.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    g.rotation.y += diff * Math.min(1, dt * 12);
  });

  const skin = player.gender === "male" ? "#d4a574" : "#e8b896";
  const outfit = OUTFITS.find((o) => o.id === player.outfit) ?? OUTFITS[0];
  const hair = player.gender === "male" ? "#3a2818" : "#5a3a28";
  const dead = player.health <= 0;

  return (
    <group ref={groupRef} position={[player.x, player.y, player.z]} rotation={[0, player.yaw, 0]}>
      {/* Body */}
      <mesh castShadow position={[0, 1.1, 0]}>
        <boxGeometry args={[0.6, 0.8, 0.35]} />
        <meshStandardMaterial color={dead ? "#3a1a1a" : outfit.shirt} />
      </mesh>
      {/* Head */}
      <mesh castShadow position={[0, 1.75, 0]}>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      {(!outfit.hat || player.gender === "female") && (
        <mesh castShadow position={[0, 1.95, player.gender === "female" ? -0.05 : 0]}>
          <boxGeometry args={[0.42, player.gender === "female" ? 0.5 : 0.15, player.gender === "female" ? 0.5 : 0.42]} />
          <meshStandardMaterial color={hair} />
        </mesh>
      )}
      {outfit.hat && (
        <mesh castShadow position={[0, 2.05, 0]}>
          <boxGeometry args={[0.46, 0.18, 0.46]} />
          <meshStandardMaterial color={outfit.hat} />
        </mesh>
      )}
      {/* Arms */}
      <mesh castShadow position={[-0.4, 1.1, 0]}>
        <boxGeometry args={[0.18, 0.75, 0.22]} />
        <meshStandardMaterial color={outfit.shirt} />
      </mesh>
      <mesh castShadow position={[0.4, 1.1, 0]}>
        <boxGeometry args={[0.18, 0.75, 0.22]} />
        <meshStandardMaterial color={outfit.shirt} />
      </mesh>
      {/* Legs */}
      <mesh castShadow position={[-0.16, 0.4, 0]}>
        <boxGeometry args={[0.22, 0.8, 0.25]} />
        <meshStandardMaterial color={outfit.pants} />
      </mesh>
      <mesh castShadow position={[0.16, 0.4, 0]}>
        <boxGeometry args={[0.22, 0.8, 0.25]} />
        <meshStandardMaterial color={outfit.pants} />
      </mesh>
      {/* Weapon */}
      <group position={[0.45, 1.2, -0.3]}>
        {player.weapon === "gun" ? (
          <mesh castShadow>
            <boxGeometry args={[0.15, 0.18, 0.5]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.3} />
          </mesh>
        ) : (
          <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
            <boxGeometry args={[0.08, 1.1, 0.04]} />
            <meshStandardMaterial color="#c0c0d0" metalness={0.9} roughness={0.2} />
          </mesh>
        )}
      </group>
      {/* Name tag */}
      <Html
        position={[0, 2.7, 0]}
        center
        distanceFactor={10}
        occlude={false}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <div
          style={{
            background: "rgba(0,0,0,0.7)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 4,
            padding: "2px 6px",
            fontFamily: "monospace",
            fontSize: 11,
            color: dead ? "#ff5544" : "#fff",
            textAlign: "center",
            whiteSpace: "nowrap",
          }}
        >
          {player.username} <span style={{ opacity: 0.7 }}>Lv{player.level}</span>
          {!dead && (
            <div
              style={{
                marginTop: 2,
                width: 60,
                height: 4,
                background: "#3a0a0a",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.max(0, Math.min(100, player.health))}%`,
                  height: "100%",
                  background: player.health > 50 ? "#33ff88" : player.health > 25 ? "#ffaa33" : "#ff3344",
                }}
              />
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}
