import { NextResponse } from "next/server";
import { getTaxonomy, saveTaxonomy } from "@/lib/taxonomy";
import { replaceCategoryInBooks } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const clean = (v: unknown) => String(v ?? "").trim();
const eqCI = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const unauthorized = () =>
  NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();
  try {
    return NextResponse.json({ categories: await getTaxonomy(userId) });
  } catch (err) {
    console.error("GET /api/categories failed", err);
    return NextResponse.json(
      { error: "Could not load categories." },
      { status: 500 }
    );
  }
}

// Create
export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();
  try {
    const body = await request.json().catch(() => ({}));
    const name = clean(body.name);
    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    const list = await getTaxonomy(userId);
    if (list.some((c) => eqCI(c, name))) {
      return NextResponse.json(
        { error: `“${name}” already exists.` },
        { status: 409 }
      );
    }
    const next = [...list, name];
    await saveTaxonomy(userId, next);
    return NextResponse.json({ categories: next }, { status: 201 });
  } catch (err) {
    console.error("POST /api/categories failed", err);
    return NextResponse.json({ error: "Could not create." }, { status: 500 });
  }
}

// Rename (and merge every book using the old name to the new one)
export async function PATCH(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();
  try {
    const body = await request.json().catch(() => ({}));
    const from = clean(body.from);
    const to = clean(body.to);
    if (!from || !to) {
      return NextResponse.json(
        { error: "Both current and new names are required." },
        { status: 400 }
      );
    }
    const list = await getTaxonomy(userId);
    if (!list.some((c) => eqCI(c, from))) {
      return NextResponse.json(
        { error: `“${from}” doesn't exist.` },
        { status: 404 }
      );
    }
    const mergingIntoExisting =
      !eqCI(from, to) && list.some((c) => eqCI(c, to));
    const next = mergingIntoExisting
      ? list.filter((c) => !eqCI(c, from))
      : list.map((c) => (eqCI(c, from) ? to : c));
    await saveTaxonomy(userId, next);
    const changed = await replaceCategoryInBooks(userId, from, to);
    return NextResponse.json({ categories: next, changed });
  } catch (err) {
    console.error("PATCH /api/categories failed", err);
    return NextResponse.json({ error: "Could not rename." }, { status: 500 });
  }
}

// Delete (optionally reassigning books to another category)
export async function DELETE(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();
  try {
    const body = await request.json().catch(() => ({}));
    const name = clean(body.name);
    const reassignTo = clean(body.reassignTo) || null;
    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    const list = await getTaxonomy(userId);
    if (!list.some((c) => eqCI(c, name))) {
      return NextResponse.json(
        { error: `“${name}” doesn't exist.` },
        { status: 404 }
      );
    }
    if (reassignTo && !list.some((c) => eqCI(c, reassignTo))) {
      return NextResponse.json(
        { error: `Reassign target “${reassignTo}” doesn't exist.` },
        { status: 400 }
      );
    }
    const next = list.filter((c) => !eqCI(c, name));
    await saveTaxonomy(userId, next);
    const changed = await replaceCategoryInBooks(userId, name, reassignTo);
    return NextResponse.json({ categories: next, changed });
  } catch (err) {
    console.error("DELETE /api/categories failed", err);
    return NextResponse.json({ error: "Could not delete." }, { status: 500 });
  }
}
