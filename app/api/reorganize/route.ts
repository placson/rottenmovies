import { NextResponse } from "next/server";
import { getBooks, updateBook } from "@/lib/db";
import { lookupIsbn } from "@/lib/books";
import { guessCategories } from "@/lib/categories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Re-looking up many books can take a while; allow a longer budget.
export const maxDuration = 60;

/**
 * Auto-categorize every book that has no categories yet.
 * Re-fetches metadata by ISBN (for the richer subject tags) and runs the
 * classifier. Books that already have categories are left untouched so we
 * never overwrite a manual choice.
 */
export async function POST() {
  try {
    const books = await getBooks();
    const targets = books.filter((b) => b.categories.length === 0);

    let updated = 0;
    let cursor = 0;
    const CONCURRENCY = 6;

    async function worker() {
      while (cursor < targets.length) {
        const book = targets[cursor++];
        try {
          const data = await lookupIsbn(book.isbn);
          const guessed = guessCategories({
            title: data?.title ?? book.title,
            authors: data?.authors ?? book.authors,
            subjects: data?.subjects,
            description: data?.description,
          });
          if (guessed.length) {
            await updateBook(book.id, { categories: guessed.slice(0, 1) });
            updated++;
          }
        } catch {
          /* skip this one, keep going */
        }
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, targets.length) }, worker)
    );

    return NextResponse.json({ scanned: targets.length, updated });
  } catch (err) {
    console.error("POST /api/reorganize failed", err);
    return NextResponse.json({ error: "Reorganize failed." }, { status: 500 });
  }
}
