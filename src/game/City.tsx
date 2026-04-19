import { useMemo } from "react";
import * as THREE from "three";
import { SHOPS } from "./store";

interface Building {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  color: string;
  type: "office" | "shop" | "club" | "apartment";
}

const COLORS = ["#3a2a22", "#4a3530", "#3d3028", "#5a4035", "#2d2520", "#403028"];

function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// Helper used by City + collision generator
function generateBuildings(): Building[] {
  const rand = seededRand(42);
  const list: Building[] = [];
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
}

// Brick + windows texture (Bronx vibe)
function makeBrickTexture() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  // brick base
  ctx.fillStyle = "#3a2520";
  ctx.fillRect(0, 0, 128, 256);
  // brick mortar lines
  ctx.fillStyle = "#1a1010";
  for (let y = 0; y < 256; y += 8) {
    ctx.fillRect(0, y, 128, 1);
    const offset = (y / 8) % 2 === 0 ? 0 : 8;
    for (let x = offset; x < 128; x += 16) {
      ctx.fillRect(x, y, 1, 8);
    }
  }
  // brick color variation
  for (let i = 0; i < 80; i++) {
    const x = Math.floor(Math.random() * 128);
    const y = Math.floor(Math.random() * 256);
    ctx.fillStyle = `rgba(${100 + Math.random() * 40},${50 + Math.random() * 20},${40},0.3)`;
    ctx.fillRect(x, y, 8, 4);
  }
  // windows
  for (let y = 16; y < 256; y += 32) {
    for (let x = 12; x < 128; x += 28) {
      const lit = Math.random() > 0.5;
      ctx.fillStyle = lit ? "#f5d97a" : "#1a1d24";
      ctx.fillRect(x, y, 16, 18);
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(x + 7, y, 2, 18);
      ctx.fillRect(x, y + 8, 16, 2);
    }
  }
  // graffiti tag
  ctx.fillStyle = "#ff4488";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText("BX", 8, 240);
  ctx.fillStyle = "#44ff88";
  ctx.fillText("187", 60, 240);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function City() {
  const buildings = useMemo(generateBuildings, []);
  const brickTexture = useMemo(makeBrickTexture, []);

  return (
    <group>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#15171c" />
      </mesh>

      {/* Roads */}
      {Array.from({ length: 9 }, (_, i) => i - 4).map((g) => (
        <group key={g}>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[g * 30, 0.01, 0]}
            receiveShadow
          >
            <planeGeometry args={[6, 400]} />
            <meshStandardMaterial color="#252830" />
          </mesh>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.01, g * 30]}
            receiveShadow
          >
            <planeGeometry args={[400, 6]} />
            <meshStandardMaterial color="#252830" />
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

      {/* Buildings with brick texture */}
      {buildings.map((b, i) => {
        const tex = brickTexture.clone();
        tex.needsUpdate = true;
        tex.repeat.set(b.w / 4, b.h / 6);
        return (
          <group key={i} position={[b.x, b.h / 2, b.z]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[b.w, b.h, b.d]} />
              <meshStandardMaterial color={b.color} map={tex} />
            </mesh>
            {/* Fire escape on tall buildings */}
            {b.h > 18 && (
              <FireEscape height={b.h} side={b.d / 2 + 0.1} />
            )}
          </group>
        );
      })}

      {/* Skate ramp */}
      <group position={[60, 0, 60]}>
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

      {/* Shop markers */}
      {SHOPS.map((shop) => (
        <ShopMarker key={shop.id} shop={shop} />
      ))}

      {/* Trash bins for street flavor */}
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const dist = 18 + (i % 3) * 12;
        const x = Math.cos(angle) * dist;
        const z = Math.sin(angle) * dist;
        return (
          <mesh key={`t-${i}`} castShadow position={[x, 0.6, z]}>
            <cylinderGeometry args={[0.4, 0.4, 1.2, 6]} />
            <meshStandardMaterial color="#222220" />
          </mesh>
        );
      })}
    </group>
  );
}

function FireEscape({ height, side }: { height: number; side: number }) {
  const platforms = Math.floor((height - 4) / 4);
  return (
    <group position={[0, 0, side]}>
      {Array.from({ length: platforms }, (_, i) => {
        const y = -height / 2 + 4 + i * 4;
        return (
          <group key={i}>
            <mesh position={[0, y, 0.3]} castShadow>
              <boxGeometry args={[2.5, 0.1, 0.6]} />
              <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.6} />
            </mesh>
            <mesh position={[1.2, y + 0.5, 0.3]} castShadow>
              <boxGeometry args={[0.05, 1, 0.6]} />
              <meshStandardMaterial color="#1a1a1a" />
            </mesh>
            <mesh position={[-1.2, y + 0.5, 0.3]} castShadow>
              <boxGeometry args={[0.05, 1, 0.6]} />
              <meshStandardMaterial color="#1a1a1a" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function ShopMarker({ shop }: { shop: { id: string; x: number; z: number; label: string; color: string } }) {
  return (
    <group position={[shop.x, 0, shop.z]}>
      {/* Door */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[2, 3, 0.3]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Awning */}
      <mesh position={[0, 3.5, 0.4]} castShadow>
        <boxGeometry args={[3.5, 0.4, 1.2]} />
        <meshStandardMaterial color={shop.color} emissive={shop.color} emissiveIntensity={0.3} />
      </mesh>
      {/* Neon sign */}
      <mesh position={[0, 4.5, 0]}>
        <boxGeometry args={[3, 0.8, 0.1]} />
        <meshStandardMaterial color={shop.color} emissive={shop.color} emissiveIntensity={2} toneMapped={false} />
      </mesh>
      {/* Glowing point light for night */}
      <pointLight position={[0, 4, 1]} color={shop.color} intensity={3} distance={15} />
      {/* Floating label */}
      <mesh position={[0, 5.5, 0]}>
        <ringGeometry args={[0.3, 0.5, 12]} />
        <meshBasicMaterial color={shop.color} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export function getBuildingBounds() {
  return generateBuildings().map((b) => ({ x: b.x, z: b.z, w: b.w, d: b.d }));
}

export function getShopMarkerBounds() {
  // Don't include door in collision (so player can walk up close), but block sides
  return SHOPS.map((s) => ({ x: s.x, z: s.z + 0.5, w: 3.5, d: 0.6 }));
}
