import {
  cornerGeometry,
  footprint,
  toCm,
  type Furniture,
  type Room,
} from "./room";

/**
 * A furniture piece expressed for the 3D scene, in **meters**, with the floor
 * on the XZ plane (room x → scene X, room y → scene Z) and Y pointing up.
 *   - (cx, cz) is the footprint center on the floor
 *   - angleRad rotates the box about Y (0 = shelf runs along X, front toward +Z)
 *   - w = shelf length, d = depth, h = height
 */
export type Placement3D = {
  id: string;
  cx: number;
  cz: number;
  angleRad: number;
  w: number;
  d: number;
  h: number;
};

const DEG = Math.PI / 180;

/** Convert a room-unit length to meters (rooms store inches or cm). */
export function toMeters(value: number, unit: Room["unit"]): number {
  return toCm(value, unit) / 100;
}

/**
 * Placement for one piece. Non-corner pieces use their top-left `(x,y)` plus
 * footprint to find the center and `rotation` for the angle. Corner pieces
 * reuse `cornerGeometry` (its center + 45° family angle).
 */
export function placeFurniture(room: Room, f: Furniture): Placement3D {
  const unit = room.unit;
  const w = toMeters(f.width, unit);
  const d = toMeters(f.depth, unit);
  const h = toMeters(f.height, unit);

  if (f.corner) {
    const cg = cornerGeometry(f); // center in (x,y); angle = bisector, degrees
    // The opening faces along the corner bisector (into the room). Our +Z
    // (front) points in 2D direction (dx,dy) when angleY = atan2(dx,dy); the
    // bisector direction is (cos A, sin A).
    const a = cg.angle * DEG;
    return {
      id: f.id,
      cx: toMeters(cg.cx, unit),
      cz: toMeters(cg.cy, unit),
      angleRad: Math.atan2(Math.cos(a), Math.sin(a)),
      w,
      d,
      h,
    };
  }

  const fp = footprint(f); // axis-aligned footprint (accounts for rotation)
  return {
    id: f.id,
    cx: toMeters(f.x + fp.w / 2, unit),
    cz: toMeters(f.y + fp.h / 2, unit),
    angleRad: -f.rotation * DEG,
    w,
    d,
    h,
  };
}

/**
 * Furniture sorted into the same order the shelf packer uses
 * (`roomToBayConfigs`: order, then x), so index i corresponds to bay i.
 */
export function furnitureInBayOrder(room: Room): Furniture[] {
  return [...room.furniture].sort((a, b) => a.order - b.order || a.x - b.x);
}
