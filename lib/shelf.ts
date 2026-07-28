import type { Book } from "./db";

/* ------------------------------------------------------------------ *
 * Meaningful sections for a pastor's / theological library.           *
 * Categories are grouped and ordered the way a study is usually laid  *
 * out: Bible → Biblical Studies → Theology → History → Ministry →     *
 * Christian Living → General.                                         *
 * ------------------------------------------------------------------ */

export type Section = {
  key: string;
  title: string;
  hue: number; // base HSL hue for this section's colors
  categories: string[];
};

export const SECTIONS: Section[] = [
  {
    key: "reference",
    title: "Bibles & Reference",
    hue: 45,
    categories: ["Reference", "Bibliology"],
  },
  {
    key: "biblical",
    title: "Biblical Studies",
    hue: 205,
    categories: ["OT Commentaries", "NT Commentaries", "Biblical Theology"],
  },
  {
    key: "theology",
    title: "Theology & Doctrine",
    hue: 265,
    categories: [
      "Systematic Theology",
      "Theology Proper",
      "Christology",
      "Pneumatology",
      "Soteriology",
      "Ecclesiology",
      "Eschatology",
      "Hamartiology",
      "Apologetics",
      "Ethics",
    ],
  },
  {
    key: "history",
    title: "Church History & Biography",
    hue: 25,
    categories: ["Church History", "Christian Biography"],
  },
  {
    key: "pastoral",
    title: "Pastoral & Ministry",
    hue: 155,
    categories: [
      "Pastoral Ministry",
      "Preaching & Homiletics",
      "Worship",
      "Missions & Evangelism",
    ],
  },
  {
    key: "living",
    title: "Christian Living & Devotion",
    hue: 330,
    categories: [
      "Christian Living",
      "Prayer",
      "Devotional",
      "Spiritual Warfare",
      "Marriage & Family",
      "Finances",
    ],
  },
  {
    key: "general",
    title: "General & Other",
    hue: 100,
    categories: [
      "American History",
      "World History",
      "Military History",
      "Biography (General)",
      "Science & Medicine",
      "Law & Politics",
      "Fiction",
      "Children's",
    ],
  },
];

const UNCATEGORIZED_SECTION: Section = {
  key: "uncategorized",
  title: "Uncategorized — needs a category",
  hue: 0,
  categories: [],
};

// category -> { section, order-within-section }
const CATEGORY_INDEX: Record<string, { section: Section; order: number }> = {};
for (const section of SECTIONS) {
  section.categories.forEach((cat, i) => {
    CATEGORY_INDEX[cat] = { section, order: i };
  });
}

/** A stable, pleasant color for a category, derived from its section hue. */
export function categoryColor(category: string): string {
  const entry = CATEGORY_INDEX[category];
  if (!entry) return "hsl(0 0% 55%)";
  const count = Math.max(entry.section.categories.length, 1);
  // Spread lightness across the section's categories so neighbors differ.
  const light = 42 + (entry.order / count) * 26;
  return `hsl(${entry.section.hue} 55% ${light.toFixed(0)}%)`;
}

export function sectionColor(section: Section): string {
  return `hsl(${section.hue} 55% 50%)`;
}

/* ------------------------------------------------------------------ *
 * Canonical Bible order — so commentaries shelve Genesis → Revelation *
 * ------------------------------------------------------------------ */

const BIBLE_ORDER = [
  "genesis", "exodus", "leviticus", "numbers", "deuteronomy", "joshua",
  "judges", "ruth", "1 samuel", "2 samuel", "samuel", "1 kings", "2 kings",
  "kings", "1 chronicles", "2 chronicles", "chronicles", "ezra", "nehemiah",
  "esther", "job", "psalms", "psalm", "proverbs", "ecclesiastes",
  "song of solomon", "song of songs", "isaiah", "jeremiah", "lamentations",
  "ezekiel", "daniel", "hosea", "joel", "amos", "obadiah", "jonah", "micah",
  "nahum", "habakkuk", "zephaniah", "haggai", "zechariah", "malachi",
  "matthew", "mark", "luke", "john", "acts", "romans", "1 corinthians",
  "2 corinthians", "corinthians", "galatians", "ephesians", "philippians",
  "colossians", "1 thessalonians", "2 thessalonians", "thessalonians",
  "1 timothy", "2 timothy", "timothy", "titus", "philemon", "hebrews", "james",
  "1 peter", "2 peter", "peter", "1 john", "2 john", "3 john", "jude",
  "revelation",
];

function bibleBookIndex(title: string): number {
  const t = title.toLowerCase();
  let best = Number.MAX_SAFE_INTEGER;
  BIBLE_ORDER.forEach((book, i) => {
    if (new RegExp(`\\b${book}\\b`).test(t) && i < best) best = i;
  });
  return best;
}

function authorSortKey(authors: string): string {
  const first = authors.split(",")[0]?.trim() ?? "";
  const parts = first.split(/\s+/);
  const surname = parts.length > 1 ? parts[parts.length - 1] : first;
  return surname.toLowerCase();
}

/* ------------------------------------------------------------------ *
 * Spine width from page count                                         *
 * ------------------------------------------------------------------ */

export type ShelfOptions = {
  shelfWidthCm: number; // usable interior width of one shelf
  shelvesPerBay: number; // main shelves (Billy ≈ 6)
  hasExtension: boolean; // add a top extension shelf per bay
  mmPerPage: number; // paper bulk
  coverMm: number; // covers/boards allowance
  defaultPages: number; // when a book has no page count
  minSpineMm: number;
  maxSpineMm: number;
  sectionStartsNewShelf: boolean;
};

export const DEFAULT_OPTIONS: ShelfOptions = {
  shelfWidthCm: 76,
  shelvesPerBay: 6,
  hasExtension: true,
  mmPerPage: 0.055,
  coverMm: 4,
  defaultPages: 250,
  minSpineMm: 8,
  maxSpineMm: 65,
  sectionStartsNewShelf: true,
};

export function spineWidthMm(book: Book, o: ShelfOptions): number {
  const pages = book.page_count && book.page_count > 0 ? book.page_count : o.defaultPages;
  const mm = pages * o.mmPerPage + o.coverMm;
  return Math.round(Math.min(o.maxSpineMm, Math.max(o.minSpineMm, mm)) * 10) / 10;
}

/* ------------------------------------------------------------------ *
 * The plan                                                            *
 * ------------------------------------------------------------------ */

export type PlacedBook = {
  book: Book;
  widthMm: number;
  category: string;
  color: string;
};

export type PlannedShelf = {
  globalIndex: number; // position across all shelves (matches manual-layout index)
  bay: number; // 0-based
  indexInBay: number; // 0 = top
  isExtension: boolean;
  items: PlacedBook[];
  usedMm: number;
  capacityMm: number;
  // sections represented on this shelf, in order (for labels)
  sections: string[];
};

export type ShelfPlan = {
  shelves: PlannedShelf[];
  bayCount: number;
  totalBooks: number;
  totalLinearMm: number;
  capacityMm: number;
  options: ShelfOptions;
};

function sectionOf(book: Book): { section: Section; catOrder: number; category: string } {
  const cat = book.categories[0];
  if (cat && CATEGORY_INDEX[cat]) {
    return { section: CATEGORY_INDEX[cat].section, catOrder: CATEGORY_INDEX[cat].order, category: cat };
  }
  if (cat) {
    // Categorized but not mapped to a section — treat as General.
    const general = SECTIONS[SECTIONS.length - 1];
    return { section: general, catOrder: 99, category: cat };
  }
  return { section: UNCATEGORIZED_SECTION, catOrder: 0, category: "Uncategorized" };
}

export function planLibrary(books: Book[], options: ShelfOptions): ShelfPlan {
  const capacityMm = options.shelfWidthCm * 10;
  const perBay = options.shelvesPerBay + (options.hasExtension ? 1 : 0);

  // 1) order books by section → category → (canonical / author) → title
  const decorated = books.map((b) => {
    const { section, catOrder, category } = sectionOf(b);
    const sectionOrder = SECTIONS.findIndex((s) => s.key === section.key);
    return {
      book: b,
      section,
      sectionOrder: sectionOrder === -1 ? SECTIONS.length : sectionOrder,
      catOrder,
      category,
      bible: bibleBookIndex(b.title),
      author: authorSortKey(b.authors),
    };
  });

  decorated.sort((a, b) => {
    if (a.sectionOrder !== b.sectionOrder) return a.sectionOrder - b.sectionOrder;
    if (a.catOrder !== b.catOrder) return a.catOrder - b.catOrder;
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    // Commentaries: canonical order; otherwise author then title.
    if (a.bible !== b.bible) return a.bible - b.bible;
    if (a.author !== b.author) return a.author.localeCompare(b.author);
    return a.book.title.localeCompare(b.book.title);
  });

  // 2) pack left→right, top→bottom
  const shelves: PlannedShelf[] = [];
  let current: PlannedShelf | undefined;
  let globalShelfIndex = 0;
  let lastSectionKey: string | null = null;

  const makeShelf = (): PlannedShelf => {
    const bay = Math.floor(globalShelfIndex / perBay);
    const indexInBay = globalShelfIndex % perBay;
    const shelf: PlannedShelf = {
      globalIndex: globalShelfIndex,
      bay,
      indexInBay,
      isExtension: options.hasExtension && indexInBay === 0,
      items: [],
      usedMm: 0,
      capacityMm,
      sections: [],
    };
    globalShelfIndex++;
    return shelf;
  };

  for (const d of decorated) {
    const widthMm = spineWidthMm(d.book, options);
    const startingNewSection = d.section.key !== lastSectionKey;

    const needNew =
      !current ||
      current.usedMm + widthMm > capacityMm ||
      (options.sectionStartsNewShelf &&
        startingNewSection &&
        current.items.length > 0);

    if (needNew) {
      current = makeShelf();
      shelves.push(current);
    }
    // needNew is always true when `current` is undefined, so it is set here.
    const shelf = current!;

    shelf.items.push({
      book: d.book,
      widthMm,
      category: d.category,
      color:
        d.section.key === "uncategorized"
          ? "hsl(0 0% 45%)"
          : categoryColor(d.category),
    });
    shelf.usedMm += widthMm;
    if (!shelf.sections.includes(d.section.title)) {
      shelf.sections.push(d.section.title);
    }
    lastSectionKey = d.section.key;
  }

  const totalLinearMm = shelves.reduce((s, sh) => s + sh.usedMm, 0);
  const bayCount = shelves.length ? Math.floor((shelves.length - 1) / perBay) + 1 : 0;

  return {
    shelves,
    bayCount,
    totalBooks: books.length,
    totalLinearMm,
    capacityMm,
    options,
  };
}

/* ------------------------------------------------------------------ *
 * Manual layout support (drag-to-move)                                *
 * A manual layout is just an ordered list of shelves, each an ordered *
 * list of book ids. Bays are derived purely by chunking.              *
 * ------------------------------------------------------------------ */

/** The section title a book belongs to (for shelf captions). */
export function categorySectionTitle(category: string | undefined): string {
  if (category && CATEGORY_INDEX[category]) {
    return CATEGORY_INDEX[category].section.title;
  }
  if (category) return SECTIONS[SECTIONS.length - 1].title;
  return UNCATEGORIZED_SECTION.title;
}

/** Turn a book into a placed spine (width + color). */
export function placeBook(book: Book, o: ShelfOptions): PlacedBook {
  const category = book.categories[0] ?? "Uncategorized";
  const known = Boolean(CATEGORY_INDEX[category]);
  return {
    book,
    widthMm: spineWidthMm(book, o),
    category,
    color: known ? categoryColor(category) : "hsl(0 0% 45%)",
  };
}

/** Build display shelves (bay/index/extension/usage) from explicit id rows. */
export function finalizeShelves(
  rows: PlacedBook[][],
  options: ShelfOptions
): PlannedShelf[] {
  const capacityMm = options.shelfWidthCm * 10;
  const perBay = options.shelvesPerBay + (options.hasExtension ? 1 : 0);

  return rows.map((items, i) => {
    const sections: string[] = [];
    for (const it of items) {
      const title = categorySectionTitle(it.book.categories[0]);
      if (!sections.includes(title)) sections.push(title);
    }
    const indexInBay = i % perBay;
    return {
      globalIndex: i,
      bay: Math.floor(i / perBay),
      indexInBay,
      isExtension: options.hasExtension && indexInBay === 0,
      items,
      usedMm: items.reduce((s, it) => s + it.widthMm, 0),
      capacityMm,
      sections,
    };
  });
}

/**
 * Reconcile a saved manual layout with the current library: drop ids that no
 * longer exist (and duplicates), then append any books not yet placed to a
 * trailing shelf. Empty interior shelves are preserved so the grid is stable.
 */
export function reconcileManual(
  saved: string[][],
  books: Book[]
): string[][] {
  const byId = new Map(books.map((b) => [b.id, b]));
  const seen = new Set<string>();
  const rows = saved.map((row) =>
    row.filter((id) => {
      if (byId.has(id) && !seen.has(id)) {
        seen.add(id);
        return true;
      }
      return false;
    })
  );
  const unplaced = books.filter((b) => !seen.has(b.id)).map((b) => b.id);
  if (unplaced.length) rows.push(unplaced);
  // Trim trailing empty shelves (but keep interior empties).
  while (rows.length > 1 && rows[rows.length - 1].length === 0) rows.pop();
  return rows;
}

/** The auto plan expressed as a manual layout (id rows) — the drag seed. */
export function planToRows(plan: ShelfPlan): string[][] {
  return plan.shelves.map((sh) => sh.items.map((it) => it.book.id));
}
