import type { BayConfig } from "./shelf";

export type Unit = "in" | "cm";
export type FurnitureKind = "bookcase" | "short" | "corner" | "tower";
export type Rotation = 0 | 90 | 180 | 270;

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
      };
    case "corner":
      return {
        ...base,
        kind,
        label: "Corner unit",
        width: inch(26),
        depth: inch(26),
        height: inch(79),
        shelves: 6,
        extension: false,
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
      };
    case "bookcase":
    default:
      return {
        ...base,
        kind: "bookcase",
        label: "Bookcase",
        width: inch(30),
        depth: inch(11),
        height: inch(79),
        shelves: 6,
        extension: true,
      };
  }
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
