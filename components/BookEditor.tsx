"use client";

import { useMemo, useState } from "react";
import type { Book } from "@/lib/db";
import { CATEGORIES } from "@/lib/categories";

type Props = {
  book: Book;
  onSaved: (book: Book) => void;
  onDeleted: (id: string) => void;
  onClose: () => void;
  /** The current taxonomy. Falls back to the built-in list. */
  categories?: string[];
  /** Create a new category; resolves with the created name. */
  onCreateCategory?: (name: string) => Promise<string | null>;
};

function StarPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="stars" role="group" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`star ${value && n <= value ? "on" : ""}`}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          onClick={() => onChange(value === n ? null : n)}
        >
          ★
        </button>
      ))}
      {value ? (
        <button
          type="button"
          className="star-clear"
          onClick={() => onChange(null)}
        >
          clear
        </button>
      ) : (
        <span className="star-hint">Not rated</span>
      )}
    </div>
  );
}

function goodreadsReviewsUrl(book: Book): string {
  const params = new URLSearchParams({
    isbn: book.isbn,
    links: "ff6b4a",
    review_back: "ffffff",
    stars: "ffb648",
    text: "111827",
    hide_last_page: "true",
    header_text: `Goodreads reviews for ${book.title}`,
  });
  return `https://www.goodreads.com/api/reviews_widget_iframe?${params.toString()}`;
}

export default function BookEditor({
  book,
  onSaved,
  onDeleted,
  onClose,
  categories: taxonomy = CATEGORIES,
  onCreateCategory,
}: Props) {
  const [selected, setSelected] = useState<string[]>(book.categories ?? []);
  const [extraCats, setExtraCats] = useState<string[]>([]);
  const [newCat, setNewCat] = useState("");
  const [creating, setCreating] = useState(false);
  const [rating, setRating] = useState<number | null>(book.rating);
  const [dateStarted, setDateStarted] = useState(book.date_started ?? "");
  const [dateFinished, setDateFinished] = useState(book.date_finished ?? "");
  const [goodreadsUrl, setGoodreadsUrl] = useState(book.goodreads_url ?? "");
  const [goodreadsRating, setGoodreadsRating] = useState(
    book.goodreads_rating != null ? String(book.goodreads_rating) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reviewsUrl = useMemo(() => goodreadsReviewsUrl(book), [book]);

  // All chips to show: the taxonomy + this book's existing tags + any just-added.
  const allCategories = [
    ...new Set([...taxonomy, ...book.categories, ...extraCats]),
  ];

  const toggleCategory = (cat: string) =>
    setSelected((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );

  const addNewCategory = async () => {
    const name = newCat.trim();
    if (!name || creating) return;
    if (allCategories.some((c) => c.toLowerCase() === name.toLowerCase())) {
      // Already exists — just select it.
      setSelected((prev) =>
        prev.some((c) => c.toLowerCase() === name.toLowerCase())
          ? prev
          : [...prev, name]
      );
      setNewCat("");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const created = onCreateCategory ? await onCreateCategory(name) : name;
      const finalName = created ?? name;
      setExtraCats((p) => [...p, finalName]);
      setSelected((p) => [...p, finalName]);
      setNewCat("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add category.");
    } finally {
      setCreating(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/books/${book.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categories: selected,
          rating,
          date_started: dateStarted || null,
          date_finished: dateFinished || null,
          goodreads_url: goodreadsUrl.trim() || null,
          goodreads_rating: goodreadsRating.trim() === "" ? null : goodreadsRating,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save.");
        return;
      }
      onSaved(data.book);
    } catch {
      setError("Network error while saving.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Remove “${book.title}” from your library?`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/books/${book.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      onDeleted(book.id);
    } catch {
      setError("Could not remove that book.");
      setSaving(false);
    }
  };

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-label={`Edit ${book.title}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div className="modal-cover">
            {book.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={book.cover_url} alt="" />
            ) : (
              <div className="cover-fallback">{book.title.slice(0, 1)}</div>
            )}
          </div>
          <div className="modal-title">
            <h2>{book.title}</h2>
            {book.authors && <p className="authors">{book.authors}</p>}
            <p className="sub">
              {book.published ? book.published.slice(0, 4) : ""}
              {book.page_count ? ` · ${book.page_count} pp` : ""}
              {` · ISBN ${book.isbn}`}
            </p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <section>
            <label className="field-label">My rating</label>
            <StarPicker value={rating} onChange={setRating} />
          </section>

          <section className="dates-row">
            <div>
              <label className="field-label" htmlFor="started">
                Started reading
              </label>
              <input
                id="started"
                type="date"
                value={dateStarted}
                onChange={(e) => setDateStarted(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="finished">
                Finished reading
              </label>
              <input
                id="finished"
                type="date"
                value={dateFinished}
                onChange={(e) => setDateFinished(e.target.value)}
              />
            </div>
          </section>

          <section>
            <label className="field-label">Goodreads</label>
            <div className="gr-row">
              <input
                type="url"
                inputMode="url"
                placeholder="https://www.goodreads.com/…"
                value={goodreadsUrl}
                onChange={(e) => setGoodreadsUrl(e.target.value)}
              />
              <input
                className="gr-rating"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                max="5"
                placeholder="4.23"
                value={goodreadsRating}
                onChange={(e) => setGoodreadsRating(e.target.value)}
                aria-label="Goodreads rating"
              />
            </div>
            {goodreadsUrl.trim() && (
              <a
                className="gr-link"
                href={goodreadsUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open on Goodreads ↗
              </a>
            )}
            <div className="gr-reviews">
              <div className="gr-reviews-frame-wrap">
                <iframe
                  className="gr-reviews-frame"
                  title={`Goodreads reviews for ${book.title}`}
                  src={reviewsUrl}
                  loading="lazy"
                />
              </div>
              <p className="gr-note">
                Reviews load from Goodreads. Open the Goodreads link for full
                reviews or if the widget is unavailable.
              </p>
            </div>
          </section>

          <section>
            <label className="field-label">
              Categories{" "}
              {selected.length > 0 && (
                <span className="muted">({selected.length} selected)</span>
              )}
            </label>
            <div className="cat-picker">
              {allCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`cat-chip ${selected.includes(cat) ? "on" : ""}`}
                  onClick={() => toggleCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="cat-new">
              <input
                type="text"
                placeholder="New category…"
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addNewCategory();
                  }
                }}
              />
              <button
                type="button"
                onClick={addNewCategory}
                disabled={!newCat.trim() || creating}
              >
                {creating ? "Adding…" : "+ Add"}
              </button>
            </div>
          </section>

          {error && <p className="modal-error">{error}</p>}
        </div>

        <div className="modal-actions">
          <button className="btn-danger" onClick={remove} disabled={saving}>
            Remove
          </button>
          <div className="spacer" />
          <button className="btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
