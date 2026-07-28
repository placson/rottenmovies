import type { BayConfig } from "./shelf";

export type Unit = "in" | "cm";
export type FurnitureKind =
  | "billyWide"
  | "billySkinny"
  | "short"
  | "tower"
  | "custom";
export type Rotation = 0 | 90 | 180 | 270;

/** Which room corner a piece is tucked diagonally into (45°), or null. */
export type Corner = "tl" | "tr" | "br" | "bl";
export const CORNERS: Corner[] = ["tl", "tr", "br", "bl"];

/** One piece of furniture placed on the room floor. All lengths are in the
 *  room's unit. `width` is the usable shelf length (what books line up along). */
export type Furniture = {
  id: string;
  label: string;
  kind: FurnitureKind;
  x: number; // floor position of top-left of footprint (room unit)
  y: number;
  rotation: Rotation;
  width: number; // usable shelf length
  depth: number; // how far it sticks out from the wall
  height: number;
  shelves: number;
  extension: boolean;
  order: number; // traversal order (which case fills first)
  corner?: Corner | null; // if set, sits diagonally in that room corner
};

export type Room = {
  unit: Unit;
  width: number; // interior room width (room unit)
  length: number; // interior room length
  furniture: Furniture[];
};

export function toCm(value: number, unit: Unit): number {
  return unit === "in" ? value * 2.54 : value;
}
export function fromCm(cm: number, unit: Unit): number {
  return unit === "in" ? cm / 2.54 : cm;
}

/** Footprint size (in room units) accounting for rotation. */
export function footprint(f: Furniture): { w: number; h: number } {
  const horizontal = f.rotation % 180 === 0;
  return horizontal
    ? { w: f.width, h: f.depth }
    : { w: f.depth, h: f.width };
}

/** Default piece for each kind, sized in inches then converted to the unit. */
export function makeFurniture(
  kind: FurnitureKind,
  unit: Unit,
  order: number
): Furniture {
  const inch = (n: number) => (unit === "in" ? n : Math.round(n * 2.54));
  const base = {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `f-${Math.random().toString(36).slice(2)}`,
    x: inch(2),
    y: inch(2),
    rotation: 0 as Rotation,
    order,
  };
  switch (kind) {
    case "billySkinny":
      return {
        ...base,
        kind,
        label: "Billy Skinny",
        width: inch(14), // 40 cm unit ≈ 15.75", usable ≈ 14"
        depth: inch(11),
        height: inch(79.5),
        shelves: 6,
        extension: true,
        corner: null,
      };
    case "short":
      return {
        ...base,
        kind,
        label: "Short bookcase",
        width: inch(30),
        depth: inch(11),
        height: inch(42),
        shelves: 3,
        extension: false,
        corner: null,
      };
    case "tower":
      return {
        ...base,
        kind,
        label: "Rotating tower",
        width: inch(40), // total linear length across the tiers' sides
        depth: inch(16),
        height: inch(48),
        shelves: 4,
        extension: false,
        corner: null,
      };
    case "custom":
      return {
        ...base,
        kind,
        label: "Custom shelf",
        width: inch(24),
        depth: inch(11),
        height: inch(72),
        shelves: 5,
        extension: false,
        corner: null,
      };
    case "billyWide":
    default:
      return {
        ...base,
        kind: "billyWide",
        label: "Billy Wide",
        width: inch(30), // 80 cm unit, usable ≈ 30" (76 cm)
        depth: inch(11),
        height: inch(79.5),
        shelves: 6,
        extension: true,
        corner: null,
      };
  }
}

const CORNER_ANGLE: Record<Corner, number> = {
  tl: 45,
  tr: 135,
  br: 225,
  bl: 315,
};

/**
 * Geometry for a corner-mounted (45°) piece. Its position is stored as the
 * piece's own center in (x, y), so it can be dragged anywhere while keeping the
 * diagonal orientation of its chosen corner direction.
 */
export function cornerGeometry(
  f: Furniture
): { cx: number; cy: number; angle: number } {
  const c = f.corner ?? "tl";
  return { cx: f.x, cy: f.y, angle: CORNER_ANGLE[c] };
}

/** The room-corner anchor point. */
export function cornerAnchor(room: Room, c: Corner): { x: number; y: number } {
  const pt: Record<Corner, [number, number]> = {
    tl: [0, 0],
    tr: [room.width, 0],
    br: [room.width, room.length],
    bl: [0, room.length],
  };
  return { x: pt[c][0], y: pt[c][1] };
}

/** Initial center for a piece tucked into a room corner (back near the corner). */
export function cornerCenter(
  room: Room,
  c: Corner,
  depth: number
): { x: number; y: number } {
  const { x: px, y: py } = cornerAnchor(room, c);
  const rad = (CORNER_ANGLE[c] * Math.PI) / 180;
  return {
    x: px + Math.cos(rad) * (depth / 2),
    y: py + Math.sin(rad) * (depth / 2),
  };
}

export type Wall = "top" | "left" | "bottom" | "right";
export const WALL_ROTATION: Record<Wall, Rotation> = {
  top: 0,
  right: 90,
  bottom: 180,
  left: 270,
};
export function rotationWall(r: Rotation): Wall {
  return r === 90 ? "right" : r === 180 ? "bottom" : r === 270 ? "left" : "top";
}

export const DEFAULT_ROOM: Room = {
  unit: "in",
  width: 144, // 12 ft
  length: 120, // 10 ft
  furniture: [],
};

/** Sort by traversal order, then convert each piece into the packer's bay. */
export function roomToBayConfigs(room: Room): BayConfig[] {
  return [...room.furniture]
    .sort((a, b) => a.order - b.order || a.x - b.x)
    .map((f) => ({
      widthCm: Math.round(toCm(f.width, room.unit)),
      shelves: f.shelves,
      extension: f.extension,
      label: f.label,
    }));
}

/** Number pieces left→right, top→bottom for a sensible default walk order. */
export function autoOrder(furniture: Furniture[]): Furniture[] {
  const sorted = [...furniture].sort(
    (a, b) => a.y - b.y || a.x - b.x
  );
  return sorted.map((f, i) => ({ ...f, order: i + 1 }));
}
