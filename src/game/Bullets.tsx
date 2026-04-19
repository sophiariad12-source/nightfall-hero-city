import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface Bullet {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
}

export interface BulletsHandle {
  spawn: (pos: THREE.Vector3, dir: THREE.Vector3) => void;
}

export const Bullets = ({ apiRef }: { apiRef: React.MutableRefObject<BulletsHandle | null> }) => {
  const bullets = useRef<Bullet[]>([]);
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useRef(new THREE.Object3D());

  apiRef.current = {
    spawn: (pos, dir) => {
      bullets.current.push({
        pos: pos.clone(),
        vel: dir.clone().multiplyScalar(80),
        life: 1.2,
      });
    },
  };

  useFrame((_, dt) => {
    bullets.current = bullets.current.filter((b) => {
      b.life -= dt;
      b.pos.x += b.vel.x * dt;
      b.pos.y += b.vel.y * dt;
      b.pos.z += b.vel.z * dt;
      return b.life > 0;
    });

    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < 50; i++) {
      const b = bullets.current[i];
      if (b) {
        dummy.current.position.copy(b.pos);
        dummy.current.scale.set(1, 1, 1);
      } else {
        dummy.current.scale.set(0, 0, 0);
      }
      dummy.current.updateMatrix();
      mesh.setMatrixAt(i, dummy.current.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, 50]}>
      <sphereGeometry args={[0.08, 6, 6]} />
      <meshBasicMaterial color="#ffe066" />
    </instancedMesh>
  );
};
