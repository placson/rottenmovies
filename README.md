# 📚 Book Library Scanner

A phone-friendly **Progressive Web App (PWA)** for building your personal book
library — like [Libib](https://www.libib.com/) or
[LibraryThing](https://www.librarything.com/), but yours.

Open it on your phone, tap **Scan**, point the camera at a book's barcode, and
the book is looked up and saved to your library on a remote
[Vercel](https://vercel.com) site. No app store, no install — just "Add to Home
Screen" and it behaves like a native app.

## How it works

```
 📱 Phone camera  ──scan ISBN──▶  Vercel (Next.js)  ──lookup──▶  Open Library / Google Books
        │                              │
        └──────── your library ◀───────┴──────▶  Neon Postgres (persistent storage)
```

- **Scanning** happens in the browser using your phone's camera
  ([ZXing](https://github.com/zxing-js/library) decodes EAN-13 / ISBN barcodes).
- **Lookup** hits [Open Library](https://openlibrary.org/) first (no API key),
  then falls back to [Google Books](https://developers.google.com/books) — no
  keys required.
- **Storage** is a Postgres database (Neon, Vercel's native Postgres) so your
  library persists and is available on every device.

## Features

- 📷 Live camera barcode scanning (auto-detects, with haptic feedback)
- ⌨️ Manual ISBN entry as a fallback
- 🏷️ **Categories** — a theology-aware taxonomy (Systematic/Biblical Theology,
  Church History, NT/OT Commentaries, Christian Living, Spiritual Warfare,
  Fiction, Finances, and more). Each book is **auto-classified on add**, and you
  can **override with multiple categories** in the editor.
- 🗂️ **Filter** the library by category (with live counts) and search by title,
  author, ISBN, or category
- ✏️ **Editable taxonomy** — create categories (including inline while editing a
  book), rename them (updates every book), and delete them with an option to
  move the affected books to another category. Stored server-side.
- ✨ **Auto-categorize** button re-classifies every uncategorized book at once
  (useful for books added before categories existed); never touches books you
  categorized by hand
- ⭐ **Your 5-star rating**, plus **Goodreads link + Goodreads rating**
- 📅 **Reading dates** — date added, date started, date finished (with a
  Reading / Read badge on each cover)
- 🗄 **Shelf Plan** — groups the library into meaningful pastor's-study
  *sections*, computes each book's **spine width from its page count**, and lays
  everything onto **to-scale IKEA Billy bookcases** (76 cm shelves, 6 + a top
  extension). Includes a **printable shelf-by-shelf list** to follow while you
  physically arrange your books, plus tunable shelf dimensions and paper
  thickness. Commentaries shelve in canonical Bible order (Genesis → Revelation).
  **Drag any spine** to move it between shelves; the custom arrangement is saved
  (per browser) and overrides the auto plan until you reset it. Supports
  **mixed bookcase widths** — define each bay (e.g. IKEA BILLY wide 76 cm /
  narrow 36 cm, 6 shelves + extension) so the plan mirrors a real wall.
- 🗺 **Room Planner** — a top-down floor-plan editor (`/room`). Place pieces at
  exact measurements (inches or cm) and drag them into position: **Billy Wide**
  (76 cm) and **Billy Skinny** (36 cm) presets, plus Short, Rotating Tower, and
  Custom shelves. **Any piece can be made a corner** — mounted diagonally at 45°
  in any of the four room corners (top-left/right, bottom-left/right). Set the
  fill order, then turn on “Use my room layout” on the Shelf Plan to arrange
  books onto those shelves in that order. Saved server-side.
- 🖼️ Automatic cover art, author, year, and page count
- ✏️ Tap any book to edit; duplicates are detected by ISBN
- 📲 Installable PWA with offline shell + app icon

## Tech stack

| Piece      | Choice                                   |
| ---------- | ---------------------------------------- |
| Framework  | Next.js 16 (App Router) + React 19       |
| Hosting    | Vercel                                   |
| Database   | Neon Postgres (`@neondatabase/serverless`) |
| Scanning   | `@zxing/browser` + `@zxing/library`      |
| Book data  | Open Library API, Google Books API       |

---

## Deploy to Vercel (≈5 minutes)

### 1. Push this repo to GitHub
It's already committed on the `claude/barcode-book-library-app-xkun1c` branch.

### 2. Import into Vercel
- Go to [vercel.com/new](https://vercel.com/new) and import the repository.
- Vercel auto-detects Next.js — no build settings to change. Click **Deploy**.

### 3. Add a database (so your library persists)
- In your new Vercel project: **Storage → Create Database → Neon (Postgres)**.
- Vercel automatically injects the connection env vars (`DATABASE_URL`,
  `POSTGRES_URL`, etc.) into the project.
- **Redeploy** once (Deployments → ⋯ → Redeploy) so the app picks up the vars.

The `books` table is created automatically on first use — nothing to run by hand.

> **Without a database** the app still runs, but it uses a temporary file store
> that is wiped on every serverless cold start — fine for a quick demo, not for
> keeping a real library. Add the Neon database for persistence.

### 4. Install it on your phone
- Open your Vercel URL (e.g. `https://your-app.vercel.app`) on your phone.
- **iPhone (Safari):** Share → *Add to Home Screen*.
- **Android (Chrome):** menu → *Install app* / *Add to Home Screen*.
- Launch it from the home screen, allow camera access, and start scanning.

> 📸 Camera scanning requires **HTTPS**, which Vercel provides automatically.
> It will not work over plain `http://` (except on `localhost`).

---

## Run locally

```bash
npm install
npm run dev
# open http://localhost:3000
```

Locally, with no database configured, books are saved to `./.data/books.json`
(git-ignored). To test against a real database locally, put a connection string
in `.env.local`:

```bash
DATABASE_URL="postgres://user:pass@host/db?sslmode=require"
```

Camera scanning works on `http://localhost` in dev; on other origins you need
HTTPS. Use the **Enter ISBN manually** field to test without a camera.

## Project structure

```
app/
  layout.tsx              app shell + PWA metadata
  page.tsx                library UI + scanning flow
  globals.css             styles
  api/books/route.ts      GET list · POST add-by-ISBN (lookup + classify + store)
  api/books/[id]/route.ts PATCH edits · DELETE a book
components/
  Scanner.tsx             camera barcode scanner (client-only)
  BookEditor.tsx          edit modal: categories, rating, dates, Goodreads
lib/
  books.ts                ISBN normalization + Open Library / Google Books lookup
  categories.ts           category taxonomy + keyword auto-classifier
  db.ts                   storage (Neon Postgres, file-store fallback)
public/
  manifest.webmanifest    PWA manifest
  icon.svg                app icon
  sw.js                   service worker (installability + offline shell)
```

## API

| Method   | Route             | Body                          | Description                              |
| -------- | ----------------- | ----------------------------- | ---------------------------------------- |
| `GET`    | `/api/books`      | —                             | List your library                        |
| `POST`   | `/api/books`      | `{ "isbn": …}`                | Look up an ISBN, auto-classify, and add  |
| `PATCH`  | `/api/books/:id`  | `{ categories, rating, … }`   | Update categories, rating, dates, Goodreads |
| `DELETE` | `/api/books/:id`  | —                             | Remove a book                            |
| `POST`   | `/api/reorganize` | —                             | Auto-categorize every uncategorized book |
| `GET`    | `/api/categories` | —                             | List the category taxonomy               |
| `POST`   | `/api/categories` | `{ name }`                    | Create a category                        |
| `PATCH`  | `/api/categories` | `{ from, to }`                | Rename a category (updates all books)    |
| `DELETE` | `/api/categories` | `{ name, reassignTo? }`       | Delete, optionally reassigning books     |

### Goodreads note

Goodreads shut down its public API in 2020, so ratings can't be fetched
automatically. On add, each book gets a Goodreads **search link** for its ISBN;
open it, and type the community rating (and/or your review link) into the editor.

## Notes on dependencies

`npm audit` reports advisories in `postcss` and `sharp`, which are transitive
dependencies pulled in by Next.js itself. They aren't reachable in this app:
the CSS is first-party (the `postcss` advisories concern malicious CSS source
maps) and the app doesn't use `next/image`, so `sharp` never processes any
image. They'll clear when Next bumps its internal pins; do **not** run
`npm audit fix --force`, which tries to downgrade Next.js to v9.

---

_This app was added to a repository that previously contained a small Rotten
Tomatoes scraper (`rotten.py`); that file is unrelated and left untouched._
