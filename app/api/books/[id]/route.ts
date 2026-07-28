import { NextResponse } from "next/server";
import { deleteBook } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const removed = await deleteBook(id);
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
