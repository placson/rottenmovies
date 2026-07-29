"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Instances, Instance } from "@react-three/drei";
import * as THREE from "three";
import type { Room } from "@/lib/room";
import type { PlannedShelf } from "@/lib/shelf";
import {
  furnitureInBayOrder,
  placeFurniture,
  toMeters,
} from "@/lib/room3d";

type Props = {
  room: Room;
  shelvesByBay: Map<number, PlannedShelf[]>;
};

const PLANK = 0.018; // 18mm shelf/panel thickness, in meters
const WALL_H_CM = 244; // ceiling height used only for the faint walls

function hashN(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Parse "hsl(H S% L%)" / "hsl(H, S%, L%)" into a THREE.Color.
function toColor(css: string): THREE.Color {
  const m = css.match(/hsl\(\s*([\d.]+)[\s,]+([\d.]+)%[\s,]+([\d.]+)%/i);
  if (m) {
    const c = new THREE.Color();
    c.setHSL(Number(m[1]) / 360, Number(m[2]) / 100, Number(m[3]) / 100);
    return c;
  }
  try {
    return new THREE.Color(css);
  } catch {
    return new THREE.Color("#8a5a34");
  }
}

type BookInstance = {
  key: string;
  position: [number, number, number];
  rotationY: number;
  scale: [number, number, number];
  color: THREE.Color;
};

type PieceRender = {
  id: string;
  cx: number;
  cz: number;
  angleRad: number;
  w: number;
  d: number;
  h: number;
  rows: number;
};

export default function Room3D({ room, shelvesByBay }: Props) {
  const { pieces, books, roomW, roomL } = useMemo(() => {
    const roomW = toMeters(room.width, room.unit);
    const roomL = toMeters(room.length, room.unit);
    const ordered = furnitureInBayOrder(room);

    const pieces: PieceRender[] = [];
    const books: BookInstance[] = [];

    ordered.forEach((f, bay) => {
      const p = placeFurniture(room, f);
      const rows = f.shelves + (f.extension ? 1 : 0);
      pieces.push({ ...p, rows });

      const shelves = shelvesByBay.get(bay) ?? [];
      const cos = Math.cos(p.angleRad);
      const sin = Math.sin(p.angleRad);
      const rowH = p.h / rows;

      for (const shelf of shelves) {
        const r = Math.min(shelf.indexInBay, rows - 1);
        const rowBottom = p.h - (r + 1) * rowH;
        let runX = -p.w / 2 + 0.01;

        for (const it of shelf.items) {
          const spineW = it.widthMm / 1000; // mm → m
          if (runX + spineW > p.w / 2 - 0.01) break;
          const bookH = rowH * (0.72 + (hashN(it.book.id) % 20) / 100);
          const bookD = Math.max(0.06, p.d * 0.78);
          // local coords: x along shelf, y up, z depth (front = +z)
          const lx = runX + spineW / 2;
          const ly = rowBottom + PLANK + bookH / 2;
          const lz = p.d / 2 - bookD / 2 - 0.01;
          // rotate local → world about Y, then translate to piece center
          const wx = p.cx + lx * cos + lz * sin;
          const wz = p.cz - lx * sin + lz * cos;
          books.push({
            key: it.book.id,
            position: [wx, ly, wz],
            rotationY: p.angleRad,
            scale: [Math.max(spineW - 0.002, 0.004), bookH, bookD],
            color: toColor(it.color),
          });
          runX += spineW;
        }
      }
    });

    return { pieces, books, roomW, roomL };
  }, [room, shelvesByBay]);

  const wallH = (WALL_H_CM / 100) * 1;
  const cx = roomW / 2;
  const cz = roomL / 2;
  const diag = Math.hypot(roomW, roomL);

  return (
    <div className="room3d-wrap">
      <Canvas
        shadows={false}
        dpr={[1, 2]}
        camera={{
          position: [roomW + diag * 0.25, Math.max(1.8, wallH * 1.1), roomL + diag * 0.25],
          fov: 45,
          near: 0.05,
          far: diag * 8 + 20,
        }}
      >
        <color attach="background" args={["#0f1115"]} />
        <ambientLight intensity={0.75} />
        <directionalLight position={[roomW, wallH * 2.5, roomL]} intensity={1.1} />
        <directionalLight position={[-roomW, wallH * 2, -roomL]} intensity={0.35} />

        {/* floor */}
        <mesh
          position={[cx, -0.001, cz]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[roomW, roomL]} />
          <meshStandardMaterial color="#2a2f3a" />
        </mesh>

        {/* two faint back walls (top edge z=0 and left edge x=0) */}
        <mesh position={[cx, wallH / 2, 0]}>
          <planeGeometry args={[roomW, wallH]} />
          <meshStandardMaterial
            color="#3a4150"
            transparent
            opacity={0.18}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0, wallH / 2, cz]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[roomL, wallH]} />
          <meshStandardMaterial
            color="#3a4150"
            transparent
            opacity={0.18}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* bookcases (carcass + planks) in each piece's local frame */}
        {pieces.map((p) => (
          <group
            key={p.id}
            position={[p.cx, 0, p.cz]}
            rotation={[0, p.angleRad, 0]}
          >
            {/* side panels */}
            {[-1, 1].map((s) => (
              <mesh key={s} position={[(s * (p.w - PLANK)) / 2, p.h / 2, 0]}>
                <boxGeometry args={[PLANK, p.h, p.d]} />
                <meshStandardMaterial color="#6b4a2f" />
              </mesh>
            ))}
            {/* back panel */}
            <mesh position={[0, p.h / 2, -p.d / 2 + PLANK / 2]}>
              <boxGeometry args={[p.w, p.h, PLANK]} />
              <meshStandardMaterial color="#5a3f28" />
            </mesh>
            {/* shelf planks (including top + bottom) */}
            {Array.from({ length: p.rows + 1 }).map((_, r) => (
              <mesh key={r} position={[0, (p.h / p.rows) * r, 0]}>
                <boxGeometry args={[p.w, PLANK, p.d]} />
                <meshStandardMaterial color="#7a5a3a" />
              </mesh>
            ))}
          </group>
        ))}

        {/* all book spines as instances (world coords) */}
        {books.length > 0 && (
          <Instances limit={books.length} range={books.length}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial roughness={0.85} />
            {books.map((b) => (
              <Instance
                key={b.key}
                position={b.position}
                rotation={[0, b.rotationY, 0]}
                scale={b.scale}
                color={b.color}
              />
            ))}
          </Instances>
        )}

        <OrbitControls
          makeDefault
          target={[cx, wallH * 0.35, cz]}
          enableDamping
          maxDistance={diag * 3}
          minDistance={0.4}
        />
      </Canvas>
    </div>
  );
}
