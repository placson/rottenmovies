"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { Book } from "@/lib/db";
import { fetchCategories, createCategory } from "@/lib/categoryClient";

// These touch browser-only APIs, so load them client-side only.
const Scanner = dynamic(() => import("@/components/Scanner"), { ssr: false });
const BookEditor = dynamic(() => import("@/components/BookEditor"), {
  ssr: false,
});
const CategoryManager = dynamic(
  () => import("@/components/CategoryManager"),
  { ssr: false }
);

type Toast = { text: string; kind: "ok" | "err" | "warn" } | null;

function readingStatus(b: Book): "read" | "reading" | "unread" {
  if (b.date_finished) return "read";
  if (b.date_started) return "reading";
  return "unread";
}

export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [manualIsbn, setManualIsbn] = useState("");
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [editing, setEditing] = useState<Book | null>(null);
  const [busy, setBusy] = useState(false);
  const [reorganizing, setReorganizing] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [managingCats, setManagingCats] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const showToast = useCallback(
    (text: string, kind: "ok" | "err" | "warn") => {
      setToast({ text, kind });
      window.setTimeout(() => setToast(null), kind === "warn" ? 4200 : 3200);
    },
    []
  );

  const loadBooks = useCallback(async () => {
    try {
      const res = await fetch("/api/books", { cache: "no-store" });
      if (res.status === 401) {
        window.location.href = "/sign-in";
        return;
      }
      const data = await res.json();
      if (res.ok) setBooks(data.books ?? []);
    } catch {
      /* offline — keep whatever we have */
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      setCategories(await fetchCategories());
    } catch {
      /* keep existing */
    }
  }, []);

  useEffect(() => {
    loadBooks();
    loadCategories();
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, [loadBooks, loadCategories]);

  const onCreateCategory = useCallback(
    async (name: string) => {
      const list = await createCategory(name);
      setCategories(list);
      return name;
    },
    []
  );

  const addByIsbn = useCallback(
    async (isbn: string) => {
      const clean = isbn.trim();
      if (!clean) return;
      setBusy(true);
      try {
        const res = await fetch("/api/books", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isbn: clean }),
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error ?? "Couldn't add that book.", "err");
          return;
        }
        if (data.created) {
          setBooks((prev) => [data.book, ...prev]);
          showToast(`Added “${data.book.title}”`, "ok");
        } else {
          // Duplicate re-scan — warn clearly, buzz differently, and flash the
          // book that's already on the shelf.
          showToast(
            `⚠️ Already in your library — “${data.book.title}”`,
            "warn"
          );
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate([70, 60, 70]);
          }
          const dupId = data.book.id as string;
          // Make sure the existing book is visible so the flash is useful.
          setActiveCat(null);
          setQuery("");
          setHighlightId(dupId);
          window.setTimeout(() => {
            document
              .getElementById(`book-${dupId}`)
              ?.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 80);
          window.setTimeout(
            () => setHighlightId((id) => (id === dupId ? null : id)),
            2800
          );
        }
        setManualIsbn("");
      } catch {
        showToast("Network error — is the site reachable?", "err");
      } finally {
        setBusy(false);
      }
    },
    [showToast]
  );

  const onDetected = useCallback(
    (code: string) => {
      setScanning(false);
      addByIsbn(code);
    },
    [addByIsbn]
  );

  const reorganize = useCallback(async () => {
    setReorganizing(true);
    try {
      const res = await fetch("/api/reorganize", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? "Reorganize failed.", "err");
        return;
      }
      await loadBooks();
      showToast(
        data.updated > 0
          ? `Auto-categorized ${data.updated} of ${data.scanned} book${
              data.scanned === 1 ? "" : "s"
            }.`
          : "No new categories could be guessed.",
        data.updated > 0 ? "ok" : "err"
      );
    } catch {
      showToast("Network error during reorganize.", "err");
    } finally {
      setReorganizing(false);
    }
  }, [loadBooks, showToast]);

  // Category → count, for the filter bar.
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of books) {
      for (const c of b.categories) counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [books]);

  const uncategorizedCount = useMemo(
    () => books.filter((b) => b.categories.length === 0).length,
    [books]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return books.filter((b) => {
      if (activeCat === "__uncat__" && b.categories.length > 0) return false;
      if (
        activeCat &&
        activeCat !== "__uncat__" &&
        !b.categories.includes(activeCat)
      )
        return false;
      if (!q) return true;
      return (
        b.title.toLowerCase().includes(q) ||
        b.authors.toLowerCase().includes(q) ||
        b.isbn.includes(q) ||
        b.categories.some((c) => c.toLowerCase().includes(q))
      );
    });
  }, [books, query, activeCat]);

  return (
    <main className="page">
      <header className="header">
        <div>
          <h1>My Library</h1>
          <p className="count">
            {books.length} {books.length === 1 ? "book" : "books"}
          </p>
        </div>
        <div className="header-actions">
          <Link href="/shelf" className="shelf-link">
            🗄 Shelf Plan
          </Link>
          <button
            className="scan-btn"
            onClick={() => setScanning(true)}
            disabled={busy}
          >
            <span className="scan-icon" aria-hidden>
              ▚
            </span>
            Scan
          </button>
        </div>
      </header>

      <div className="controls">
        <form
          className="manual-form"
          onSubmit={(e) => {
            e.preventDefault();
            addByIsbn(manualIsbn);
          }}
        >
          <input
            inputMode="numeric"
            placeholder="Enter ISBN manually…"
            value={manualIsbn}
            onChange={(e) => setManualIsbn(e.target.value)}
          />
          <button type="submit" disabled={busy || !manualIsbn.trim()}>
            Add
          </button>
        </form>
        {books.length > 0 && (
          <input
            className="search"
            placeholder="Search title, author, ISBN, category…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        )}
        {uncategorizedCount > 0 && (
          <button
            className="reorg-btn"
            onClick={reorganize}
            disabled={reorganizing}
          >
            {reorganizing
              ? "Categorizing…"
              : `✨ Auto-categorize ${uncategorizedCount} uncategorized`}
          </button>
        )}
        <button
          className="manage-cats-btn"
          onClick={() => setManagingCats(true)}
        >
          ⚙ Manage categories
        </button>
      </div>

      {(categoryCounts.length > 0 || uncategorizedCount > 0) && (
        <div className="cat-bar">
          <button
            className={`cat-filter ${activeCat === null ? "on" : ""}`}
            onClick={() => setActiveCat(null)}
          >
            All <span className="n">{books.length}</span>
          </button>
          {categoryCounts.map(([cat, n]) => (
            <button
              key={cat}
              className={`cat-filter ${activeCat === cat ? "on" : ""}`}
              onClick={() => setActiveCat(cat)}
            >
              {cat} <span className="n">{n}</span>
            </button>
          ))}
          {uncategorizedCount > 0 && (
            <button
              className={`cat-filter ${activeCat === "__uncat__" ? "on" : ""}`}
              onClick={() => setActiveCat("__uncat__")}
            >
              Uncategorized <span className="n">{uncategorizedCount}</span>
            </button>
          )}
        </div>
      )}

      {loading ? (
        <p className="empty">Loading your library…</p>
      ) : filtered.length === 0 ? (
        <div className="empty">
          {books.length === 0 ? (
            <>
              <p className="empty-title">Your shelf is empty</p>
              <p>
                Tap <strong>Scan</strong> and point your camera at a
                book&rsquo;s barcode.
              </p>
            </>
          ) : (
            <p>Nothing matches the current filter.</p>
          )}
        </div>
      ) : (
        <ul className="grid">
          {filtered.map((book) => {
            const status = readingStatus(book);
            return (
              <li
                key={book.id}
                id={`book-${book.id}`}
                className={`card ${highlightId === book.id ? "dup-flash" : ""}`}
                onClick={() => setEditing(book)}
              >
                <div className="cover">
                  {book.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={book.cover_url} alt={book.title} loading="lazy" />
                  ) : (
                    <div className="cover-fallback">
                      {book.title.slice(0, 1)}
                    </div>
                  )}
                  {status !== "unread" && (
                    <span className={`status-badge ${status}`}>
                      {status === "read" ? "Read" : "Reading"}
                    </span>
                  )}
                </div>
                <div className="meta">
                  <p className="title" title={book.title}>
                    {book.title}
                  </p>
                  {book.authors && <p className="authors">{book.authors}</p>}
                  {book.rating ? (
                    <p
                      className="card-stars"
                      aria-label={`${book.rating} of 5`}
                    >
                      {"★".repeat(book.rating)}
                      <span className="off">
                        {"★".repeat(5 - book.rating)}
                      </span>
                    </p>
                  ) : null}
                  {book.categories.length > 0 && (
                    <p className="card-cat">{book.categories[0]}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {scanning && (
        <Scanner onDetected={onDetected} onClose={() => setScanning(false)} />
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
            showToast("Saved", "ok");
          }}
          onDeleted={(id) => {
            setBooks((prev) => prev.filter((b) => b.id !== id));
            setEditing(null);
            showToast("Removed", "ok");
          }}
        />
      )}

      {managingCats && (
        <CategoryManager
          categories={categories}
          books={books}
          onClose={() => setManagingCats(false)}
          onChanged={() => {
            loadCategories();
            loadBooks();
          }}
        />
      )}

      {(busy || reorganizing) && <div className="busy-bar" aria-hidden />}

      {toast && (
        <div className={`toast ${toast.kind}`} role="status">
          {toast.text}
        </div>
      )}
    </main>
  );
}
