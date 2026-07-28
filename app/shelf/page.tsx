"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import nextDynamic from "next/dynamic";
import Link from "next/link";
import type { Book } from "@/lib/db";
import {
  planLibrary,
  DEFAULT_OPTIONS,
  SECTIONS,
  sectionColor,
  type ShelfOptions,
  type PlannedShelf,
} from "@/lib/shelf";

const BookEditor = nextDynamic(() => import("@/components/BookEditor"), {
  ssr: false,
});

const OPT_KEY = "shelfPlan.options.v1";

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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(OPT_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p.opts) setOpts((o) => ({ ...o, ...p.opts }));
        if (p.scale) setScale(p.scale);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(OPT_KEY, JSON.stringify({ opts, scale }));
    } catch {
      /* ignore */
    }
  }, [opts, scale]);

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
  }, [load]);

  const plan = useMemo(() => planLibrary(books, opts), [books, opts]);

  const bays = useMemo(() => {
    const m = new Map<number, PlannedShelf[]>();
    for (const sh of plan.shelves) {
      const a = m.get(sh.bay) ?? [];
      a.push(sh);
      m.set(sh.bay, a);
    }
    return [...m.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, s]) => s.sort((x, y) => x.indexInBay - y.indexInBay));
  }, [plan]);

  const shelvesPerBay = opts.shelvesPerBay + (opts.hasExtension ? 1 : 0);
  const fillPct = plan.shelves.length
    ? Math.round(
        (plan.totalLinearMm / (plan.shelves.length * plan.capacityMm)) * 100
      )
    : 0;
  const uncategorized = books.filter((b) => b.categories.length === 0).length;

  const setOpt = <K extends keyof ShelfOptions>(k: K, v: ShelfOptions[K]) =>
    setOpts((o) => ({ ...o, [k]: v }));

  const bayInnerWidth = plan.capacityMm * scale;

  return (
    <main className="page shelf-page">
      <nav className="subnav no-print">
        <Link href="/" className="nav-back">
          ← Library
        </Link>
        <h1>Shelf Plan</h1>
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
          <section className="stats-card">
            <div className="stat">
              <span className="stat-n">{plan.totalBooks}</span>
              <span className="stat-l">books</span>
            </div>
            <div className="stat">
              <span className="stat-n">{(plan.totalLinearMm / 1000).toFixed(1)} m</span>
              <span className="stat-l">of spines</span>
            </div>
            <div className="stat">
              <span className="stat-n">{plan.bayCount}</span>
              <span className="stat-l">
                bookcase{plan.bayCount === 1 ? "" : "s"} ({shelvesPerBay} shelves)
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
            <div className="opt-grid">
              <label>
                Shelf width (cm)
                <input
                  type="number"
                  min={30}
                  max={120}
                  value={opts.shelfWidthCm}
                  onChange={(e) => setOpt("shelfWidthCm", Number(e.target.value) || 76)}
                />
              </label>
              <label>
                Main shelves / bay
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={opts.shelvesPerBay}
                  onChange={(e) => setOpt("shelvesPerBay", Number(e.target.value) || 6)}
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
            {bays.map((shelves, bi) => (
              <div
                className="bookcase"
                key={bi}
                style={{ width: bayInnerWidth + 26 }}
              >
                <div className="bay-label">Bookcase {bi + 1}</div>
                <div className="bay-frame">
                  {shelves.map((sh) => (
                    <div
                      className={`shelf ${sh.isExtension ? "ext" : ""}`}
                      key={sh.indexInBay}
                    >
                      {sh.isExtension && <div className="ext-tag">Extension</div>}
                      <div
                        className="shelf-books"
                        style={{ width: bayInnerWidth }}
                      >
                        {sh.items.map((it) => {
                          const w = Math.max(it.widthMm * scale, 3);
                          const h = 74 + (hashStr(it.book.id) % 22);
                          const wide = w >= 15;
                          return (
                            <button
                              key={it.book.id}
                              className="spine"
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
                      <div className="shelf-caption">
                        {sh.indexInBay + 1}. {sh.sections.join(" / ")} ·{" "}
                        {Math.round(sh.usedMm / 10)} cm
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* ---- printable shelf-by-shelf plan ---- */}
          <div className="print-plan">
            <h2 className="print-only plan-title">
              Library Shelf Plan — {plan.totalBooks} books
            </h2>
            {bays.map((shelves, bi) => (
              <div className="pp-bay" key={bi}>
                <h3>Bookcase {bi + 1}</h3>
                {shelves.map((sh) => (
                  <div className="pp-shelf" key={sh.indexInBay}>
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
