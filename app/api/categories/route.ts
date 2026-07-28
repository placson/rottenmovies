import { NextResponse } from "next/server";
import { getTaxonomy, saveTaxonomy } from "@/lib/taxonomy";
import { replaceCategoryInBooks } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const clean = (v: unknown) => String(v ?? "").trim();
const eqCI = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export async function GET() {
  try {
    return NextResponse.json({ categories: await getTaxonomy() });
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
  try {
    const body = await request.json().catch(() => ({}));
    const name = clean(body.name);
    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    const list = await getTaxonomy();
    if (list.some((c) => eqCI(c, name))) {
      return NextResponse.json(
        { error: `“${name}” already exists.` },
        { status: 409 }
      );
    }
    const next = [...list, name];
    await saveTaxonomy(next);
    return NextResponse.json({ categories: next }, { status: 201 });
  } catch (err) {
    console.error("POST /api/categories failed", err);
    return NextResponse.json({ error: "Could not create." }, { status: 500 });
  }
}

// Rename (and merge every book using the old name to the new one)
export async function PATCH(request: Request) {
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
    const list = await getTaxonomy();
    if (!list.some((c) => eqCI(c, from))) {
      return NextResponse.json(
        { error: `“${from}” doesn't exist.` },
        { status: 404 }
      );
    }
    if (eqCI(from, to)) {
      // Only a case change.
      const next = list.map((c) => (eqCI(c, from) ? to : c));
      await saveTaxonomy(next);
      await replaceCategoryInBooks(from, to);
      return NextResponse.json({ categories: next });
    }
    const mergingIntoExisting = list.some((c) => eqCI(c, to));
    // Remove the old name; keep/insert the new one.
    let next = list.filter((c) => !eqCI(c, from));
    if (!mergingIntoExisting) {
      next = list.map((c) => (eqCI(c, from) ? to : c));
    }
    await saveTaxonomy(next);
    const changed = await replaceCategoryInBooks(from, to);
    return NextResponse.json({ categories: next, changed });
  } catch (err) {
    console.error("PATCH /api/categories failed", err);
    return NextResponse.json({ error: "Could not rename." }, { status: 500 });
  }
}

// Delete (optionally reassigning books to another category)
export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const name = clean(body.name);
    const reassignTo = clean(body.reassignTo) || null;
    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    const list = await getTaxonomy();
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
    await saveTaxonomy(next);
    const changed = await replaceCategoryInBooks(name, reassignTo);
    return NextResponse.json({ categories: next, changed });
  } catch (err) {
    console.error("DELETE /api/categories failed", err);
    return NextResponse.json({ error: "Could not delete." }, { status: 500 });
  }
}
