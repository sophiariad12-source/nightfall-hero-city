import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGame, weaponDamage } from "./store";

interface Zombie {
  id: number;
  pos: THREE.Vector3;
  hp: number;
  maxHp: number;
  attackCooldown: number;
}

interface Props {
  playerRef: React.MutableRefObject<THREE.Vector3 | null>;
  registerHit: (
    handler: (origin: THREE.Vector3, dir: THREE.Vector3, isMelee: boolean) => void
  ) => void;
}

let nextId = 1;

export function Zombies({ playerRef, registerHit }: Props) {
  const zombies = useRef<Zombie[]>([]);
  const meshes = useRef<Map<number, THREE.Group>>(new Map());
  const groupRef = useRef<THREE.Group>(null!);
  const isNight = useGame((s) => s.isNight);
  const takeDamage = useGame((s) => s.takeDamage);
  const addXP = useGame((s) => s.addXP);
  const killZombie = useGame((s) => s.killZombie);
  const addMoney = useGame((s) => s.addMoney);
  const level = useGame((s) => s.level);
  const spawnTimer = useRef(0);

  useEffect(() => {
    registerHit((origin, dir, isMelee) => {
      const state = useGame.getState();
      const dmg = weaponDamage(
        state.activeWeapon,
        state.activeWeapon === "gun" ? state.gunLevel : state.swordLevel
      );
      const range = isMelee ? 2.5 : 60;
      let bestZ: Zombie | null = null;
      let bestDist = Infinity;
      for (const z of zombies.current) {
        const toZ = z.pos.clone().sub(origin);
        const dist = toZ.length();
        if (dist > range) continue;
        toZ.normalize();
        const dot = toZ.dot(dir);
        if (isMelee ? dot > 0.5 : dot > 0.97) {
          if (dist < bestDist) {
            bestDist = dist;
            bestZ = z;
          }
        }
      }
      if (bestZ) {
        bestZ.hp -= dmg;
        if (bestZ.hp <= 0) {
          zombies.current = zombies.current.filter((z) => z !== bestZ);
          const m = meshes.current.get(bestZ.id);
          if (m) {
            groupRef.current.remove(m);
            meshes.current.delete(bestZ.id);
          }
          addXP(20);
          killZombie();
          addMoney(5 + Math.floor(Math.random() * 10));
        }
      }
    });
  }, [registerHit, addXP, addMoney, killZombie]);

  useFrame((_, dt) => {
    const playerPos = playerRef.current;
    if (!playerPos) return;

    // Spawn at night
    if (isNight) {
      spawnTimer.current -= dt;
      const maxZ = 8 + level * 2;
      if (spawnTimer.current <= 0 && zombies.current.length < maxZ) {
        spawnTimer.current = 1.5;
        const angle = Math.random() * Math.PI * 2;
        const dist = 25 + Math.random() * 15;
        const z: Zombie = {
          id: nextId++,
          pos: new THREE.Vector3(
            playerPos.x + Math.cos(angle) * dist,
            0,
            playerPos.z + Math.sin(angle) * dist
          ),
          hp: 40 + level * 8,
          maxHp: 40 + level * 8,
          attackCooldown: 0,
        };
        zombies.current.push(z);
        const grp = createZombieMesh();
        grp.position.copy(z.pos);
        meshes.current.set(z.id, grp);
        groupRef.current.add(grp);
      }
    } else {
      // Day: zombies despawn over time
      spawnTimer.current -= dt;
      if (spawnTimer.current <= 0 && zombies.current.length > 0) {
        spawnTimer.current = 2;
        const z = zombies.current.shift()!;
        const m = meshes.current.get(z.id);
        if (m) {
          groupRef.current.remove(m);
          meshes.current.delete(z.id);
        }
      }
    }

    // Update zombies
    for (const z of zombies.current) {
      const dir = playerPos.clone().sub(z.pos);
      dir.y = 0;
      const dist = dir.length();
      dir.normalize();
      const speed = 2.2 + level * 0.1;
      if (dist > 1.4) {
        z.pos.x += dir.x * speed * dt;
        z.pos.z += dir.z * speed * dt;
      }
      z.attackCooldown -= dt;
      if (dist < 1.6 && z.attackCooldown <= 0) {
        z.attackCooldown = 1.2;
        takeDamage(8 + level);
      }
      const m = meshes.current.get(z.id);
      if (m) {
        m.position.x = z.pos.x;
        m.position.z = z.pos.z;
        m.lookAt(playerPos.x, m.position.y, playerPos.z);
        // bobbing
        m.position.y = Math.sin(performance.now() * 0.005 + z.id) * 0.05;
      }
    }
  });

  return <group ref={groupRef} />;
}

function createZombieMesh() {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: "#6b8a4a" });
  const cloth = new THREE.MeshStandardMaterial({ color: "#3a2828" });
  const pants = new THREE.MeshStandardMaterial({ color: "#1a1a1a" });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.35), cloth);
  body.position.y = 1.1;
  body.castShadow = true;
  g.add(body);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), skin);
  head.position.y = 1.75;
  head.castShadow = true;
  g.add(head);

  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.75, 0.22), skin);
  armL.position.set(-0.4, 1.2, 0.2);
  armL.rotation.x = -0.6;
  armL.castShadow = true;
  g.add(armL);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.75, 0.22), skin);
  armR.position.set(0.4, 1.2, 0.2);
  armR.rotation.x = -0.6;
  armR.castShadow = true;
  g.add(armR);

  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.8, 0.25), pants);
  legL.position.set(-0.16, 0.4, 0);
  legL.castShadow = true;
  g.add(legL);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.8, 0.25), pants);
  legR.position.set(0.16, 0.4, 0);
  legR.castShadow = true;
  g.add(legR);

  return g;
}
