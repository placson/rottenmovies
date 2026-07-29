import { NextResponse } from "next/server";
import { addBook, getBooks } from "@/lib/db";
import { lookupIsbn, normalizeIsbn, isValidIsbn } from "@/lib/books";
import { guessCategories } from "@/lib/categories";
import { getTaxonomy } from "@/lib/taxonomy";
import { getSessionUserId } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const unauthorized = () =>
  NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();
  try {
    const books = await getBooks(userId);
    return NextResponse.json({ books });
  } catch (err) {
    console.error("GET /api/books failed", err);
    return NextResponse.json(
      { error: "Could not load library." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const raw = String(body?.isbn ?? "");
  const isbn = normalizeIsbn(raw);
  if (!isValidIsbn(isbn)) {
    return NextResponse.json(
      { error: `That doesn't look like a valid ISBN (read: “${raw}”).` },
      { status: 400 }
    );
  }

  try {
    const data = await lookupIsbn(isbn);
    if (!data) {
      return NextResponse.json(
        { error: `No book found for ISBN ${isbn}.` },
        { status: 404 }
      );
    }

    // Best-guess a single category; the user can refine in the editor.
    // Only assign guesses that still exist in the (possibly customized) taxonomy.
    const taxonomy = await getTaxonomy(userId);
    const guessed = guessCategories({
      title: data.title,
      authors: data.authors,
      subjects: data.subjects,
      description: data.description,
    }).filter((c) => taxonomy.includes(c));

    const { book, created } = await addBook(userId, {
      isbn: data.isbn,
      title: data.title,
      authors: data.authors,
      cover_url: data.cover_url,
      published: data.published,
      publisher: data.publisher,
      page_count: data.page_count,
      categories: guessed.slice(0, 1),
      goodreads_url: `https://www.goodreads.com/search?q=${data.isbn}`,
    });
    return NextResponse.json({ book, created }, { status: created ? 201 : 200 });
  } catch (err) {
    console.error("POST /api/books failed", err);
    return NextResponse.json(
      { error: "Something went wrong adding that book." },
      { status: 500 }
    );
  }
}
