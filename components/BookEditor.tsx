"use client";

import { useState } from "react";
import type { Book } from "@/lib/db";
import { CATEGORIES } from "@/lib/categories";

type Props = {
  book: Book;
  onSaved: (book: Book) => void;
  onDeleted: (id: string) => void;
  onClose: () => void;
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

export default function BookEditor({
  book,
  onSaved,
  onDeleted,
  onClose,
}: Props) {
  const [categories, setCategories] = useState<string[]>(book.categories ?? []);
  const [rating, setRating] = useState<number | null>(book.rating);
  const [dateStarted, setDateStarted] = useState(book.date_started ?? "");
  const [dateFinished, setDateFinished] = useState(book.date_finished ?? "");
  const [goodreadsUrl, setGoodreadsUrl] = useState(book.goodreads_url ?? "");
  const [goodreadsRating, setGoodreadsRating] = useState(
    book.goodreads_rating != null ? String(book.goodreads_rating) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleCategory = (cat: string) =>
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/books/${book.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categories,
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
          </section>

          <section>
            <label className="field-label">
              Categories{" "}
              {categories.length > 0 && (
                <span className="muted">({categories.length} selected)</span>
              )}
            </label>
            <div className="cat-picker">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`cat-chip ${
                    categories.includes(cat) ? "on" : ""
                  }`}
                  onClick={() => toggleCategory(cat)}
                >
                  {cat}
                </button>
              ))}
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
