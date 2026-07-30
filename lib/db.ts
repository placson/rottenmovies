import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

export type Book = {
  id: string;
  isbn: string;
  title: string;
  authors: string;
  cover_url: string | null;
  published: string | null;
  publisher: string | null;
  page_count: number | null;
  categories: string[];
  date_started: string | null; // "YYYY-MM-DD"
  date_finished: string | null; // "YYYY-MM-DD"
  rating: number | null; // 1..5, my rating
  goodreads_url: string | null;
  goodreads_rating: number | null; // e.g. 4.23
  lent_to_name: string | null;
  lent_to_email: string | null;
  lent_at: string | null; // ISO date the book was lent
  due_at: string | null; // ISO date it's ideally back by (lent + 30d)
  added_at: string;
};

/** Fields supplied when a book is first added (from the ISBN lookup). */
export type NewBook = {
  isbn: string;
  title: string;
  authors: string;
  cover_url: string | null;
  published: string | null;
  publisher: string | null;
  page_count: number | null;
  categories: string[];
  goodreads_url: string | null;
};

/** Fields the user can edit later. Omitted keys are left unchanged. */
export type BookUpdate = Partial<{
  categories: string[];
  date_started: string | null;
  date_finished: string | null;
  rating: number | null;
  goodreads_url: string | null;
  goodreads_rating: number | null;
  lent_to_name: string | null;
  lent_to_email: string | null;
  lent_at: string | null;
  due_at: string | null;
}>;

const CONNECTION_STRING =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  "";

const usePostgres = Boolean(CONNECTION_STRING);

/* ------------------------------------------------------------------ *
 * Postgres implementation (Neon — Vercel's native Postgres)           *
 * ------------------------------------------------------------------ */

let sqlClient: NeonQueryFunction<false, false> | null = null;
let tableReady = false;

async function getSql(): Promise<NeonQueryFunction<false, false>> {
  if (!sqlClient) sqlClient = neon(CONNECTION_STRING);
  const sql = sqlClient;
  if (!tableReady) {
    await sql`
      CREATE TABLE IF NOT EXISTS books (
        id          TEXT PRIMARY KEY,
        isbn        TEXT NOT NULL,
        title       TEXT NOT NULL,
        authors     TEXT,
        cover_url   TEXT,
        published   TEXT,
        publisher   TEXT,
        page_count  INTEGER,
        added_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    // Columns added after v1 — safe to run every cold start.
    await sql`ALTER TABLE books ADD COLUMN IF NOT EXISTS categories TEXT`;
    await sql`ALTER TABLE books ADD COLUMN IF NOT EXISTS date_started TEXT`;
    await sql`ALTER TABLE books ADD COLUMN IF NOT EXISTS date_finished TEXT`;
    await sql`ALTER TABLE books ADD COLUMN IF NOT EXISTS rating INTEGER`;
    await sql`ALTER TABLE books ADD COLUMN IF NOT EXISTS goodreads_url TEXT`;
    await sql`ALTER TABLE books ADD COLUMN IF NOT EXISTS goodreads_rating REAL`;
    await sql`ALTER TABLE books ADD COLUMN IF NOT EXISTS user_id TEXT`;
    await sql`ALTER TABLE books ADD COLUMN IF NOT EXISTS lent_to_name TEXT`;
    await sql`ALTER TABLE books ADD COLUMN IF NOT EXISTS lent_to_email TEXT`;
    await sql`ALTER TABLE books ADD COLUMN IF NOT EXISTS lent_at TEXT`;
    await sql`ALTER TABLE books ADD COLUMN IF NOT EXISTS due_at TEXT`;
    await sql`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`;
    tableReady = true;
  }
  return sql;
}

function parseCategories(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[];
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function rowToBook(row: Record<string, unknown>): Book {
  const added = row.added_at;
  return {
    id: String(row.id),
    isbn: String(row.isbn),
    title: String(row.title),
    authors: (row.authors as string) ?? "",
    cover_url: (row.cover_url as string) ?? null,
    published: (row.published as string) ?? null,
    publisher: (row.publisher as string) ?? null,
    page_count: row.page_count == null ? null : Number(row.page_count),
    categories: parseCategories(row.categories),
    date_started: (row.date_started as string) ?? null,
    date_finished: (row.date_finished as string) ?? null,
    rating: row.rating == null ? null : Number(row.rating),
    goodreads_url: (row.goodreads_url as string) ?? null,
    goodreads_rating:
      row.goodreads_rating == null ? null : Number(row.goodreads_rating),
    lent_to_name: (row.lent_to_name as string) ?? null,
    lent_to_email: (row.lent_to_email as string) ?? null,
    lent_at: (row.lent_at as string) ?? null,
    due_at: (row.due_at as string) ?? null,
    added_at:
      added instanceof Date
        ? added.toISOString()
        : String(added ?? new Date().toISOString()),
  };
}

/* ------------------------------------------------------------------ *
 * File implementation (local dev fallback when no database is set)    *
 * ------------------------------------------------------------------ */

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "books.json");

type StoredBook = Book & { user_id: string | null };

function normalizeStored(b: Record<string, any>): StoredBook {
  return {
    id: String(b.id),
    isbn: String(b.isbn),
    title: String(b.title),
    authors: b.authors ?? "",
    cover_url: b.cover_url ?? null,
    published: b.published ?? null,
    publisher: b.publisher ?? null,
    page_count: b.page_count ?? null,
    categories: Array.isArray(b.categories) ? b.categories : [],
    date_started: b.date_started ?? null,
    date_finished: b.date_finished ?? null,
    rating: b.rating ?? null,
    goodreads_url: b.goodreads_url ?? null,
    goodreads_rating: b.goodreads_rating ?? null,
    lent_to_name: b.lent_to_name ?? null,
    lent_to_email: b.lent_to_email ?? null,
    lent_at: b.lent_at ?? null,
    due_at: b.due_at ?? null,
    added_at: b.added_at ?? new Date().toISOString(),
    user_id: b.user_id ?? null,
  };
}

async function readFileStore(): Promise<StoredBook[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return (JSON.parse(raw) as Record<string, any>[]).map(normalizeStored);
  } catch {
    return [];
  }
}

async function writeFileStore(books: StoredBook[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(books, null, 2), "utf8");
}

// Serialize read-modify-write cycles so concurrent mutations (e.g. the
// reorganize endpoint) can't clobber each other's changes in the file store.
let fileLock: Promise<unknown> = Promise.resolve();
function withFileLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = fileLock.then(fn, fn);
  fileLock = run.catch(() => {});
  return run;
}

/* ------------------------------------------------------------------ *
 * Public API                                                          *
 * ------------------------------------------------------------------ */

export async function getBooks(userId: string): Promise<Book[]> {
  if (usePostgres) {
    const sql = await getSql();
    const rows = await sql`
      SELECT * FROM books WHERE user_id = ${userId} ORDER BY added_at DESC
    `;
    return rows.map(rowToBook);
  }
  const books = await readFileStore();
  return books
    .filter((b) => b.user_id === userId)
    .sort((a, b) => b.added_at.localeCompare(a.added_at));
}

export async function getBookByIsbn(
  userId: string,
  isbn: string
): Promise<Book | null> {
  if (usePostgres) {
    const sql = await getSql();
    const rows = await sql`
      SELECT * FROM books WHERE user_id = ${userId} AND isbn = ${isbn} LIMIT 1
    `;
    return rows.length ? rowToBook(rows[0]) : null;
  }
  const books = await readFileStore();
  return books.find((b) => b.user_id === userId && b.isbn === isbn) ?? null;
}

export async function getBookById(
  userId: string,
  id: string
): Promise<Book | null> {
  if (usePostgres) {
    const sql = await getSql();
    const rows = await sql`
      SELECT * FROM books WHERE user_id = ${userId} AND id = ${id} LIMIT 1
    `;
    return rows.length ? rowToBook(rows[0]) : null;
  }
  const books = await readFileStore();
  return books.find((b) => b.user_id === userId && b.id === id) ?? null;
}

function buildBook(data: NewBook, userId: string): StoredBook {
  return {
    id: randomUUID(),
    added_at: new Date().toISOString(),
    date_started: null,
    date_finished: null,
    rating: null,
    goodreads_rating: null,
    lent_to_name: null,
    lent_to_email: null,
    lent_at: null,
    due_at: null,
    user_id: userId,
    ...data,
  };
}

function mergeBook(current: Book, patch: BookUpdate): Book {
  return {
    ...current,
    categories: patch.categories ?? current.categories,
    date_started:
      patch.date_started !== undefined
        ? patch.date_started
        : current.date_started,
    date_finished:
      patch.date_finished !== undefined
        ? patch.date_finished
        : current.date_finished,
    rating: patch.rating !== undefined ? patch.rating : current.rating,
    goodreads_url:
      patch.goodreads_url !== undefined
        ? patch.goodreads_url
        : current.goodreads_url,
    goodreads_rating:
      patch.goodreads_rating !== undefined
        ? patch.goodreads_rating
        : current.goodreads_rating,
    lent_to_name:
      patch.lent_to_name !== undefined
        ? patch.lent_to_name
        : current.lent_to_name,
    lent_to_email:
      patch.lent_to_email !== undefined
        ? patch.lent_to_email
        : current.lent_to_email,
    lent_at: patch.lent_at !== undefined ? patch.lent_at : current.lent_at,
    due_at: patch.due_at !== undefined ? patch.due_at : current.due_at,
  };
}

export async function addBook(
  userId: string,
  data: NewBook
): Promise<{ book: Book; created: boolean }> {
  if (usePostgres) {
    // De-duplicate by ISBN within this user's library.
    const existing = await getBookByIsbn(userId, data.isbn);
    if (existing) return { book: existing, created: false };

    const book = buildBook(data, userId);
    const sql = await getSql();
    await sql`
      INSERT INTO books (id, isbn, title, authors, cover_url, published, publisher,
                         page_count, categories, goodreads_url, added_at, user_id)
      VALUES (${book.id}, ${book.isbn}, ${book.title}, ${book.authors},
              ${book.cover_url}, ${book.published}, ${book.publisher},
              ${book.page_count}, ${JSON.stringify(book.categories)},
              ${book.goodreads_url}, ${book.added_at}, ${userId})
    `;
    return { book, created: true };
  }

  return withFileLock(async () => {
    const books = await readFileStore();
    const existing = books.find(
      (b) => b.user_id === userId && b.isbn === data.isbn
    );
    if (existing) return { book: existing, created: false };
    const book = buildBook(data, userId);
    books.push(book);
    await writeFileStore(books);
    return { book, created: true };
  });
}

export async function updateBook(
  userId: string,
  id: string,
  patch: BookUpdate
): Promise<Book | null> {
  if (usePostgres) {
    const current = await getBookById(userId, id);
    if (!current) return null;
    const merged = mergeBook(current, patch);
    const sql = await getSql();
    await sql`
      UPDATE books SET
        categories       = ${JSON.stringify(merged.categories)},
        date_started     = ${merged.date_started},
        date_finished    = ${merged.date_finished},
        rating           = ${merged.rating},
        goodreads_url    = ${merged.goodreads_url},
        goodreads_rating = ${merged.goodreads_rating},
        lent_to_name     = ${merged.lent_to_name},
        lent_to_email    = ${merged.lent_to_email},
        lent_at          = ${merged.lent_at},
        due_at           = ${merged.due_at}
      WHERE id = ${id} AND user_id = ${userId}
    `;
    return merged;
  }

  return withFileLock(async () => {
    const books = await readFileStore();
    const idx = books.findIndex((b) => b.user_id === userId && b.id === id);
    if (idx === -1) return null;
    const merged: StoredBook = { ...mergeBook(books[idx], patch), user_id: userId };
    books[idx] = merged;
    await writeFileStore(books);
    return merged;
  });
}

export async function deleteBook(userId: string, id: string): Promise<boolean> {
  if (usePostgres) {
    const sql = await getSql();
    const rows = await sql`
      DELETE FROM books WHERE id = ${id} AND user_id = ${userId} RETURNING id
    `;
    return rows.length > 0;
  }

  return withFileLock(async () => {
    const books = await readFileStore();
    const next = books.filter((b) => !(b.user_id === userId && b.id === id));
    if (next.length === books.length) return false;
    await writeFileStore(next);
    return true;
  });
}

/* ------------------------------------------------------------------ *
 * Settings (key/value) — used for the custom category taxonomy         *
 * ------------------------------------------------------------------ */

const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

async function readSettings(): Promise<Record<string, string>> {
  try {
    const raw = await fs.readFile(SETTINGS_FILE, "utf8");
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

export async function getSetting(key: string): Promise<string | null> {
  if (usePostgres) {
    const sql = await getSql();
    const rows = await sql`SELECT value FROM settings WHERE key = ${key} LIMIT 1`;
    return rows.length ? String(rows[0].value) : null;
  }
  const settings = await readSettings();
  return settings[key] ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  if (usePostgres) {
    const sql = await getSql();
    await sql`
      INSERT INTO settings (key, value) VALUES (${key}, ${value})
      ON CONFLICT (key) DO UPDATE SET value = ${value}
    `;
    return;
  }
  await withFileLock(async () => {
    const settings = await readSettings();
    settings[key] = value;
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf8");
  });
}

/**
 * Replace a category name across every book. `to = null` removes it (the book
 * may become uncategorized); otherwise it is renamed/merged. Returns the number
 * of books changed.
 */
export async function replaceCategoryInBooks(
  userId: string,
  from: string,
  to: string | null
): Promise<number> {
  const books = await getBooks(userId);
  let changed = 0;
  for (const b of books) {
    if (!b.categories.includes(from)) continue;
    const mapped = b.categories
      .map((c) => (c === from ? to : c))
      .filter((c): c is string => Boolean(c));
    const next = [...new Set(mapped)]; // dedupe, preserve order
    await updateBook(userId, b.id, { categories: next });
    changed++;
  }
  return changed;
}

/* ------------------------------------------------------------------ *
 * Orphan-data migration (accounts are managed by Clerk)                *
 * ------------------------------------------------------------------ */

/**
 * One-time migration: claim any books/settings that predate accounts and give
 * them to `userId` (the first signed-in user), so the existing single-user
 * library isn't stranded.
 */
export async function adoptOrphanData(userId: string): Promise<number> {
  let adopted = 0;
  if (usePostgres) {
    const sql = await getSql();
    const rows = await sql`
      UPDATE books SET user_id = ${userId} WHERE user_id IS NULL RETURNING id
    `;
    adopted = rows.length;
  } else {
    await withFileLock(async () => {
      const books = await readFileStore();
      let changed = false;
      for (const b of books) {
        if (!b.user_id) {
          b.user_id = userId;
          adopted++;
          changed = true;
        }
      }
      if (changed) await writeFileStore(books);
    });
  }
  // Migrate legacy (unscoped) taxonomy/room settings to this user's keys.
  for (const legacy of ["taxonomy", "room"]) {
    const value = await getSetting(legacy);
    if (value) {
      await setSetting(`${legacy}:${userId}`, value);
    }
  }
  return adopted;
}

/**
 * The first signed-in user (under any auth system) claims books/settings that
 * predate accounts. Guarded by a settings flag so it runs exactly once.
 */
export async function migrateOrphansOnce(userId: string): Promise<void> {
  const flag = await getSetting("orphans_migrated");
  if (flag) return;
  await setSetting("orphans_migrated", userId);
  await adoptOrphanData(userId);
}

export const storageBackend = usePostgres ? "postgres" : "file";
