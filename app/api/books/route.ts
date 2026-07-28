import { NextResponse } from "next/server";
import { addBook, getBooks } from "@/lib/db";
import { lookupIsbn, normalizeIsbn, isValidIsbn } from "@/lib/books";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const books = await getBooks();
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
    const { book, created } = await addBook(data);
    return NextResponse.json({ book, created }, { status: created ? 201 : 200 });
  } catch (err) {
    console.error("POST /api/books failed", err);
    return NextResponse.json(
      { error: "Something went wrong adding that book." },
      { status: 500 }
    );
  }
}
