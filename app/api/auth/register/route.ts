import { NextResponse } from "next/server";
import {
  countUsers,
  createUser,
  getUserByEmail,
  adoptOrphanData,
} from "@/lib/db";
import { hashPassword, newUserId, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email ?? "").trim();
    const password = String(body.password ?? "");

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }
    if (await getUserByEmail(email)) {
      return NextResponse.json(
        { error: "An account with that email already exists." },
        { status: 409 }
      );
    }

    const isFirstUser = (await countUsers()) === 0;
    const id = newUserId();
    const user = await createUser(id, email, await hashPassword(password));

    // Give the pre-accounts library to the very first user who signs up.
    if (isFirstUser) await adoptOrphanData(user.id);

    await setSessionCookie(user.id);
    return NextResponse.json(
      { user: { id: user.id, email: user.email } },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/auth/register failed", err);
    return NextResponse.json(
      { error: "Could not create your account." },
      { status: 500 }
    );
  }
}
