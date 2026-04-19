import { useMemo } from "react";
import { SHOPS, type SceneId, type ShopLocation } from "./store";
import type { CollisionBox } from "./Player";

interface Props {
  sceneId: Exclude<SceneId, "city">;
}

const SHOP_THEMES: Record<Exclude<SceneId, "city">, { wall: string; floor: string; accent: string; label: string; counter: string }> = {
  gun_shop: { wall: "#2a1f1f", floor: "#3a2a25", accent: "#ff5544", label: "GUN SHOP", counter: "#1a1a1a" },
  blade_shop: { wall: "#1f242a", floor: "#252a30", accent: "#55aaff", label: "BLADE WORKS", counter: "#1a1a1a" },
  clothing_shop: { wall: "#2a2520", floor: "#3a3530", accent: "#ffaa33", label: "THREADS", counter: "#3a2820" },
  bodega: { wall: "#2a3025", floor: "#1f2520", accent: "#33ff88", label: "BODEGA", counter: "#2a2520" },
};

// Interior layout: 20x20 room. Door at south (z = +9.5). Counter at north.
export const INTERIOR_SIZE = 20;
export const DOOR_POS = { x: 0, z: 9.5 };
export const COUNTER_POS = { x: 0, z: -7 };

export function Interior({ sceneId }: Props) {
  const theme = SHOP_THEMES[sceneId];
  const half = INTERIOR_SIZE / 2;

  // Stock decoration based on shop type
  const stock = useMemo(() => {
    const items: { x: number; y: number; z: number; w: number; h: number; d: number; color: string; emissive?: boolean }[] = [];
    if (sceneId === "gun_shop") {
      // Wall-mounted guns
      for (let i = -3; i <= 3; i++) {
        items.push({ x: i * 1.4, y: 2.2, z: -9.7, w: 1, h: 0.4, d: 0.15, color: "#1a1a1a" });
      }
    } else if (sceneId === "blade_shop") {
      for (let i = -3; i <= 3; i++) {
        items.push({ x: i * 1.4, y: 2.2, z: -9.7, w: 0.1, h: 1.2, d: 0.05, color: "#c0c0d0" });
      }
    } else if (sceneId === "clothing_shop") {
      // Mannequins
      for (let i = -2; i <= 2; i += 2) {
        items.push({ x: i * 2, y: 0.9, z: -8, w: 0.7, h: 1.8, d: 0.5, color: "#5a4030" });
      }
    } else if (sceneId === "bodega") {
      // Shelves with stuff
      for (let row = -2; row <= 2; row += 2) {
        for (let h = 1; h <= 3; h++) {
          items.push({ x: -8, y: h, z: row, w: 0.5, h: 0.05, d: 1.5, color: "#3a2a20" });
          items.push({ x: 8, y: h, z: row, w: 0.5, h: 0.05, d: 1.5, color: "#3a2a20" });
          // Random products
          for (let k = 0; k < 3; k++) {
            const cols = ["#ff5544", "#55aaff", "#ffaa33", "#33ff88", "#aa55ff"];
            items.push({
              x: -8,
              y: h + 0.2,
              z: row - 0.5 + k * 0.5,
              w: 0.3,
              h: 0.3,
              d: 0.3,
              color: cols[(row + h + k + 5) % cols.length],
            });
            items.push({
              x: 8,
              y: h + 0.2,
              z: row - 0.5 + k * 0.5,
              w: 0.3,
              h: 0.3,
              d: 0.3,
              color: cols[(row + h + k + 2) % cols.length],
            });
          }
        }
      }
    }
    return items;
  }, [sceneId]);

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[INTERIOR_SIZE, INTERIOR_SIZE]} />
        <meshStandardMaterial color={theme.floor} />
      </mesh>
      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 5, 0]}>
        <planeGeometry args={[INTERIOR_SIZE, INTERIOR_SIZE]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>
      {/* Walls */}
      <mesh position={[0, 2.5, -half]} receiveShadow>
        <boxGeometry args={[INTERIOR_SIZE, 5, 0.3]} />
        <meshStandardMaterial color={theme.wall} />
      </mesh>
      <mesh position={[-half, 2.5, 0]} receiveShadow>
        <boxGeometry args={[0.3, 5, INTERIOR_SIZE]} />
        <meshStandardMaterial color={theme.wall} />
      </mesh>
      <mesh position={[half, 2.5, 0]} receiveShadow>
        <boxGeometry args={[0.3, 5, INTERIOR_SIZE]} />
        <meshStandardMaterial color={theme.wall} />
      </mesh>
      {/* South wall (with door gap) */}
      <mesh position={[-5.5, 2.5, half]} receiveShadow>
        <boxGeometry args={[9, 5, 0.3]} />
        <meshStandardMaterial color={theme.wall} />
      </mesh>
      <mesh position={[5.5, 2.5, half]} receiveShadow>
        <boxGeometry args={[9, 5, 0.3]} />
        <meshStandardMaterial color={theme.wall} />
      </mesh>
      <mesh position={[0, 4.5, half]} receiveShadow>
        <boxGeometry args={[2, 1, 0.3]} />
        <meshStandardMaterial color={theme.wall} />
      </mesh>

      {/* Counter */}
      <mesh position={[COUNTER_POS.x, 0.6, COUNTER_POS.z]} castShadow>
        <boxGeometry args={[10, 1.2, 1.2]} />
        <meshStandardMaterial color={theme.counter} />
      </mesh>

      {/* Stock items */}
      {stock.map((s, i) => (
        <mesh key={i} position={[s.x, s.y, s.z]} castShadow>
          <boxGeometry args={[s.w, s.h, s.d]} />
          <meshStandardMaterial color={s.color} />
        </mesh>
      ))}

      {/* Door marker (glowing) */}
      <mesh position={[DOOR_POS.x, 1.5, DOOR_POS.z + 0.05]}>
        <planeGeometry args={[1.8, 2.8]} />
        <meshBasicMaterial color={theme.accent} />
      </mesh>

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 4.5, 0]} intensity={1} color="#fff4d6" castShadow />
      <pointLight position={[0, 3, COUNTER_POS.z]} intensity={1.5} color={theme.accent} distance={10} />
      <pointLight position={[0, 3, DOOR_POS.z]} intensity={0.8} color={theme.accent} distance={8} />

      {/* Sign on back wall */}
      <mesh position={[0, 4, -half + 0.2]}>
        <boxGeometry args={[8, 1, 0.05]} />
        <meshStandardMaterial color={theme.accent} emissive={theme.accent} emissiveIntensity={1.5} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function getInteriorBounds(): CollisionBox[] {
  const half = INTERIOR_SIZE / 2;
  const t = 0.5;
  return [
    { x: 0, z: -half, w: INTERIOR_SIZE, d: t },
    { x: -half, z: 0, w: t, d: INTERIOR_SIZE },
    { x: half, z: 0, w: t, d: INTERIOR_SIZE },
    // South wall with door gap (door is at z=half, x ~ -1..1)
    { x: -5.5, z: half, w: 9, d: t },
    { x: 5.5, z: half, w: 9, d: t },
    // Counter
    { x: COUNTER_POS.x, z: COUNTER_POS.z, w: 10, d: 1.2 },
  ];
}

export function getInteriorWorldLimits() {
  const half = INTERIOR_SIZE / 2 - 0.5;
  return {
    min: { x: -half, z: -half },
    max: { x: half, z: half + 0.5 }, // allow exit through door
  };
}

export function getShopForScene(sceneId: SceneId): ShopLocation | undefined {
  return SHOPS.find((s) => s.id === sceneId);
}
