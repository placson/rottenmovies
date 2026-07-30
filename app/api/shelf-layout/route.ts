import { NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { normalizeManualLayout } from "@/lib/shelfLayout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const keyFor = (userId: string) => `shelf-layout:${userId}`;
const unauthorized = () =>
  NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  try {
    const raw = await getSetting(keyFor(userId));
    if (!raw) return NextResponse.json({ manual: null, hasSavedLayout: false });
    const manual = normalizeManualLayout(JSON.parse(raw));
    return NextResponse.json({ manual, hasSavedLayout: true });
  } catch (err) {
    console.error("GET /api/shelf-layout failed", err);
    return NextResponse.json(
      { error: "Could not load shelf layout." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  try {
    const body = await request.json().catch(() => null);
    const manual = normalizeManualLayout(body?.manual);
    if (body?.manual != null && manual == null) {
      return NextResponse.json(
        { error: "Invalid shelf layout." },
        { status: 400 }
      );
    }
    await setSetting(keyFor(userId), JSON.stringify(manual));
    return NextResponse.json({ manual, hasSavedLayout: true });
  } catch (err) {
    console.error("PUT /api/shelf-layout failed", err);
    return NextResponse.json(
      { error: "Could not save shelf layout." },
      { status: 500 }
    );
  }
}
