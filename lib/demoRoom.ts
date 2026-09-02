import type { Book } from "./db";
import {
  DEFAULT_OPTIONS,
  planLibrary,
  type PlannedShelf,
  type ShelfOptions,
} from "./shelf";
import {
  cornerCenter,
  makeFurniture,
  roomToBayConfigs,
  type Furniture,
  type Room,
} from "./room";

/* ------------------------------------------------------------------ *
 * A read-only sample library + room used to showcase the shelf and    *
 * room planner on the marketing splash page. Nothing here touches the *
 * database — it is generated in the browser from these constants.     *
 * ------------------------------------------------------------------ */

/** Minimal book factory — the planner only needs title/authors/pages/category. */
function b(
  i: number,
  title: string,
  authors: string,
  category: string,
  pages: number
): Book {
  return {
    id: `demo-${i}`,
    isbn: `demo-${i}`,
    title,
    authors,
    cover_url: null,
    published: null,
    publisher: null,
    page_count: pages,
    categories: [category],
    date_started: null,
    date_finished: null,
    rating: null,
    goodreads_url: null,
    goodreads_rating: null,
    lent_to_name: null,
    lent_to_email: null,
    lent_at: null,
    due_at: null,
    added_at: "2024-01-01T00:00:00.000Z",
  };
}

// [title, author, category, pages]
const RAW: [string, string, string, number][] = [
  // Bibles & Reference
  ["ESV Study Bible", "Crossway", "Reference", 2752],
  ["A Greek-English Lexicon", "Liddell & Scott", "Reference", 2042],
  ["The New Bible Dictionary", "I. Howard Marshall", "Reference", 1352],
  ["Vine's Expository Dictionary", "W. E. Vine", "Reference", 1184],

  // Biblical Studies — OT commentaries (canonical order)
  ["Genesis", "Kenneth Mathews", "OT Commentaries", 528],
  ["Exodus", "Douglas Stuart", "OT Commentaries", 826],
  ["Psalms Volume 1", "Derek Kidner", "OT Commentaries", 512],
  ["Isaiah", "J. Alec Motyer", "OT Commentaries", 544],
  ["Daniel", "Iain Duguid", "OT Commentaries", 336],
  // NT commentaries
  ["The Gospel of Matthew", "R. T. France", "NT Commentaries", 1200],
  ["The Gospel According to John", "D. A. Carson", "NT Commentaries", 715],
  ["Romans", "Douglas Moo", "NT Commentaries", 1038],
  ["1 Corinthians", "Gordon Fee", "NT Commentaries", 968],
  ["The Pastoral Epistles", "George W. Knight", "NT Commentaries", 528],
  ["Hebrews", "Peter O'Brien", "NT Commentaries", 632],
  // Biblical Theology
  ["The Temple and the Church's Mission", "G. K. Beale", "Biblical Theology", 464],
  ["According to Plan", "Graeme Goldsworthy", "Biblical Theology", 251],
  ["The Kingdom of God", "T. Desmond Alexander", "Biblical Theology", 208],
  ["Dominion and Dynasty", "Stephen Dempster", "Biblical Theology", 267],

  // Theology & Doctrine
  ["Systematic Theology", "Wayne Grudem", "Systematic Theology", 1291],
  ["Institutes of the Christian Religion", "John Calvin", "Systematic Theology", 1521],
  ["Christian Theology", "Millard Erickson", "Systematic Theology", 1312],
  ["The Doctrine of God", "John Frame", "Theology Proper", 992],
  ["The Existence and Attributes of God", "Stephen Charnock", "Theology Proper", 1150],
  ["Knowing God", "J. I. Packer", "Theology Proper", 286],
  ["The Person of Christ", "Donald Macleod", "Christology", 288],
  ["Jesus and the Eyewitnesses", "Richard Bauckham", "Christology", 680],
  ["Keep in Step with the Spirit", "J. I. Packer", "Pneumatology", 304],
  ["The Cross of Christ", "John Stott", "Soteriology", 380],
  ["Redemption Accomplished and Applied", "John Murray", "Soteriology", 192],
  ["The Church", "Edmund Clowney", "Ecclesiology", 336],
  ["A Case for Amillennialism", "Kim Riddlebarger", "Eschatology", 288],
  ["The Reason for God", "Timothy Keller", "Apologetics", 348],
  ["Mere Christianity", "C. S. Lewis", "Apologetics", 227],
  ["The Doctrine of the Christian Life", "John Frame", "Ethics", 1088],

  // Church History & Biography
  ["The Story of Christianity", "Justo González", "Church History", 1184],
  ["The Reformation", "Diarmaid MacCulloch", "Church History", 864],
  ["Church History in Plain Language", "Bruce Shelley", "Church History", 560],
  ["Bonhoeffer", "Eric Metaxas", "Christian Biography", 624],
  ["George Whitefield", "Arnold Dallimore", "Christian Biography", 604],
  ["Here I Stand: A Life of Martin Luther", "Roland Bainton", "Christian Biography", 336],

  // Pastoral & Ministry
  ["The Reformed Pastor", "Richard Baxter", "Pastoral Ministry", 256],
  ["Lectures to My Students", "C. H. Spurgeon", "Pastoral Ministry", 448],
  ["Dangerous Calling", "Paul David Tripp", "Pastoral Ministry", 240],
  ["Preaching and Preachers", "D. Martyn Lloyd-Jones", "Preaching & Homiletics", 400],
  ["Christ-Centered Preaching", "Bryan Chapell", "Preaching & Homiletics", 400],
  ["Worship by the Book", "D. A. Carson", "Worship", 256],
  ["Let the Nations Be Glad", "John Piper", "Missions & Evangelism", 288],

  // Christian Living & Devotion
  ["The Pursuit of Holiness", "Jerry Bridges", "Christian Living", 176],
  ["Spiritual Disciplines for the Christian Life", "Donald Whitney", "Christian Living", 352],
  ["A Praying Life", "Paul Miller", "Prayer", 279],
  ["Morning and Evening", "C. H. Spurgeon", "Devotional", 744],
  ["The Screwtape Letters", "C. S. Lewis", "Spiritual Warfare", 209],
  ["When Sinners Say I Do", "Dave Harvey", "Marriage & Family", 191],
  ["Money, Possessions, and Eternity", "Randy Alcorn", "Finances", 480],

  // General & Other
  ["1776", "David McCullough", "American History", 386],
  ["The Emperor of All Maladies", "Siddhartha Mukherjee", "Science & Medicine", 592],
  ["Scalia: A Court of One", "Bruce Allen Murphy", "Law & Politics", 656],
  ["Band of Brothers", "Stephen Ambrose", "Military History", 336],
  ["The Lord of the Rings", "J. R. R. Tolkien", "Fiction", 1178],
  ["The Chronicles of Narnia", "C. S. Lewis", "Fiction", 767],
  ["The Brothers Karamazov", "Fyodor Dostoyevsky", "Fiction", 796],
  ["Pride and Prejudice", "Jane Austen", "Fiction", 279],
];

// The 3D scene draws each book as an anonymous colored spine (title/author
// never surface), so we pad each section with extra volumes to fill the
// shelves — the packer starts a new shelf per section, leaving them sparse
// otherwise. Padding pages vary so spine widths look natural.
const PAD: [string, number][] = [
  ["OT Commentaries", 30],
  ["NT Commentaries", 34],
  ["Biblical Theology", 16],
  ["Systematic Theology", 14],
  ["Theology Proper", 12],
  ["Christology", 12],
  ["Soteriology", 12],
  ["Ecclesiology", 10],
  ["Apologetics", 12],
  ["Church History", 22],
  ["Christian Biography", 22],
  ["Pastoral Ministry", 18],
  ["Preaching & Homiletics", 12],
  ["Missions & Evangelism", 10],
  ["Christian Living", 26],
  ["Prayer", 10],
  ["Devotional", 10],
  ["Spiritual Warfare", 8],
  ["Fiction", 22],
  ["American History", 12],
  ["Military History", 10],
];

// Deterministic pseudo-random page counts (stable spine widths per render).
function pages(seed: number): number {
  const r = Math.abs(Math.sin(seed) * 10000) % 1;
  return Math.round(120 + r * 640);
}

const DEMO_BOOKS: Book[] = (() => {
  const list = RAW.map((r, i) => b(i, r[0], r[1], r[2], r[3]));
  let n = list.length;
  for (const [category, count] of PAD) {
    for (let k = 0; k < count; k++) {
      list.push(b(n, `Volume ${k + 1}`, "Various", category, pages(n + 1)));
      n++;
    }
  }
  return list;
})();

/** A tidy sample room: two Billy Wides between two Billy Skinnies, with the
 *  right-hand skinny tucked into the top-right corner at 45°. */
export const DEMO_ROOM: Room = (() => {
  const unit = "in" as const;
  const width = 138;
  const length = 96;

  const skinnyLeft: Furniture = {
    ...makeFurniture("billySkinny", unit, 1),
    id: "demo-skinny-left",
    label: "Billy Skinny",
    x: 8,
    y: 4,
  };
  const wideA: Furniture = {
    ...makeFurniture("billyWide", unit, 2),
    id: "demo-wide-a",
    label: "Billy Wide",
    x: 26,
    y: 4,
  };
  const wideB: Furniture = {
    ...makeFurniture("billyWide", unit, 3),
    id: "demo-wide-b",
    label: "Billy Wide",
    x: 60,
    y: 4,
  };
  const cornerPiece: Furniture = {
    ...makeFurniture("billySkinny", unit, 4),
    id: "demo-corner",
    label: "Corner",
    corner: "tr",
  };

  const room: Room = {
    unit,
    width,
    length,
    furniture: [skinnyLeft, wideA, wideB, cornerPiece],
  };

  // Tuck the corner piece into the top-right corner (its position is its center).
  const c = cornerCenter(room, "tr", cornerPiece.depth);
  cornerPiece.x = c.x;
  cornerPiece.y = c.y;

  return room;
})();

const DEMO_OPTIONS: ShelfOptions = {
  ...DEFAULT_OPTIONS,
  bookcases: roomToBayConfigs(DEMO_ROOM),
};

/** Books packed onto the demo room's bays, grouped by bay for <Room3D />. */
export function demoShelvesByBay(): Map<number, PlannedShelf[]> {
  const plan = planLibrary(DEMO_BOOKS, DEMO_OPTIONS);
  const m = new Map<number, PlannedShelf[]>();
  for (const sh of plan.shelves) {
    const a = m.get(sh.bay) ?? [];
    a.push(sh);
    m.set(sh.bay, a);
  }
  for (const a of m.values()) a.sort((x, y) => x.indexInBay - y.indexInBay);
  return m;
}
