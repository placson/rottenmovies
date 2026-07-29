import { NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/db";
import { verifyPassword, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email ?? "").trim();
    const password = String(body.password ?? "");

    const user = await getUserByEmail(email);
    // Verify even when the user is missing to avoid leaking which emails exist.
    const ok =
      user && (await verifyPassword(password, user.password_hash));
    if (!user || !ok) {
      return NextResponse.json(
        { error: "Incorrect email or password." },
        { status: 401 }
      );
    }

    await setSessionCookie(user.id);
    return NextResponse.json({ user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error("POST /api/auth/login failed", err);
    return NextResponse.json({ error: "Could not sign in." }, { status: 500 });
  }
}
