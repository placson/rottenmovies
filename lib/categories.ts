// Category taxonomy + a lightweight auto-classifier used when a book is added.
// The classifier scores each category by keyword hits against the book's
// title, authors, subjects (from Open Library) and description (Google Books).

export const CATEGORIES: string[] = [
  "Christian Biography",
  "Church History",
  "American History",
  "World History",
  "Systematic Theology",
  "Biblical Theology",
  "Theology Proper",
  "Christology",
  "Pneumatology",
  "Soteriology",
  "Ecclesiology",
  "Eschatology",
  "Bibliology",
  "Hamartiology",
  "Apologetics",
  "Christian Living",
  "Spiritual Warfare",
  "Prayer",
  "Devotional",
  "Pastoral Ministry",
  "Preaching & Homiletics",
  "Missions & Evangelism",
  "Worship",
  "Ethics",
  "Marriage & Family",
  "Finances",
  "NT Commentaries",
  "OT Commentaries",
  "Reference",
  "Fiction",
  "Children's",
  // General / non-theological
  "Biography (General)",
  "Military History",
  "Science & Medicine",
  "Law & Politics",
];

const OT_BOOKS = [
  "genesis", "exodus", "leviticus", "numbers", "deuteronomy", "joshua",
  "judges", "ruth", "samuel", "kings", "chronicles", "ezra", "nehemiah",
  "esther", "job", "psalm", "psalms", "proverbs", "ecclesiastes",
  "song of solomon", "song of songs", "isaiah", "jeremiah", "lamentations",
  "ezekiel", "daniel", "hosea", "joel", "amos", "obadiah", "jonah", "micah",
  "nahum", "habakkuk", "zephaniah", "haggai", "zechariah", "malachi",
  "pentateuch",
];

const NT_BOOKS = [
  "matthew", "mark", "luke", "john", "acts", "romans", "corinthians",
  "galatians", "ephesians", "philippians", "colossians", "thessalonians",
  "timothy", "titus", "philemon", "hebrews", "james", "peter", "jude",
  "revelation", "gospels",
];

// Single words score 1, multi-word phrases score 2 (more specific).
const KEYWORDS: Record<string, string[]> = {
  "Christian Biography": [
    "biography", "autobiography", "memoir", "the life of", "life and times",
    "life and letters", "biographies",
  ],
  "Church History": [
    "church history", "reformation", "puritan", "puritans", "patristic",
    "early church", "history of christianity", "ecclesiastical history",
    "medieval church", "the reformers",
  ],
  "American History": [
    "american history", "united states history", "u.s. history", "civil war",
    "founding fathers", "colonial america",
  ],
  "World History": [
    "world history", "ancient history", "roman empire", "western civilization",
  ],
  "Systematic Theology": [
    "systematic theology", "dogmatics", "doctrine", "theological", "theology",
    "confession of faith", "catechism",
  ],
  "Biblical Theology": [
    "biblical theology", "redemptive history", "covenant theology",
    "kingdom of god", "typology", "the whole bible",
  ],
  "Theology Proper": [
    "doctrine of god", "attributes of god", "the trinity", "trinity",
    "holiness of god", "knowledge of god", "sovereignty of god", "providence",
  ],
  "Christology": [
    "christology", "person of christ", "deity of christ", "the incarnation",
    "who is jesus", "life of christ", "the cross of christ",
  ],
  "Pneumatology": [
    "holy spirit", "the spirit", "gifts of the spirit", "pneumatology",
    "baptism of the spirit", "filled with the spirit",
  ],
  "Soteriology": [
    "salvation", "justification", "the atonement", "sanctification", "grace",
    "election", "predestination", "redemption", "the gospel", "born again",
    "regeneration",
  ],
  "Ecclesiology": [
    "ecclesiology", "the church", "church government", "church polity",
    "church membership", "church discipline", "elders", "deacons",
    "body of christ",
  ],
  "Eschatology": [
    "eschatology", "end times", "the second coming", "the millennium",
    "last things", "heaven", "hell", "prophecy", "the return of christ",
  ],
  "Bibliology": [
    "inerrancy", "inspiration of scripture", "authority of scripture",
    "the canon", "sufficiency of scripture", "doctrine of scripture",
    "word of god",
  ],
  "Hamartiology": ["the doctrine of sin", "original sin", "total depravity"],
  Apologetics: [
    "apologetics", "defense of the faith", "evidence for", "existence of god",
    "worldview", "atheism", "reasons to believe",
  ],
  "Christian Living": [
    "christian living", "christian life", "discipleship", "spiritual growth",
    "spiritual disciplines", "holiness", "godliness", "the christian walk",
  ],
  "Spiritual Warfare": [
    "spiritual warfare", "the devil", "demonic", "demons", "satan",
    "principalities", "the armor of god",
  ],
  Prayer: ["prayer", "praying", "intercession", "on prayer"],
  Devotional: [
    "devotional", "daily readings", "meditations", "morning and evening",
  ],
  "Pastoral Ministry": [
    "pastoral", "the pastor", "shepherding", "pastoral ministry",
    "pastoral care", "church leadership", "eldership", "biblical counseling",
  ],
  "Preaching & Homiletics": [
    "preaching", "homiletics", "the sermon", "expository preaching",
    "the pulpit", "proclaiming",
  ],
  "Missions & Evangelism": [
    "missions", "missionary", "evangelism", "the great commission",
    "unreached", "world missions", "sharing the gospel",
  ],
  Worship: ["worship", "liturgy", "hymns", "corporate worship", "psalmody"],
  Ethics: [
    "ethics", "moral", "bioethics", "abortion", "sexuality", "christian ethics",
  ],
  "Marriage & Family": [
    "marriage", "the family", "parenting", "husbands and wives", "raising",
    "fatherhood", "motherhood",
  ],
  Finances: [
    "money", "personal finance", "stewardship", "debt", "budgeting", "wealth",
    "investing", "generosity", "giving",
  ],
  Reference: [
    "dictionary", "encyclopedia", "handbook", "concordance", "atlas",
    "reference",
  ],
  Fiction: [
    "fiction", "a novel", "fantasy", "science fiction", "allegory", "stories",
  ],
  "Children's": [
    "juvenile", "picture book", "for children", "children's", "ages 4",
  ],
  "Biography (General)": [
    "memoirs", "his life", "her life", "a life", "the man who",
  ],
  "Military History": [
    "world war", "world war ii", "world war i", "d-day", "normandy",
    "band of brothers", "the war", "military history", "battle of",
    "vietnam war", "revolutionary war", "the marines", "infantry",
  ],
  "Science & Medicine": [
    "medicine", "cancer", "the emperor of all maladies", "biology", "physics",
    "neuroscience", "the brain", "disease", "evolution", "cosmology",
    "mathematics", "genetics", "the immune",
  ],
  "Law & Politics": [
    "supreme court", "the constitution", "constitutional", "politics",
    "political", "the presidency", "congress", "jurisprudence", "the senate",
  ],
};

export type ClassifyInput = {
  title?: string | null;
  authors?: string | null;
  subjects?: string[];
  description?: string | null;
};

function wordPresent(haystack: string, word: string): boolean {
  return new RegExp(`\\b${word}\\b`).test(haystack);
}

/**
 * Best-guess categories for a book, most-likely first (up to `limit`).
 * Returns [] when nothing matches confidently.
 */
export function guessCategories(input: ClassifyInput, limit = 3): string[] {
  const hay = [
    input.title,
    input.authors,
    ...(input.subjects ?? []),
    input.description,
  ]
    .filter(Boolean)
    .join("  ")
    .toLowerCase();

  if (!hay.trim()) return [];

  const scores: Record<string, number> = {};
  const bump = (cat: string, n: number) => {
    scores[cat] = (scores[cat] ?? 0) + n;
  };

  // Commentaries: only when the book presents itself as a commentary/exposition.
  if (/\bcommentar(y|ies)\b|\bexposition\b|\bexpository\b/.test(hay)) {
    if (NT_BOOKS.some((b) => wordPresent(hay, b))) bump("NT Commentaries", 6);
    if (OT_BOOKS.some((b) => wordPresent(hay, b))) bump("OT Commentaries", 6);
  }

  for (const [cat, kws] of Object.entries(KEYWORDS)) {
    for (const kw of kws) {
      if (hay.includes(kw)) bump(cat, kw.includes(" ") ? 2 : 1);
    }
  }

  return Object.entries(scores)
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([cat]) => cat);
}
