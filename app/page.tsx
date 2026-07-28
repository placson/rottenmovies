"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { Book } from "@/lib/db";

// Scanner touches the camera API, so only load it in the browser.
const Scanner = dynamic(() => import("@/components/Scanner"), { ssr: false });

type Toast = { text: string; kind: "ok" | "err" } | null;

export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [manualIsbn, setManualIsbn] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  const showToast = useCallback((text: string, kind: "ok" | "err") => {
    setToast({ text, kind });
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const loadBooks = useCallback(async () => {
    try {
      const res = await fetch("/api/books", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setBooks(data.books ?? []);
    } catch {
      /* offline — keep whatever we have */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBooks();
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, [loadBooks]);

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
          showToast(`Already in your library: “${data.book.title}”`, "err");
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

  const removeBook = useCallback(
    async (book: Book) => {
      if (!confirm(`Remove “${book.title}” from your library?`)) return;
      const prev = books;
      setBooks((b) => b.filter((x) => x.id !== book.id));
      try {
        const res = await fetch(`/api/books/${book.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
      } catch {
        setBooks(prev); // roll back
        showToast("Couldn't remove that book.", "err");
      }
    },
    [books, showToast]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return books;
    return books.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.authors.toLowerCase().includes(q) ||
        b.isbn.includes(q)
    );
  }, [books, query]);

  return (
    <main className="page">
      <header className="header">
        <div>
          <h1>My Library</h1>
          <p className="count">
            {books.length} {books.length === 1 ? "book" : "books"}
          </p>
        </div>
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
            placeholder="Search your library…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        )}
      </div>

      {loading ? (
        <p className="empty">Loading your library…</p>
      ) : filtered.length === 0 ? (
        <div className="empty">
          {books.length === 0 ? (
            <>
              <p className="empty-title">Your shelf is empty</p>
              <p>Tap <strong>Scan</strong> and point your camera at a book&rsquo;s barcode.</p>
            </>
          ) : (
            <p>No books match “{query}”.</p>
          )}
        </div>
      ) : (
        <ul className="grid">
          {filtered.map((book) => (
            <li key={book.id} className="card">
              <div className="cover">
                {book.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={book.cover_url} alt={book.title} loading="lazy" />
                ) : (
                  <div className="cover-fallback">{book.title.slice(0, 1)}</div>
                )}
              </div>
              <div className="meta">
                <p className="title" title={book.title}>
                  {book.title}
                </p>
                {book.authors && <p className="authors">{book.authors}</p>}
                <p className="sub">
                  {book.published ? book.published.slice(0, 4) : ""}
                  {book.page_count ? ` · ${book.page_count} pp` : ""}
                </p>
              </div>
              <button
                className="remove"
                onClick={() => removeBook(book)}
                aria-label={`Remove ${book.title}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {scanning && (
        <Scanner onDetected={onDetected} onClose={() => setScanning(false)} />
      )}

      {busy && <div className="busy-bar" aria-hidden />}

      {toast && (
        <div className={`toast ${toast.kind}`} role="status">
          {toast.text}
        </div>
      )}
    </main>
  );
}
