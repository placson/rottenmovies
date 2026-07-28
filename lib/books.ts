import type { NewBook } from "./db";

export type BookData = Omit<NewBook, never>;

/**
 * Turn whatever the scanner or user gives us into a clean ISBN.
 *
 * Book barcodes are EAN-13 (starting 978/979). Scanners often also pick up the
 * small 5- or 2-digit price/edition supplement printed next to the barcode, so
 * a scan can come back as e.g. "978030738713451600". A US book may also carry a
 * 12-digit UPC-A. This strips separators and reduces those cases to the core
 * ISBN-13 whenever we can recognize it.
 */
export function normalizeIsbn(raw: string): string {
  const digits = raw.replace(/[^0-9Xx]/g, "").toUpperCase();

  // EAN-13 (+ supplement): keep the 13-digit ISBN core.
  if (
    digits.length > 13 &&
    (digits.startsWith("978") || digits.startsWith("979"))
  ) {
    return digits.slice(0, 13);
  }

  // Some scanners return the ISBN-13 embedded after other digits.
  if (digits.length > 13) {
    const match = digits.match(/(97[89]\d{10})/);
    if (match) return match[1];
  }

  return digits;
}

/** Basic length check for ISBN-10 / ISBN-13. */
export function isValidIsbn(isbn: string): boolean {
  const clean = normalizeIsbn(isbn);
  return clean.length === 10 || clean.length === 13;
}

/**
 * Look up book metadata for an ISBN.
 * Tries Open Library first (no API key), then falls back to Google Books.
 */
export async function lookupIsbn(rawIsbn: string): Promise<BookData | null> {
  const isbn = normalizeIsbn(rawIsbn);
  if (!isValidIsbn(isbn)) return null;
  return (await fromOpenLibrary(isbn)) ?? (await fromGoogleBooks(isbn));
}

async function fromOpenLibrary(isbn: string): Promise<BookData | null> {
  try {
    const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, any>;
    const entry = data[`ISBN:${isbn}`];
    if (!entry || !entry.title) return null;

    const authors = Array.isArray(entry.authors)
      ? entry.authors.map((a: any) => a.name).filter(Boolean).join(", ")
      : "";
    const cover =
      entry.cover?.large || entry.cover?.medium || entry.cover?.small || null;
    const publisher = Array.isArray(entry.publishers)
      ? entry.publishers.map((p: any) => p.name).filter(Boolean).join(", ")
      : null;

    return {
      isbn,
      title: String(entry.title),
      authors,
      cover_url: cover,
      published: entry.publish_date ? String(entry.publish_date) : null,
      publisher: publisher || null,
      page_count:
        typeof entry.number_of_pages === "number"
          ? entry.number_of_pages
          : null,
    };
  } catch {
    return null;
  }
}

async function fromGoogleBooks(isbn: string): Promise<BookData | null> {
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    const info = data?.items?.[0]?.volumeInfo;
    if (!info || !info.title) return null;

    let cover: string | null =
      info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || null;
    // Google returns http thumbnails; upgrade to https so they load on the PWA.
    if (cover) cover = cover.replace(/^http:\/\//, "https://");

    return {
      isbn,
      title: String(info.title) + (info.subtitle ? `: ${info.subtitle}` : ""),
      authors: Array.isArray(info.authors) ? info.authors.join(", ") : "",
      cover_url: cover,
      published: info.publishedDate ? String(info.publishedDate) : null,
      publisher: info.publisher ? String(info.publisher) : null,
      page_count: typeof info.pageCount === "number" ? info.pageCount : null,
    };
  } catch {
    return null;
  }
}
