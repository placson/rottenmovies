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
  added_at: string;
};

export type NewBook = Omit<Book, "id" | "added_at">;

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
    tableReady = true;
  }
  return sql;
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

async function readFileStore(): Promise<Book[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(raw) as Book[];
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

export async function addBook(
  data: NewBook
): Promise<{ book: Book; created: boolean }> {
  // De-duplicate by ISBN: if we already have it, return the existing record.
  const existing = await getBookByIsbn(data.isbn);
  if (existing) return { book: existing, created: false };

  const book: Book = {
    id: randomUUID(),
    added_at: new Date().toISOString(),
    ...data,
  };

  if (usePostgres) {
    const sql = await getSql();
    await sql`
      INSERT INTO books (id, isbn, title, authors, cover_url, published, publisher, page_count, added_at)
      VALUES (${book.id}, ${book.isbn}, ${book.title}, ${book.authors},
              ${book.cover_url}, ${book.published}, ${book.publisher},
              ${book.page_count}, ${book.added_at})
    `;
  } else {
    const books = await readFileStore();
    books.push(book);
    await writeFileStore(books);
  }
  return { book, created: true };
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
