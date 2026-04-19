import { useMemo } from "react";
import * as THREE from "three";

interface Building {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  color: string;
  type: "office" | "shop" | "club" | "apartment";
}

const COLORS = ["#3a3f4b", "#2d3340", "#4a4035", "#5a4a3a", "#3d4550", "#2a2f3a"];

function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function City() {
  const buildings = useMemo<Building[]>(() => {
    const rand = seededRand(42);
    const list: Building[] = [];
    const blockSize = 24;
    const roadWidth = 6;
    const grid = 4;
    for (let gx = -grid; gx <= grid; gx++) {
      for (let gz = -grid; gz <= grid; gz++) {
        const cx = gx * (blockSize + roadWidth);
        const cz = gz * (blockSize + roadWidth);
        // Each block has 2x2 buildings
        for (let bx = 0; bx < 2; bx++) {
          for (let bz = 0; bz < 2; bz++) {
            const w = 8 + rand() * 3;
            const d = 8 + rand() * 3;
            const h = 6 + rand() * 28;
            const x = cx + (bx === 0 ? -6 : 6);
            const z = cz + (bz === 0 ? -6 : 6);
            const r = rand();
            const type: Building["type"] =
              r < 0.08 ? "shop" : r < 0.1 ? "club" : r < 0.5 ? "apartment" : "office";
            list.push({
              x,
              z,
              w,
              d,
              h,
              color: COLORS[Math.floor(rand() * COLORS.length)],
              type,
            });
          }
        }
      }
    }
    return list;
  }, []);

  const windowsTexture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 128;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#1a1d24";
    ctx.fillRect(0, 0, 64, 128);
    for (let y = 8; y < 128; y += 12) {
      for (let x = 4; x < 64; x += 10) {
        ctx.fillStyle = Math.random() > 0.4 ? "#f5d97a" : "#2a2d34";
        ctx.fillRect(x, y, 6, 8);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }, []);

  return (
    <group>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#1a1d22" />
      </mesh>

      {/* Road grid (lighter strips) */}
      {Array.from({ length: 9 }, (_, i) => i - 4).map((g) => (
        <group key={g}>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[g * 30, 0.01, 0]}
            receiveShadow
          >
            <planeGeometry args={[6, 400]} />
            <meshStandardMaterial color="#2a2d33" />
          </mesh>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.01, g * 30]}
            receiveShadow
          >
            <planeGeometry args={[400, 6]} />
            <meshStandardMaterial color="#2a2d33" />
          </mesh>
        </group>
      ))}

      {/* Lane markings */}
      {Array.from({ length: 9 }, (_, i) => i - 4).map((g) =>
        Array.from({ length: 20 }, (_, k) => k - 10).map((k) => (
          <mesh
            key={`m-${g}-${k}`}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[g * 30, 0.02, k * 4]}
          >
            <planeGeometry args={[0.3, 1.5]} />
            <meshBasicMaterial color="#d4b942" />
          </mesh>
        ))
      )}

      {/* Buildings */}
      {buildings.map((b, i) => (
        <group key={i} position={[b.x, b.h / 2, b.z]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial
              color={b.color}
              map={b.type === "office" || b.type === "apartment" ? windowsTexture : null}
            />
          </mesh>
          {b.type === "shop" && (
            <mesh position={[0, -b.h / 2 + 1.5, b.d / 2 + 0.05]}>
              <planeGeometry args={[b.w * 0.8, 1.2]} />
              <meshBasicMaterial color="#d97a2a" />
            </mesh>
          )}
          {b.type === "club" && (
            <mesh position={[0, -b.h / 2 + 2, b.d / 2 + 0.05]}>
              <planeGeometry args={[b.w * 0.8, 1.5]} />
              <meshBasicMaterial color="#c93aa8" />
            </mesh>
          )}
        </group>
      ))}

      {/* Skate ramp */}
      <group position={[0, 0, 35]}>
        <mesh castShadow position={[0, 1, 0]}>
          <boxGeometry args={[10, 0.3, 8]} />
          <meshStandardMaterial color="#5a4a3a" />
        </mesh>
        <mesh castShadow position={[-5, 1.5, 0]} rotation={[0, 0, Math.PI / 8]}>
          <boxGeometry args={[3, 0.3, 8]} />
          <meshStandardMaterial color="#5a4a3a" />
        </mesh>
        <mesh castShadow position={[5, 1.5, 0]} rotation={[0, 0, -Math.PI / 8]}>
          <boxGeometry args={[3, 0.3, 8]} />
          <meshStandardMaterial color="#5a4a3a" />
        </mesh>
      </group>
    </group>
  );
}

// Building bounds for collision (approximate)
export function getBuildingBounds() {
  const rand = seededRand(42);
  const list: { x: number; z: number; w: number; d: number }[] = [];
  const blockSize = 24;
  const roadWidth = 6;
  const grid = 4;
  for (let gx = -grid; gx <= grid; gx++) {
    for (let gz = -grid; gz <= grid; gz++) {
      const cx = gx * (blockSize + roadWidth);
      const cz = gz * (blockSize + roadWidth);
      for (let bx = 0; bx < 2; bx++) {
        for (let bz = 0; bz < 2; bz++) {
          const w = 8 + rand() * 3;
          const d = 8 + rand() * 3;
          rand(); // h
          const x = cx + (bx === 0 ? -6 : 6);
          const z = cz + (bz === 0 ? -6 : 6);
          rand(); // type
          rand(); // color idx
          list.push({ x, z, w, d });
        }
      }
    }
  }
  return list;
}
