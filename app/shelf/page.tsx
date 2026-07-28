"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import nextDynamic from "next/dynamic";
import Link from "next/link";
import type { Book } from "@/lib/db";
import { fetchCategories, createCategory } from "@/lib/categoryClient";
import { roomToBayConfigs, type Room } from "@/lib/room";
import {
  planLibrary,
  DEFAULT_OPTIONS,
  SECTIONS,
  sectionColor,
  placeBook,
  finalizeShelves,
  reconcileManual,
  planToRows,
  SAMPLE_WALL,
  BILLY_WIDE_CM,
  BILLY_NARROW_CM,
  type ShelfOptions,
  type PlannedShelf,
  type BayConfig,
} from "@/lib/shelf";

const BookEditor = nextDynamic(() => import("@/components/BookEditor"), {
  ssr: false,
});

const OPT_KEY = "shelfPlan.options.v1";
const MANUAL_KEY = "shelfPlan.manual.v1";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export default function ShelfPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [opts, setOpts] = useState<ShelfOptions>(DEFAULT_OPTIONS);
  const [scale, setScale] = useState(1.3); // px per mm, visual only
  const [editing, setEditing] = useState<Book | null>(null);

  // Manual drag layout: null = follow the auto plan; otherwise ordered id rows.
  const [manual, setManual] = useState<string[][] | null>(null);
  const [savedManual, setSavedManual] = useState<string[][] | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropShelf, setDropShelf] = useState<number | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [room, setRoom] = useState<Room | null>(null);
  const [useRoom, setUseRoom] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(OPT_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p.opts) setOpts((o) => ({ ...o, ...p.opts }));
        if (p.scale) setScale(p.scale);
        if (typeof p.useRoom === "boolean") setUseRoom(p.useRoom);
      }
    } catch {
      /* ignore */
    }
    try {
      const rawM = localStorage.getItem(MANUAL_KEY);
      if (rawM) {
        const rows = JSON.parse(rawM);
        if (Array.isArray(rows)) setSavedManual(rows);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(OPT_KEY, JSON.stringify({ opts, scale, useRoom }));
    } catch {
      /* ignore */
    }
  }, [opts, scale, useRoom]);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/books", { cache: "no-store" });
      const d = await r.json();
      if (r.ok) setBooks(d.books ?? []);
    } catch {
      /* offline */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    fetchCategories().then(setCategories).catch(() => {});
    fetch("/api/room", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.room) setRoom(d.room);
      })
      .catch(() => {});
  }, [load]);

  const onCreateCategory = useCallback(async (name: string) => {
    const list = await createCategory(name);
    setCategories(list);
    return name;
  }, []);

  // When "use my room layout" is on, the room's furniture (in fill order)
  // supplies the bays; otherwise the option-panel settings apply.
  const planOpts = useMemo<ShelfOptions>(() => {
    if (useRoom && room && room.furniture.length > 0) {
      return { ...opts, bookcases: roomToBayConfigs(room) };
    }
    return opts;
  }, [opts, useRoom, room]);

  const plan = useMemo(
    () => planLibrary(books, planOpts),
    [books, planOpts]
  );

  const byId = useMemo(
    () => new Map(books.map((b) => [b.id, b])),
    [books]
  );

  // Once books are loaded, adopt a saved manual layout (reconciled to the
  // current library). Runs when the saved layout or the book set changes.
  useEffect(() => {
    if (savedManual && books.length && manual === null) {
      setManual(reconcileManual(savedManual, books));
    }
  }, [savedManual, books, manual]);

  // Persist the manual layout (or clear it when back on the auto plan).
  useEffect(() => {
    try {
      if (manual) localStorage.setItem(MANUAL_KEY, JSON.stringify(manual));
      else localStorage.removeItem(MANUAL_KEY);
    } catch {
      /* ignore */
    }
  }, [manual]);

  // The shelves actually rendered: manual layout if present, else auto plan.
  const displayShelves = useMemo<PlannedShelf[]>(() => {
    if (manual) {
      const rows = manual.map((row) =>
        row
          .map((id) => byId.get(id))
          .filter((b): b is Book => Boolean(b))
          .map((b) => placeBook(b, planOpts))
      );
      return finalizeShelves(rows, planOpts);
    }
    return plan.shelves;
  }, [manual, byId, planOpts, plan]);

  const bays = useMemo(() => {
    const m = new Map<number, PlannedShelf[]>();
    for (const sh of displayShelves) {
      const a = m.get(sh.bay) ?? [];
      a.push(sh);
      m.set(sh.bay, a);
    }
    return [...m.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, s]) => s.sort((x, y) => x.indexInBay - y.indexInBay));
  }, [displayShelves]);

  const shelvesPerBay = opts.shelvesPerBay + (opts.hasExtension ? 1 : 0);
  const capacityMm = opts.shelfWidthCm * 10;
  const totalLinearMm = displayShelves.reduce((s, sh) => s + sh.usedMm, 0);
  const usedShelves = displayShelves.filter((s) => s.items.length > 0);
  const usedCapacityMm = usedShelves.reduce((s, sh) => s + sh.capacityMm, 0);
  const bayCount = displayShelves.length
    ? Math.max(...displayShelves.map((s) => s.bay)) + 1
    : 0;
  const fillPct = usedCapacityMm
    ? Math.round((totalLinearMm / usedCapacityMm) * 100)
    : 0;
  const uncategorized = books.filter((b) => b.categories.length === 0).length;

  const setOpt = <K extends keyof ShelfOptions>(k: K, v: ShelfOptions[K]) =>
    setOpts((o) => ({ ...o, [k]: v }));

  /* ---- custom bookcase layout editing ---- */
  const customBays = opts.bookcases;
  const setBays = (next: BayConfig[] | undefined) =>
    setOpts((o) => ({ ...o, bookcases: next }));
  const updateBay = (i: number, patch: Partial<BayConfig>) =>
    setBays((customBays ?? []).map((b, j) => (j === i ? { ...b, ...patch } : b)));
  const addBay = (widthCm: number) =>
    setBays([
      ...(customBays ?? []),
      { widthCm, shelves: opts.shelvesPerBay, extension: opts.hasExtension },
    ]);
  const removeBay = (i: number) =>
    setBays((customBays ?? []).filter((_, j) => j !== i));

  /* ---- drag to move ---- */
  const onSpineDragStart = (e: React.DragEvent, bookId: string) => {
    e.dataTransfer.setData("text/plain", bookId);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(bookId);
  };

  const onShelfDragOver = (e: React.DragEvent, shelfIndex: number) => {
    if (!draggingId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dropShelf !== shelfIndex) setDropShelf(shelfIndex);
  };

  const onShelfDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const bookId = draggingId || e.dataTransfer.getData("text/plain");
    setDraggingId(null);
    setDropShelf(null);
    if (!bookId) return;

    // Insertion position from the cursor's x among this shelf's spines.
    const container = e.currentTarget as HTMLElement;
    const spines = Array.from(
      container.querySelectorAll<HTMLElement>(".spine")
    );
    let insertIdx = spines.length;
    for (let i = 0; i < spines.length; i++) {
      const r = spines[i].getBoundingClientRect();
      if (e.clientX < r.left + r.width / 2) {
        insertIdx = i;
        break;
      }
    }

    setManual((prev) => {
      const base = (prev ?? planToRows(plan)).map((row) => [...row]);
      let src = -1;
      let srcIdx = -1;
      for (let s = 0; s < base.length; s++) {
        const k = base[s].indexOf(bookId);
        if (k >= 0) {
          src = s;
          srcIdx = k;
          break;
        }
      }
      if (src === -1) return prev;
      const target = Math.min(targetIndex, base.length - 1);
      base[src].splice(srcIdx, 1);
      let idx = insertIdx;
      if (src === target && srcIdx < idx) idx--;
      base[target].splice(idx, 0, bookId);
      return base;
    });
  };

  const resetToAuto = () => {
    if (!confirm("Discard your manual arrangement and return to the auto plan?"))
      return;
    setManual(null);
    setSavedManual(null);
  };

  return (
    <main className="page shelf-page">
      <nav className="subnav no-print">
        <Link href="/" className="nav-back">
          ← Library
        </Link>
        <h1>Shelf Plan</h1>
        <Link href="/room" className="nav-room no-print">
          🗺 Room Planner
        </Link>
        <button className="nav-print" onClick={() => window.print()}>
          🖨 Print
        </button>
      </nav>

      {loading ? (
        <p className="empty">Planning your shelves…</p>
      ) : books.length === 0 ? (
        <p className="empty">
          No books yet. <Link href="/">Add some</Link> and come back.
        </p>
      ) : (
        <>
          <div className="layout-bar no-print">
            <span className={`layout-pill ${manual ? "custom" : "auto"}`}>
              {manual ? "✎ Custom layout" : "◆ Auto layout"}
            </span>
            <span className="layout-hint">
              Drag a book spine to move it between shelves — your arrangement is
              saved on this device.
            </span>
            {manual && (
              <button className="layout-reset" onClick={resetToAuto}>
                Reset to auto
              </button>
            )}
          </div>

          <section className="stats-card">
            <div className="stat">
              <span className="stat-n">{books.length}</span>
              <span className="stat-l">books</span>
            </div>
            <div className="stat">
              <span className="stat-n">{(totalLinearMm / 1000).toFixed(1)} m</span>
              <span className="stat-l">of spines</span>
            </div>
            <div className="stat">
              <span className="stat-n">{bayCount}</span>
              <span className="stat-l">
                bookcase{bayCount === 1 ? "" : "s"} ({shelvesPerBay} shelves)
              </span>
            </div>
            <div className="stat">
              <span className="stat-n">{fillPct}%</span>
              <span className="stat-l">avg fill</span>
            </div>
          </section>

          {uncategorized > 0 && (
            <p className="note no-print">
              {uncategorized} book{uncategorized === 1 ? "" : "s"} still
              uncategorized (shelved at the end). Tap a spine to categorize, or
              use <Link href="/">Auto-categorize</Link> on the library page.
            </p>
          )}

          <details className="options no-print">
            <summary>Shelf &amp; sizing options</summary>

            <label className="checkbox custom-toggle">
              <input
                type="checkbox"
                checked={useRoom}
                disabled={!room || room.furniture.length === 0}
                onChange={(e) => setUseRoom(e.target.checked)}
              />
              Use my room layout{" "}
              <Link href="/room" className="inline-link">
                {room && room.furniture.length
                  ? `(${room.furniture.length} pieces · edit)`
                  : "(set one up)"}
              </Link>
            </label>

            <label className="checkbox custom-toggle">
              <input
                type="checkbox"
                checked={Boolean(customBays)}
                disabled={useRoom}
                onChange={(e) =>
                  setBays(e.target.checked ? SAMPLE_WALL : undefined)
                }
              />
              Match my actual bookcases (mixed widths)
            </label>

            <div className="opt-grid">
              {!customBays && (
                <>
                  <label>
                    Shelf width (cm)
                    <input
                      type="number"
                      min={30}
                      max={120}
                      value={opts.shelfWidthCm}
                      onChange={(e) =>
                        setOpt("shelfWidthCm", Number(e.target.value) || 76)
                      }
                    />
                  </label>
                  <label>
                    Main shelves / bay
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={opts.shelvesPerBay}
                      onChange={(e) =>
                        setOpt("shelvesPerBay", Number(e.target.value) || 6)
                      }
                    />
                  </label>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={opts.hasExtension}
                      onChange={(e) => setOpt("hasExtension", e.target.checked)}
                    />
                    Top extension shelf
                  </label>
                </>
              )}
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={opts.sectionStartsNewShelf}
                  onChange={(e) =>
                    setOpt("sectionStartsNewShelf", e.target.checked)
                  }
                />
                Start each section on a new shelf
              </label>
              <label>
                Paper thickness (mm/page)
                <input
                  type="number"
                  step={0.005}
                  min={0.02}
                  max={0.15}
                  value={opts.mmPerPage}
                  onChange={(e) =>
                    setOpt("mmPerPage", Number(e.target.value) || 0.055)
                  }
                />
              </label>
              <label>
                Zoom ({scale.toFixed(1)} px/mm)
                <input
                  type="range"
                  min={0.6}
                  max={3}
                  step={0.1}
                  value={scale}
                  onChange={(e) => setScale(Number(e.target.value))}
                />
              </label>
            </div>

            {customBays && (
              <div className="bay-editor">
                <p className="bay-editor-hint">
                  List your bookcases left → right (IKEA BILLY: wide = 76 cm,
                  narrow = 36 cm, 6 shelves + 1 for the extension).
                </p>
                {customBays.map((b, i) => (
                  <div className="bay-row" key={i}>
                    <span className="bay-num">{i + 1}</span>
                    <select
                      value={b.widthCm}
                      onChange={(e) =>
                        updateBay(i, { widthCm: Number(e.target.value) })
                      }
                    >
                      <option value={BILLY_WIDE_CM}>Wide 76 cm</option>
                      <option value={BILLY_NARROW_CM}>Narrow 36 cm</option>
                      {b.widthCm !== BILLY_WIDE_CM &&
                        b.widthCm !== BILLY_NARROW_CM && (
                          <option value={b.widthCm}>{b.widthCm} cm</option>
                        )}
                    </select>
                    <label className="bay-shelves">
                      shelves
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={b.shelves}
                        onChange={(e) =>
                          updateBay(i, {
                            shelves: Number(e.target.value) || 6,
                          })
                        }
                      />
                    </label>
                    <label className="bay-ext">
                      <input
                        type="checkbox"
                        checked={b.extension}
                        onChange={(e) =>
                          updateBay(i, { extension: e.target.checked })
                        }
                      />
                      ext
                    </label>
                    {b.label && <span className="bay-tag">{b.label}</span>}
                    <button
                      className="bay-del"
                      onClick={() => removeBay(i)}
                      aria-label="Remove bookcase"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <div className="bay-add">
                  <button onClick={() => addBay(BILLY_WIDE_CM)}>
                    + Wide bay
                  </button>
                  <button onClick={() => addBay(BILLY_NARROW_CM)}>
                    + Narrow bay
                  </button>
                  <button onClick={() => setBays(SAMPLE_WALL)}>
                    Reset to my wall (4 wide + 3 narrow)
                  </button>
                </div>
              </div>
            )}
          </details>

          <div className="legend no-print">
            {SECTIONS.map((s) => (
              <span key={s.key} className="legend-item">
                <span
                  className="legend-swatch"
                  style={{ background: sectionColor(s) }}
                />
                {s.title}
              </span>
            ))}
          </div>

          {/* ---- visual bookcases ---- */}
          <div className="wall no-print">
            {bays.map((shelves, bi) => {
              const bayCapMm = shelves[0]?.capacityMm ?? capacityMm;
              const bayInnerWidth = bayCapMm * scale;
              return (
                <div
                  className="bookcase"
                  key={bi}
                  style={{ width: bayInnerWidth + 26 }}
                >
                  <div className="bay-label">
                    Bookcase {bi + 1} · {Math.round(bayCapMm / 10)} cm
                  </div>
                  <div className="bay-frame">
                    {shelves.map((sh) => {
                      const over = sh.usedMm > sh.capacityMm;
                    return (
                      <div
                        className={`shelf ${sh.isExtension ? "ext" : ""} ${
                          dropShelf === sh.globalIndex ? "drop-target" : ""
                        }`}
                        key={sh.globalIndex}
                      >
                        {sh.isExtension && (
                          <div className="ext-tag">Extension</div>
                        )}
                        <div
                          className="shelf-books"
                          style={{ width: bayInnerWidth }}
                          onDragOver={(e) => onShelfDragOver(e, sh.globalIndex)}
                          onDragLeave={() => setDropShelf(null)}
                          onDrop={(e) => onShelfDrop(e, sh.globalIndex)}
                        >
                          {sh.items.map((it) => {
                            const w = Math.max(it.widthMm * scale, 3);
                            const h = 74 + (hashStr(it.book.id) % 22);
                            const wide = w >= 15;
                            return (
                              <button
                                key={it.book.id}
                                className={`spine ${
                                  draggingId === it.book.id ? "dragging" : ""
                                }`}
                                draggable
                                onDragStart={(e) =>
                                  onSpineDragStart(e, it.book.id)
                                }
                                onDragEnd={() => {
                                  setDraggingId(null);
                                  setDropShelf(null);
                                }}
                                style={{
                                  width: w,
                                  height: `${h}%`,
                                  background: it.color,
                                }}
                                title={`${it.book.title}${
                                  it.book.authors ? " — " + it.book.authors : ""
                                } · ${it.category} · ${it.widthMm} mm`}
                                onClick={() => setEditing(it.book)}
                              >
                                {wide && (
                                  <span className="spine-title">
                                    {it.book.title}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        <div className="plank" />
                        <div className={`shelf-caption ${over ? "over" : ""}`}>
                          {sh.indexInBay + 1}. {sh.sections.join(" / ") || "—"} ·{" "}
                          {Math.round(sh.usedMm / 10)} cm
                          {over
                            ? ` · over by ${Math.round(
                                (sh.usedMm - sh.capacityMm) / 10
                              )} cm`
                            : ""}
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ---- printable shelf-by-shelf plan ---- */}
          <div className="print-plan">
            <h2 className="print-only plan-title">
              Library Shelf Plan — {books.length} books
            </h2>
            {bays.map((shelves, bi) => (
              <div className="pp-bay" key={bi}>
                <h3>Bookcase {bi + 1}</h3>
                {shelves.map((sh) => (
                  <div className="pp-shelf" key={sh.globalIndex}>
                    <h4>
                      Shelf {sh.indexInBay + 1}
                      {sh.isExtension ? " · top extension" : ""} —{" "}
                      {sh.sections.join(" / ")}
                      <span className="pp-fill">
                        {Math.round(sh.usedMm / 10)}/
                        {Math.round(sh.capacityMm / 10)} cm
                      </span>
                    </h4>
                    <ol>
                      {sh.items.map((it) => (
                        <li key={it.book.id}>
                          <span
                            className="pp-dot"
                            style={{ background: it.color }}
                          />
                          <strong>{it.book.title}</strong>
                          {it.book.authors ? ` — ${it.book.authors}` : ""}
                          <em>
                            {" "}
                            · {it.category} · {it.widthMm} mm
                          </em>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      {editing && (
        <BookEditor
          book={editing}
          categories={categories}
          onCreateCategory={onCreateCategory}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setBooks((prev) =>
              prev.map((b) => (b.id === updated.id ? updated : b))
            );
            setEditing(null);
          }}
          onDeleted={(id) => {
            setBooks((prev) => prev.filter((b) => b.id !== id));
            setEditing(null);
          }}
        />
      )}
    </main>
  );
}
