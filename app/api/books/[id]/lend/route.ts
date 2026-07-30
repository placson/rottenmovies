import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getBookById, updateBook } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { sendLoanEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOAN_DAYS = 30;

const unauthorized = () =>
  NextResponse.json({ error: "Unauthorized" }, { status: 401 });

function ownerName(user: Awaited<ReturnType<typeof currentUser>>): string {
  if (!user) return "A friend";
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return (
    full ||
    user.username ||
    user.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "A friend"
  );
}

// Lend the book: record borrower + dates and email a friendly reminder.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();
  const { id } = await params;

  const body = await request.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim();

  if (!name) {
    return NextResponse.json(
      { error: "Who are you lending it to? A name helps." },
      { status: 400 }
    );
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 }
    );
  }

  try {
    const existing = await getBookById(userId, id);
    if (!existing) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const lentAt = new Date();
    const dueAt = new Date(lentAt.getTime() + LOAN_DAYS * 86400000);

    const book = await updateBook(userId, id, {
      lent_to_name: name,
      lent_to_email: email,
      lent_at: lentAt.toISOString(),
      due_at: dueAt.toISOString(),
    });
    if (!book) return NextResponse.json({ error: "Not found." }, { status: 404 });

    const user = await currentUser();
    const emailResult = await sendLoanEmail({
      toEmail: email,
      borrowerName: name,
      ownerName: ownerName(user),
      book,
      dueDate: dueAt.toISOString(),
    });

    return NextResponse.json({ book, email: emailResult });
  } catch (err) {
    console.error("POST /api/books/[id]/lend failed", err);
    return NextResponse.json(
      { error: "Could not lend that book." },
      { status: 500 }
    );
  }
}

// Mark the book returned: clear the loan.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();
  const { id } = await params;
  try {
    const book = await updateBook(userId, id, {
      lent_to_name: null,
      lent_to_email: null,
      lent_at: null,
      due_at: null,
    });
    if (!book) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ book });
  } catch (err) {
    console.error("DELETE /api/books/[id]/lend failed", err);
    return NextResponse.json(
      { error: "Could not update that book." },
      { status: 500 }
    );
  }
}
