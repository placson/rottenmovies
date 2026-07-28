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

function normalizeStored(b: Record<string, any>): Book {
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
    added_at: b.added_at ?? new Date().toISOString(),
  };
}

async function readFileStore(): Promise<Book[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return (JSON.parse(raw) as Record<string, any>[]).map(normalizeStored);
  } catch {
    return [];
  }
}

async function writeFileStore(books: Book[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(books, null, 2), "utf8");
}

/* ------------------------------------------------------------------ *
 * Public API                                                          *
 * ------------------------------------------------------------------ */

export async function getBooks(): Promise<Book[]> {
  if (usePostgres) {
    const sql = await getSql();
    const rows = await sql`SELECT * FROM books ORDER BY added_at DESC`;
    return rows.map(rowToBook);
  }
  const books = await readFileStore();
  return books.sort((a, b) => b.added_at.localeCompare(a.added_at));
}

export async function getBookByIsbn(isbn: string): Promise<Book | null> {
  if (usePostgres) {
    const sql = await getSql();
    const rows = await sql`SELECT * FROM books WHERE isbn = ${isbn} LIMIT 1`;
    return rows.length ? rowToBook(rows[0]) : null;
  }
  const books = await readFileStore();
  return books.find((b) => b.isbn === isbn) ?? null;
}

export async function getBookById(id: string): Promise<Book | null> {
  if (usePostgres) {
    const sql = await getSql();
    const rows = await sql`SELECT * FROM books WHERE id = ${id} LIMIT 1`;
    return rows.length ? rowToBook(rows[0]) : null;
  }
  const books = await readFileStore();
  return books.find((b) => b.id === id) ?? null;
}

export async function addBook(
  data: NewBook
): Promise<{ book: Book; created: boolean }> {
  // De-duplicate by ISBN: if we already have it, return the existing record.
  const existing = await getBookByIsbn(data.isbn);
  if (existing) return { book: existing, created: false };

  const book: Book = {
    id: randomUUID(),
    added_at: new Date().toISOString(),
    date_started: null,
    date_finished: null,
    rating: null,
    goodreads_rating: null,
    ...data,
  };

  if (usePostgres) {
    const sql = await getSql();
    await sql`
      INSERT INTO books (id, isbn, title, authors, cover_url, published, publisher,
                         page_count, categories, goodreads_url, added_at)
      VALUES (${book.id}, ${book.isbn}, ${book.title}, ${book.authors},
              ${book.cover_url}, ${book.published}, ${book.publisher},
              ${book.page_count}, ${JSON.stringify(book.categories)},
              ${book.goodreads_url}, ${book.added_at})
    `;
  } else {
    const books = await readFileStore();
    books.push(book);
    await writeFileStore(books);
  }
  return { book, created: true };
}

export async function updateBook(
  id: string,
  patch: BookUpdate
): Promise<Book | null> {
  const current = await getBookById(id);
  if (!current) return null;

  const merged: Book = {
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
  };

  if (usePostgres) {
    const sql = await getSql();
    await sql`
      UPDATE books SET
        categories       = ${JSON.stringify(merged.categories)},
        date_started     = ${merged.date_started},
        date_finished    = ${merged.date_finished},
        rating           = ${merged.rating},
        goodreads_url    = ${merged.goodreads_url},
        goodreads_rating = ${merged.goodreads_rating}
      WHERE id = ${id}
    `;
  } else {
    const books = await readFileStore();
    const idx = books.findIndex((b) => b.id === id);
    if (idx === -1) return null;
    books[idx] = merged;
    await writeFileStore(books);
  }
  return merged;
}

export async function deleteBook(id: string): Promise<boolean> {
  if (usePostgres) {
    const sql = await getSql();
    const rows = await sql`DELETE FROM books WHERE id = ${id} RETURNING id`;
    return rows.length > 0;
  }
  const books = await readFileStore();
  const next = books.filter((b) => b.id !== id);
  if (next.length === books.length) return false;
  await writeFileStore(next);
  return true;
}

export const storageBackend = usePostgres ? "postgres" : "file";
