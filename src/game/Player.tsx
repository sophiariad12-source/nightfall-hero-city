import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGame, OUTFITS } from "./store";

const SPEED = 8;
const RUN_MULT = 1.7;

export interface PlayerHandle {
  getPosition: () => THREE.Vector3;
  getDirection: () => THREE.Vector3;
  setPosition: (x: number, y: number, z: number) => void;
}

export interface CollisionBox {
  x: number;
  z: number;
  w: number;
  d: number;
}

interface Props {
  onShoot?: (origin: THREE.Vector3, dir: THREE.Vector3) => void;
  onMelee?: (origin: THREE.Vector3, dir: THREE.Vector3) => void;
  onInteract?: () => void;
  bounds: CollisionBox[];
  worldMin?: { x: number; z: number };
  worldMax?: { x: number; z: number };
  inputEnabled?: boolean;
  startPos?: { x: number; z: number; yaw?: number };
}

export const Player = forwardRef<PlayerHandle, Props>(function Player(
  { onShoot, onMelee, onInteract, bounds, worldMin, worldMax, inputEnabled = true, startPos },
  ref
) {
  const groupRef = useRef<THREE.Group>(null!);
  const velocity = useRef(new THREE.Vector3());
  const keys = useRef<Record<string, boolean>>({});
  const yaw = useRef(startPos?.yaw ?? 0);
  const pitch = useRef(-0.2);
  const { camera, gl } = useThree();
  const gender = useGame((s) => s.gender);
  const activeWeapon = useGame((s) => s.activeWeapon);
  const outfitId = useGame((s) => s.outfit);
  const switchWeapon = useGame((s) => s.switchWeapon);
  const [pointerLocked, setPointerLocked] = useState(false);
  const lastAttack = useRef(0);

  useImperativeHandle(ref, () => ({
    getPosition: () => groupRef.current.position.clone(),
    getDirection: () => {
      const d = new THREE.Vector3(0, 0, -1);
      d.applyEuler(new THREE.Euler(0, yaw.current, 0, "YXZ"));
      return d;
    },
    setPosition: (x, y, z) => {
      if (groupRef.current) groupRef.current.position.set(x, y, z);
    },
  }));

  // Apply startPos when it changes
  useEffect(() => {
    if (startPos && groupRef.current) {
      groupRef.current.position.set(startPos.x, 0, startPos.z);
      if (startPos.yaw !== undefined) yaw.current = startPos.yaw;
    }
  }, [startPos]);

  useEffect(() => {
    if (!inputEnabled) {
      if (document.pointerLockElement === gl.domElement) document.exitPointerLock();
      keys.current = {};
      return;
    }
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (e.code === "Digit1") switchWeapon("gun");
      if (e.code === "Digit2") switchWeapon("sword");
      if (e.code === "KeyE") onInteract?.();
    };
    const up = (e: KeyboardEvent) => (keys.current[e.code] = false);
    const mouseMove = (e: MouseEvent) => {
      if (!pointerLocked) return;
      yaw.current -= e.movementX * 0.0025;
      pitch.current -= e.movementY * 0.0025;
      pitch.current = Math.max(-1.2, Math.min(0.5, pitch.current));
    };
    const click = () => {
      if (!pointerLocked) {
        gl.domElement.requestPointerLock();
        return;
      }
      const now = performance.now();
      const cooldown = activeWeapon === "gun" ? 250 : 450;
      if (now - lastAttack.current < cooldown) return;
      lastAttack.current = now;
      const pos = groupRef.current.position.clone();
      pos.y += 1.4;
      const dir = new THREE.Vector3(0, 0, -1).applyEuler(
        new THREE.Euler(pitch.current, yaw.current, 0, "YXZ")
      );
      if (activeWeapon === "gun") onShoot?.(pos, dir);
      else onMelee?.(pos, dir);
    };
    const lockChange = () =>
      setPointerLocked(document.pointerLockElement === gl.domElement);

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("mousemove", mouseMove);
    gl.domElement.addEventListener("mousedown", click);
    document.addEventListener("pointerlockchange", lockChange);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("mousemove", mouseMove);
      gl.domElement.removeEventListener("mousedown", click);
      document.removeEventListener("pointerlockchange", lockChange);
    };
  }, [gl, pointerLocked, activeWeapon, onShoot, onMelee, onInteract, switchWeapon, inputEnabled]);

  useFrame((_, dt) => {
    const g = groupRef.current;
    if (!g) return;
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(
      new THREE.Euler(0, yaw.current, 0, "YXZ")
    );
    const right = new THREE.Vector3(1, 0, 0).applyEuler(
      new THREE.Euler(0, yaw.current, 0, "YXZ")
    );
    const dir = new THREE.Vector3();
    if (inputEnabled) {
      if (keys.current["KeyW"]) dir.add(forward);
      if (keys.current["KeyS"]) dir.sub(forward);
      if (keys.current["KeyD"]) dir.add(right);
      if (keys.current["KeyA"]) dir.sub(right);
    }
    if (dir.lengthSq() > 0) dir.normalize();
    const speed = SPEED * (keys.current["ShiftLeft"] ? RUN_MULT : 1);
    velocity.current.x = dir.x * speed;
    velocity.current.z = dir.z * speed;

    const next = g.position.clone();
    next.x += velocity.current.x * dt;
    if (!collides(next.x, g.position.z, bounds)) g.position.x = next.x;
    next.z = g.position.z + velocity.current.z * dt;
    if (!collides(g.position.x, next.z, bounds)) g.position.z = next.z;

    if (worldMin) {
      g.position.x = Math.max(worldMin.x, g.position.x);
      g.position.z = Math.max(worldMin.z, g.position.z);
    }
    if (worldMax) {
      g.position.x = Math.min(worldMax.x, g.position.x);
      g.position.z = Math.min(worldMax.z, g.position.z);
    }

    g.rotation.y = yaw.current;

    const camOffset = new THREE.Vector3(0, 2.2, 5).applyEuler(
      new THREE.Euler(pitch.current, yaw.current, 0, "YXZ")
    );
    camera.position.copy(g.position).add(camOffset);
    const lookAt = g.position.clone().add(new THREE.Vector3(0, 1.5, 0));
    camera.lookAt(lookAt);
  });

  const skinColor = gender === "male" ? "#d4a574" : "#e8b896";
  const outfit = OUTFITS.find((o) => o.id === outfitId)!;
  const shirtColor = outfit.shirt;
  const pantsColor = outfit.pants;
  const hatColor = outfit.hat;
  const hairColor = gender === "male" ? "#3a2818" : "#5a3a28";

  return (
    <group ref={groupRef} position={[startPos?.x ?? 0, 0, startPos?.z ?? 0]}>
      <mesh castShadow position={[0, 1.1, 0]}>
        <boxGeometry args={[0.6, 0.8, 0.35]} />
        <meshStandardMaterial color={shirtColor} />
      </mesh>
      <mesh castShadow position={[0, 1.75, 0]}>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>
      {/* Hair (only if no hat or female long hair) */}
      {(!hatColor || gender === "female") && (
        <mesh castShadow position={[0, 1.95, gender === "female" ? -0.05 : 0]}>
          <boxGeometry args={[0.42, gender === "female" ? 0.5 : 0.15, gender === "female" ? 0.5 : 0.42]} />
          <meshStandardMaterial color={hairColor} />
        </mesh>
      )}
      {/* Hat */}
      {hatColor && (
        <mesh castShadow position={[0, 2.05, 0]}>
          <boxGeometry args={[0.46, 0.18, 0.46]} />
          <meshStandardMaterial color={hatColor} />
        </mesh>
      )}
      <mesh castShadow position={[-0.4, 1.1, 0]}>
        <boxGeometry args={[0.18, 0.75, 0.22]} />
        <meshStandardMaterial color={shirtColor} />
      </mesh>
      <mesh castShadow position={[0.4, 1.1, 0]}>
        <boxGeometry args={[0.18, 0.75, 0.22]} />
        <meshStandardMaterial color={shirtColor} />
      </mesh>
      <mesh castShadow position={[-0.16, 0.4, 0]}>
        <boxGeometry args={[0.22, 0.8, 0.25]} />
        <meshStandardMaterial color={pantsColor} />
      </mesh>
      <mesh castShadow position={[0.16, 0.4, 0]}>
        <boxGeometry args={[0.22, 0.8, 0.25]} />
        <meshStandardMaterial color={pantsColor} />
      </mesh>
      <group position={[0.45, 1.2, -0.3]}>
        {activeWeapon === "gun" ? (
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
    </group>
  );
});

function collides(x: number, z: number, bounds: CollisionBox[]) {
  const r = 0.4;
  for (const b of bounds) {
    if (
      x > b.x - b.w / 2 - r &&
      x < b.x + b.w / 2 + r &&
      z > b.z - b.d / 2 - r &&
      z < b.z + b.d / 2 + r
    )
      return true;
  }
  return false;
}
