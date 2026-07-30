export type ManualShelfLayout = string[][];

const MAX_SHELVES = 500;
const MAX_BOOKS_PER_SHELF = 1000;
const MAX_BOOK_ID_LENGTH = 200;

/**
 * Manual shelf layouts are stored as rows of book ids. Keep this intentionally
 * narrow so account settings cannot grow into arbitrary large blobs.
 */
export function normalizeManualLayout(
  value: unknown
): ManualShelfLayout | null {
  if (value == null) return null;
  if (!Array.isArray(value) || value.length > MAX_SHELVES) return null;

  const rows: ManualShelfLayout = [];
  for (const row of value) {
    if (!Array.isArray(row) || row.length > MAX_BOOKS_PER_SHELF) return null;
    const ids: string[] = [];
    for (const id of row) {
      if (typeof id !== "string") return null;
      const clean = id.trim();
      if (!clean || clean.length > MAX_BOOK_ID_LENGTH) return null;
      ids.push(clean);
    }
    rows.push(ids);
  }

  while (rows.length > 1 && rows[rows.length - 1].length === 0) rows.pop();
  return rows;
}
