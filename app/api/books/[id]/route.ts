import { NextResponse } from "next/server";
import { deleteBook, updateBook, type BookUpdate } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const unauthorized = () =>
  NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();
  const { id } = await params;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const patch: BookUpdate = {};

  if (Array.isArray(body.categories)) {
    patch.categories = body.categories.filter(
      (c: unknown) => typeof c === "string"
    );
  }
  if ("date_started" in body) {
    patch.date_started = body.date_started ? String(body.date_started) : null;
  }
  if ("date_finished" in body) {
    patch.date_finished = body.date_finished
      ? String(body.date_finished)
      : null;
  }
  if ("rating" in body) {
    const r = Number(body.rating);
    patch.rating =
      !body.rating || Number.isNaN(r)
        ? null
        : Math.max(1, Math.min(5, Math.round(r)));
  }
  if ("goodreads_url" in body) {
    patch.goodreads_url = body.goodreads_url
      ? String(body.goodreads_url)
      : null;
  }
  if ("goodreads_rating" in body) {
    const g = Number(body.goodreads_rating);
    patch.goodreads_rating =
      body.goodreads_rating === "" ||
      body.goodreads_rating == null ||
      Number.isNaN(g)
        ? null
        : Math.max(0, Math.min(5, g));
  }

  try {
    const book = await updateBook(userId, id, patch);
    if (!book) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ book });
  } catch (err) {
    console.error("PATCH /api/books/[id] failed", err);
    return NextResponse.json(
      { error: "Could not save changes." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();
  try {
    const { id } = await params;
    const removed = await deleteBook(userId, id);
    if (!removed) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/books/[id] failed", err);
    return NextResponse.json(
      { error: "Could not remove that book." },
      { status: 500 }
    );
  }
}
