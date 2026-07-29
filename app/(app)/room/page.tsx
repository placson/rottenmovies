"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  DEFAULT_ROOM,
  makeFurniture,
  footprint,
  autoOrder,
  cornerGeometry,
  cornerCenter,
  CORNERS,
  WALL_ROTATION,
  rotationWall,
  type Room,
  type Furniture,
  type FurnitureKind,
  type Corner,
  type Wall,
  type Unit,
} from "@/lib/room";

const KIND_COLORS: Record<string, string> = {
  billyWide: "#8a5a34",
  billySkinny: "#a06a3e",
  short: "#b07a45",
  tower: "#4f7a86",
  custom: "#7a6a52",
};
const colorFor = (kind: string) => KIND_COLORS[kind] ?? "#7a6a52";

const CORNER_LABEL: Record<Corner, string> = {
  tl: "↖ TL",
  tr: "↗ TR",
  br: "↘ BR",
  bl: "↙ BL",
};

const WALLS: Wall[] = ["top", "left", "bottom", "right"];
const WALL_LABEL: Record<Wall, string> = {
  top: "Top",
  left: "Left",
  bottom: "Bottom",
  right: "Right",
};

export default function RoomPlanner() {
  const [room, setRoom] = useState<Room>(DEFAULT_ROOM);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);

  useEffect(() => {
    fetch("/api/room", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.room) setRoom(d.room);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const mutate = useCallback((next: Room) => {
    setRoom(next);
    setDirty(true);
  }, []);

  const patchFurniture = useCallback(
    (id: string, patch: Partial<Furniture>) =>
      mutate({
        ...room,
        furniture: room.furniture.map((f) =>
          f.id === id ? { ...f, ...patch } : f
        ),
      }),
    [room, mutate]
  );

  const selected = room.furniture.find((f) => f.id === selectedId) ?? null;

  // Fit the whole room into a comfortable canvas.
  const scale = useMemo(
    () => Math.max(2, Math.min(720 / room.width, 480 / room.length)),
    [room.width, room.length]
  );
  const unitLabel = room.unit;

  const addPiece = (kind: FurnitureKind, asCorner = false) => {
    const order =
      room.furniture.reduce((m, f) => Math.max(m, f.order), 0) + 1;
    const piece = makeFurniture(kind, room.unit, order);
    if (asCorner) {
      piece.corner = "tl";
      const c = cornerCenter(room, "tl", piece.depth);
      piece.x = c.x;
      piece.y = c.y;
    }
    mutate({ ...room, furniture: [...room.furniture, piece] });
    setSelectedId(piece.id);
  };

  const setCorner = (id: string, corner: Corner | null) => {
    const f = room.furniture.find((x) => x.id === id);
    if (!f) return;
    if (corner) {
      // Snap into that corner (as a center point); it can be dragged out after.
      const c = cornerCenter(room, corner, f.depth);
      patchFurniture(id, { corner, x: c.x, y: c.y });
    } else if (f.corner) {
      // Convert the stored center back to a top-left footprint origin.
      const { w, h } = footprint({ ...f, corner: null });
      patchFurniture(id, { corner: null, x: f.x - w / 2, y: f.y - h / 2 });
    }
  };

  const setWall = (id: string, wall: Wall) =>
    patchFurniture(id, { rotation: WALL_ROTATION[wall] });

  const removePiece = (id: string) => {
    mutate({ ...room, furniture: room.furniture.filter((f) => f.id !== id) });
    if (selectedId === id) setSelectedId(null);
  };

  const toUnitCoords = (clientX: number, clientY: number) => {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * room.width,
      y: ((clientY - rect.top) / rect.height) * room.length,
    };
  };

  const onPiecePointerDown = (e: React.PointerEvent, f: Furniture) => {
    e.preventDefault();
    setSelectedId(f.id);
    const p = toUnitCoords(e.clientX, e.clientY);
    // (x, y) is the top-left for normal pieces and the center for corner pieces.
    drag.current = { id: f.id, dx: p.x - f.x, dy: p.y - f.y };
    svgRef.current?.setPointerCapture(e.pointerId);
  };

  const onSvgPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const d = drag.current;
    const f = room.furniture.find((x) => x.id === d.id);
    if (!f) return;
    const p = toUnitCoords(e.clientX, e.clientY);
    let nx = Math.round(p.x - d.dx);
    let ny = Math.round(p.y - d.dy);

    if (f.corner) {
      // Corner pieces store their center; keep the rotated box inside the room.
      const half = ((f.width + f.depth) / Math.SQRT2) / 2;
      nx = Math.max(half, Math.min(room.width - half, nx));
      ny = Math.max(half, Math.min(room.length - half, ny));
    } else {
      const { w, h } = footprint(f);
      nx = Math.max(0, Math.min(room.width - w, nx));
      ny = Math.max(0, Math.min(room.length - h, ny));
      const snap = 3; // snap to walls
      if (nx < snap) nx = 0;
      if (room.width - (nx + w) < snap) nx = room.width - w;
      if (ny < snap) ny = 0;
      if (room.length - (ny + h) < snap) ny = room.length - h;
    }
    patchFurniture(d.id, { x: nx, y: ny });
  };

  const onSvgPointerUp = (e: React.PointerEvent) => {
    drag.current = null;
    try {
      svgRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const setUnit = (unit: Unit) => {
    if (unit === room.unit) return;
    const k = unit === "cm" ? 2.54 : 1 / 2.54; // in→cm or cm→in
    const c = (n: number) => Math.round(n * k * 10) / 10;
    mutate({
      unit,
      width: c(room.width),
      length: c(room.length),
      furniture: room.furniture.map((f) => ({
        ...f,
        x: c(f.x),
        y: c(f.y),
        width: c(f.width),
        depth: c(f.depth),
        height: c(f.height),
      })),
    });
  };

  const save = useCallback(async () => {
    setStatus("Saving…");
    try {
      const res = await fetch("/api/room", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room }),
      });
      if (!res.ok) throw new Error();
      setDirty(false);
      setStatus("Saved");
      window.setTimeout(() => setStatus(null), 1800);
    } catch {
      setStatus("Could not save");
    }
  }, [room]);

  // Autosave shortly after edits settle.
  useEffect(() => {
    if (!dirty) return;
    const t = window.setTimeout(save, 1500);
    return () => window.clearTimeout(t);
  }, [dirty, save]);

  const frontEdge = (f: Furniture) => {
    // Colored strip on the "front" (opening) side, based on rotation.
    const { w, h } = footprint(f);
    const t = Math.max(1.2, Math.min(w, h) * 0.12);
    switch (f.rotation) {
      case 0:
        return { x: f.x, y: f.y + h - t, w, h: t };
      case 180:
        return { x: f.x, y: f.y, w, h: t };
      case 90:
        return { x: f.x, y: f.y, w: t, h };
      case 270:
      default:
        return { x: f.x + w - t, y: f.y, w: t, h };
    }
  };

  return (
    <main className="page room-page">
      <nav className="subnav">
        <Link href="/shelf" className="nav-back">
          ← Shelf Plan
        </Link>
        <h1>Room Planner</h1>
        <button className="nav-print" onClick={save} disabled={!dirty}>
          {status ?? (dirty ? "Save" : "Saved")}
        </button>
      </nav>

      {loading ? (
        <p className="empty">Loading your room…</p>
      ) : (
        <>
          <div className="room-toolbar">
            <div className="room-size">
              <label>
                Room width ({unitLabel})
                <input
                  type="number"
                  value={room.width}
                  min={12}
                  onChange={(e) =>
                    mutate({ ...room, width: Number(e.target.value) || room.width })
                  }
                />
              </label>
              <label>
                Room length ({unitLabel})
                <input
                  type="number"
                  value={room.length}
                  min={12}
                  onChange={(e) =>
                    mutate({
                      ...room,
                      length: Number(e.target.value) || room.length,
                    })
                  }
                />
              </label>
              <div className="unit-toggle">
                <button
                  className={room.unit === "in" ? "on" : ""}
                  onClick={() => setUnit("in")}
                >
                  in
                </button>
                <button
                  className={room.unit === "cm" ? "on" : ""}
                  onClick={() => setUnit("cm")}
                >
                  cm
                </button>
              </div>
            </div>

            <div className="palette">
              <span className="palette-label">Add:</span>
              <button onClick={() => addPiece("billyWide")}>＋ Billy Wide</button>
              <button onClick={() => addPiece("billySkinny")}>
                ＋ Billy Skinny
              </button>
              <button onClick={() => addPiece("short")}>＋ Short</button>
              <button onClick={() => addPiece("tower")}>＋ Tower</button>
              <button onClick={() => addPiece("custom")}>＋ Custom</button>
              <button onClick={() => addPiece("custom", true)}>
                ＋ Custom Corner
              </button>
              <button
                className="ghost"
                onClick={() =>
                  mutate({ ...room, furniture: autoOrder(room.furniture) })
                }
                disabled={room.furniture.length === 0}
              >
                Auto-order
              </button>
            </div>
          </div>

          <div className="planner">
            <div className="canvas-wrap">
              <svg
                ref={svgRef}
                className="room-svg"
                width={room.width * scale}
                height={room.length * scale}
                viewBox={`0 0 ${room.width} ${room.length}`}
                style={{ touchAction: "none" }}
                onPointerMove={onSvgPointerMove}
                onPointerUp={onSvgPointerUp}
                onPointerDown={(e) => {
                  if (e.target === svgRef.current) setSelectedId(null);
                }}
              >
                <rect
                  x={0}
                  y={0}
                  width={room.width}
                  height={room.length}
                  className="room-floor"
                />
                {room.furniture.map((f) => {
                  const sel = f.id === selectedId;

                  // Corner pieces render diagonally (45°) into their room corner.
                  if (f.corner) {
                    const cg = cornerGeometry(f);
                    const t = Math.max(1.2, Math.min(f.depth, f.width) * 0.12);
                    const badgeR = Math.min(f.depth, f.width) * 0.3;
                    return (
                      <g
                        key={f.id}
                        onPointerDown={(e) => onPiecePointerDown(e, f)}
                        className={`piece corner ${sel ? "sel" : ""}`}
                      >
                        <g transform={`translate(${cg.cx} ${cg.cy}) rotate(${cg.angle})`}>
                          <rect
                            x={-f.depth / 2}
                            y={-f.width / 2}
                            width={f.depth}
                            height={f.width}
                            rx={1}
                            fill={colorFor(f.kind)}
                            stroke={sel ? "#fff" : "#00000055"}
                            strokeWidth={sel ? 1.5 : 0.6}
                          />
                          <rect
                            x={f.depth / 2 - t}
                            y={-f.width / 2}
                            width={t}
                            height={f.width}
                            fill="#ffd9a0"
                            opacity={0.9}
                          />
                        </g>
                        <circle cx={cg.cx} cy={cg.cy} r={badgeR} fill="#0009" />
                        <text
                          x={cg.cx}
                          y={cg.cy}
                          className="piece-order"
                          fontSize={badgeR * 1.1}
                        >
                          {f.order}
                        </text>
                      </g>
                    );
                  }

                  const { w, h } = footprint(f);
                  const fe = frontEdge(f);
                  const isTower = f.kind === "tower";
                  return (
                    <g
                      key={f.id}
                      onPointerDown={(e) => onPiecePointerDown(e, f)}
                      className={`piece ${sel ? "sel" : ""}`}
                    >
                      {isTower ? (
                        <ellipse
                          cx={f.x + w / 2}
                          cy={f.y + h / 2}
                          rx={w / 2}
                          ry={h / 2}
                          fill={colorFor(f.kind)}
                          stroke={sel ? "#fff" : "#00000055"}
                          strokeWidth={sel ? 1.5 : 0.6}
                        />
                      ) : (
                        <>
                          <rect
                            x={f.x}
                            y={f.y}
                            width={w}
                            height={h}
                            rx={1}
                            fill={colorFor(f.kind)}
                            stroke={sel ? "#fff" : "#00000055"}
                            strokeWidth={sel ? 1.5 : 0.6}
                          />
                          <rect
                            x={fe.x}
                            y={fe.y}
                            width={fe.w}
                            height={fe.h}
                            fill="#ffd9a0"
                            opacity={0.9}
                          />
                        </>
                      )}
                      <circle
                        cx={f.x + w / 2}
                        cy={f.y + h / 2}
                        r={Math.min(w, h) * 0.28}
                        fill="#0009"
                      />
                      <text
                        x={f.x + w / 2}
                        y={f.y + h / 2}
                        className="piece-order"
                        fontSize={Math.min(w, h) * 0.32}
                      >
                        {f.order}
                      </text>
                    </g>
                  );
                })}
              </svg>
              <p className="canvas-hint">
                Drag any piece (including corners) to place it · the light edge
                is the shelf front · pick a wall or corner in the panel · numbers
                are the fill order
              </p>
            </div>

            <aside className="props">
              {selected ? (
                <>
                  <div className="props-head">
                    <input
                      className="props-label"
                      value={selected.label}
                      onChange={(e) =>
                        patchFurniture(selected.id, { label: e.target.value })
                      }
                    />
                    <button
                      className="props-del"
                      onClick={() => removePiece(selected.id)}
                    >
                      Delete
                    </button>
                  </div>

                  <div className="props-grid">
                    <label>
                      Width ({unitLabel})
                      <input
                        type="number"
                        value={selected.width}
                        onChange={(e) =>
                          patchFurniture(selected.id, {
                            width: Number(e.target.value) || 1,
                          })
                        }
                      />
                    </label>
                    <label>
                      Depth ({unitLabel})
                      <input
                        type="number"
                        value={selected.depth}
                        onChange={(e) =>
                          patchFurniture(selected.id, {
                            depth: Number(e.target.value) || 1,
                          })
                        }
                      />
                    </label>
                    <label>
                      Height ({unitLabel})
                      <input
                        type="number"
                        value={selected.height}
                        onChange={(e) =>
                          patchFurniture(selected.id, {
                            height: Number(e.target.value) || 1,
                          })
                        }
                      />
                    </label>
                    <label>
                      Shelves
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={selected.shelves}
                        onChange={(e) =>
                          patchFurniture(selected.id, {
                            shelves: Number(e.target.value) || 1,
                          })
                        }
                      />
                    </label>
                    <label>
                      Fill order
                      <input
                        type="number"
                        min={1}
                        value={selected.order}
                        onChange={(e) =>
                          patchFurniture(selected.id, {
                            order: Number(e.target.value) || 1,
                          })
                        }
                      />
                    </label>
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={selected.extension}
                        onChange={(e) =>
                          patchFurniture(selected.id, {
                            extension: e.target.checked,
                          })
                        }
                      />
                      Top extension
                    </label>
                  </div>

                  <div className="corner-picker">
                    <span className="corner-label">Corner (45°)</span>
                    <div className="corner-btns">
                      <button
                        className={!selected.corner ? "on" : ""}
                        onClick={() => setCorner(selected.id, null)}
                      >
                        None
                      </button>
                      {CORNERS.map((c) => (
                        <button
                          key={c}
                          className={selected.corner === c ? "on" : ""}
                          onClick={() => setCorner(selected.id, c)}
                        >
                          {CORNER_LABEL[c]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {!selected.corner && (
                    <div className="corner-picker">
                      <span className="corner-label">Against wall</span>
                      <div className="corner-btns wall-btns">
                        {WALLS.map((w) => (
                          <button
                            key={w}
                            className={
                              rotationWall(selected.rotation) === w ? "on" : ""
                            }
                            onClick={() => setWall(selected.id, w)}
                          >
                            {WALL_LABEL[w]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="props-actions">
                    <span className="usable">
                      Usable shelf: {selected.width} {unitLabel} ×{" "}
                      {selected.shelves + (selected.extension ? 1 : 0)} shelves
                      {selected.corner
                        ? " · corner-mounted (drag to reposition)"
                        : ` · against ${rotationWall(selected.rotation)} wall`}
                    </span>
                  </div>
                </>
              ) : (
                <p className="props-empty">
                  Add a bookcase, then select it to set exact measurements and
                  its place in the fill order.
                </p>
              )}
            </aside>
          </div>

          <p className="note">
            {room.furniture.length} piece
            {room.furniture.length === 1 ? "" : "s"} placed. Turn on{" "}
            <strong>“Use my room layout”</strong> on the{" "}
            <Link href="/shelf">Shelf Plan</Link> to arrange your books onto
            these shelves in this order.
          </p>
        </>
      )}
    </main>
  );
}
