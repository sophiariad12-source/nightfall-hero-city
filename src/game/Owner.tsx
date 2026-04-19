import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGame, weaponDamage } from "./store";
import { COUNTER_POS } from "./Interior";

interface Props {
  playerPosRef: React.MutableRefObject<THREE.Vector3 | null>;
  registerHit: (
    handler: (origin: THREE.Vector3, dir: THREE.Vector3, isMelee: boolean) => void
  ) => void;
  spawnTracer?: (from: THREE.Vector3, to: THREE.Vector3) => void;
}

export function Owner({ playerPosRef, registerHit, spawnTracer }: Props) {
  const groupRef = useRef<THREE.Group>(null!);
  const hp = useRef(100);
  const maxHp = 100;
  const alive = useRef(true);
  const hitFlash = useRef(0);
  const shootCooldown = useRef(2);
  const matRef = useRef<THREE.MeshStandardMaterial>(null!);
  const shirtRef = useRef<THREE.MeshStandardMaterial>(null!);
  const takeDamage = useGame((s) => s.takeDamage);
  const addMoney = useGame((s) => s.addMoney);
  const addXP = useGame((s) => s.addXP);
  const killOwner = useGame((s) => s.killOwner);
  const level = useGame((s) => s.level);
  const barRef = useRef<THREE.Mesh>(null!);

  useEffect(() => {
    // reset on mount (entering bodega fresh)
    hp.current = 100 + level * 10;
    alive.current = true;
    if (groupRef.current) groupRef.current.visible = true;
  }, [level]);

  useEffect(() => {
    registerHit((origin, dir, isMelee) => {
      if (!alive.current) return;
      const state = useGame.getState();
      const dmg = weaponDamage(
        state.activeWeapon,
        state.activeWeapon === "gun" ? state.gunLevel : state.swordLevel
      );
      const range = isMelee ? 2.8 : 40;
      const ownerPos = groupRef.current.position.clone();
      ownerPos.y += 1;
      const toO = ownerPos.clone().sub(origin);
      const dist = toO.length();
      if (dist > range) return;
      toO.normalize();
      const dot = toO.dot(dir);
      if (isMelee ? dot > 0.5 : dot > 0.95) {
        hp.current -= dmg;
        hitFlash.current = 0.15;
        if (hp.current <= 0) {
          alive.current = false;
          if (groupRef.current) groupRef.current.visible = false;
          const loot = 200 + Math.floor(Math.random() * 250) + level * 30;
          addMoney(loot);
          addXP(80);
          killOwner();
        }
      }
    });
  }, [registerHit, addMoney, addXP, killOwner]);

  useFrame((_, dt) => {
    if (!alive.current) return;
    const playerPos = playerPosRef.current;
    if (!playerPos) return;

    // Face player
    const g = groupRef.current;
    const dir = playerPos.clone().sub(g.position);
    dir.y = 0;
    g.lookAt(playerPos.x, g.position.y, playerPos.z);

    // Shoot at player
    shootCooldown.current -= dt;
    if (shootCooldown.current <= 0) {
      shootCooldown.current = 1.4;
      const from = g.position.clone();
      from.y += 1.4;
      const to = playerPos.clone();
      to.y += 1.2;
      // 65% accuracy
      if (Math.random() < 0.65) {
        takeDamage(10 + level * 2);
      }
      spawnTracer?.(from, to);
    }

    // Hit flash
    if (hitFlash.current > 0) {
      hitFlash.current -= dt;
      if (shirtRef.current) shirtRef.current.color.set("#ff4444");
    } else if (shirtRef.current) {
      shirtRef.current.color.set("#3a2a20");
    }

    // HP bar above head
    if (barRef.current) {
      const ratio = Math.max(0, hp.current / maxHp);
      barRef.current.scale.x = ratio;
      barRef.current.position.x = -(1 - ratio) / 2;
    }
  });

  return (
    <group ref={groupRef} position={[COUNTER_POS.x, 0, COUNTER_POS.z - 1.2]}>
      {/* Body */}
      <mesh castShadow position={[0, 1.1, 0]}>
        <boxGeometry args={[0.7, 0.85, 0.4]} />
        <meshStandardMaterial ref={shirtRef} color="#3a2a20" />
      </mesh>
      {/* Head */}
      <mesh castShadow position={[0, 1.8, 0]}>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial ref={matRef} color="#c89870" />
      </mesh>
      {/* Cap */}
      <mesh castShadow position={[0, 2.05, -0.05]}>
        <boxGeometry args={[0.45, 0.15, 0.45]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Arms */}
      <mesh castShadow position={[-0.45, 1.1, 0.1]} rotation={[-0.3, 0, 0]}>
        <boxGeometry args={[0.18, 0.8, 0.22]} />
        <meshStandardMaterial color="#3a2a20" />
      </mesh>
      <mesh castShadow position={[0.45, 1.1, 0.1]} rotation={[-0.3, 0, 0]}>
        <boxGeometry args={[0.18, 0.8, 0.22]} />
        <meshStandardMaterial color="#3a2a20" />
      </mesh>
      {/* Legs hidden behind counter, but add stubs */}
      <mesh castShadow position={[-0.18, 0.4, 0]}>
        <boxGeometry args={[0.22, 0.8, 0.25]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh castShadow position={[0.18, 0.4, 0]}>
        <boxGeometry args={[0.22, 0.8, 0.25]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Gun */}
      <mesh castShadow position={[0.5, 1.3, 0.5]}>
        <boxGeometry args={[0.15, 0.18, 0.5]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.9} roughness={0.3} />
      </mesh>
      {/* HP bar background */}
      <mesh position={[0, 2.6, 0]}>
        <planeGeometry args={[1, 0.12]} />
        <meshBasicMaterial color="#1a0a0a" />
      </mesh>
      {/* HP bar fill (anchored left) */}
      <mesh ref={barRef} position={[0, 2.6, 0.01]}>
        <planeGeometry args={[1, 0.1]} />
        <meshBasicMaterial color="#ff3344" />
      </mesh>
    </group>
  );
}
