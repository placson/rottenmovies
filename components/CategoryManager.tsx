"use client";

import { useState } from "react";
import type { Book } from "@/lib/db";
import {
  createCategory,
  renameCategory,
  deleteCategory,
} from "@/lib/categoryClient";

type Props = {
  categories: string[];
  books: Book[];
  onChanged: () => void; // parent reloads books + categories
  onClose: () => void;
};

export default function CategoryManager({
  categories,
  books,
  onChanged,
  onClose,
}: Props) {
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [reassign, setReassign] = useState<string>("");

  const countFor = (cat: string) =>
    books.filter((b) => b.categories.includes(cat)).length;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const add = () => {
    const name = newName.trim();
    if (!name) return;
    run(async () => {
      await createCategory(name);
      setNewName("");
    });
  };

  const saveRename = (from: string) => {
    const to = editValue.trim();
    if (!to || to === from) {
      setEditing(null);
      return;
    }
    run(async () => {
      await renameCategory(from, to);
      setEditing(null);
    });
  };

  const confirmDelete = (name: string) => {
    run(async () => {
      await deleteCategory(name, reassign || null);
      setDeleting(null);
      setReassign("");
    });
  };

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div
        className="modal cat-manager"
        role="dialog"
        aria-label="Manage categories"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div className="modal-title">
            <h2>Manage categories</h2>
            <p className="sub">
              Rename, delete, or add categories. Changes apply to every book.
            </p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            x
          </button>
        </div>

        <div className="modal-body">
          <div className="cat-new">
            <input
              type="text"
              placeholder="Add a category..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
            />
            <button onClick={add} disabled={busy || !newName.trim()}>
              + Add
            </button>
          </div>

          {error && <p className="modal-error">{error}</p>}

          <ul className="cat-list">
            {categories.map((cat) => {
              const n = countFor(cat);
              const others = categories.filter((c) => c !== cat);
              return (
                <li key={cat} className="cat-list-item">
                  {editing === cat ? (
                    <div className="cat-edit-row">
                      <input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveRename(cat);
                          if (e.key === "Escape") setEditing(null);
                        }}
                      />
                      <button
                        className="btn-primary sm"
                        onClick={() => saveRename(cat)}
                        disabled={busy}
                      >
                        Save
                      </button>
                      <button
                        className="btn-ghost sm"
                        onClick={() => setEditing(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : deleting === cat ? (
                    <div className="cat-delete-row">
                      <span className="cat-del-msg">
                        Delete <strong>{cat}</strong>
                        {n > 0 ? ` and move ${n} book${n === 1 ? "" : "s"} to:` : "?"}
                      </span>
                      {n > 0 && (
                        <select
                          value={reassign}
                          onChange={(e) => setReassign(e.target.value)}
                        >
                          <option value="">Uncategorized</option>
                          {others.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      )}
                      <button
                        className="btn-danger sm"
                        onClick={() => confirmDelete(cat)}
                        disabled={busy}
                      >
                        Delete
                      </button>
                      <button
                        className="btn-ghost sm"
                        onClick={() => {
                          setDeleting(null);
                          setReassign("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="cat-view-row">
                      <span className="cat-name">{cat}</span>
                      <span className="cat-count">
                        {n} book{n === 1 ? "" : "s"}
                      </span>
                      <button
                        className="cat-action"
                        onClick={() => {
                          setEditing(cat);
                          setEditValue(cat);
                        }}
                      >
                        Rename
                      </button>
                      <button
                        className="cat-action danger"
                        onClick={() => {
                          setDeleting(cat);
                          setReassign("");
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="modal-actions">
          <div className="spacer" />
          <button className="btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
