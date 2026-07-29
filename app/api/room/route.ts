import { NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db";
import { DEFAULT_ROOM, type Room } from "@/lib/room";
import { getSessionUserId } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const keyFor = (userId: string) => `room:${userId}`;
const unauthorized = () =>
  NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();
  try {
    const raw = await getSetting(keyFor(userId));
    if (!raw) return NextResponse.json({ room: null });
    return NextResponse.json({ room: JSON.parse(raw) as Room });
  } catch (err) {
    console.error("GET /api/room failed", err);
    return NextResponse.json({ error: "Could not load room." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();
  try {
    const body = await request.json().catch(() => null);
    const room = body?.room as Room | undefined;
    if (!room || typeof room !== "object" || !Array.isArray(room.furniture)) {
      return NextResponse.json({ error: "Invalid room." }, { status: 400 });
    }
    // Keep it sane: coerce basic shape, fall back to defaults for room size.
    const safe: Room = {
      unit: room.unit === "cm" ? "cm" : "in",
      width: Number(room.width) || DEFAULT_ROOM.width,
      length: Number(room.length) || DEFAULT_ROOM.length,
      furniture: room.furniture,
    };
    await setSetting(keyFor(userId), JSON.stringify(safe));
    return NextResponse.json({ room: safe });
  } catch (err) {
    console.error("PUT /api/room failed", err);
    return NextResponse.json({ error: "Could not save room." }, { status: 500 });
  }
}
