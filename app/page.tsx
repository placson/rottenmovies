import Link from "next/link";
import { getSessionUserId } from "@/lib/auth";
import DemoRoom3D from "@/components/DemoRoom3D";
import ScanPhone from "@/components/ScanPhone";
import PillarArt from "@/components/PillarArt";

export default async function Landing() {
  const loggedIn = Boolean(await getSessionUserId());

  const start = loggedIn ? "/library" : "/sign-up";

  const pillars = [
    {
      word: "Simply",
      kind: "simply" as const,
      title: "Scan, and you're done.",
      body: "Point your phone at the barcode. The title, author, cover, and page count fill themselves in — no typing, no spreadsheets. That's the whole job.",
      step: "01",
    },
    {
      word: "Systematically",
      kind: "systematically" as const,
      title: "Sorted by genre, automatically.",
      body: "Every book is filed into a sensible order — theology, church history, biography, fiction, and more — so your whole library has a clear structure without you arranging a thing.",
      step: "02",
    },
    {
      word: "Visually",
      kind: "visually" as const,
      title: "See it on a real bookshelf.",
      body: "Once it's arranged, view your collection on a 3D bookcase built to your own room and shelf dimensions — so you can see exactly where every book belongs.",
      step: "03",
    },
  ];

  return (
    <main className="landing">
      <header className="landing-nav">
        <span className="landing-logo">
          <span className="brand-dot" aria-hidden />
          Shelf Nest
        </span>
        <nav className="landing-nav-links">
          <a href="#how" className="landing-tab">
            How it works
          </a>
          <a href="#room" className="landing-tab">
            See it in 3D
          </a>
          {loggedIn ? (
            <Link href="/library" className="btn-solid">
              Open my library
            </Link>
          ) : (
            <>
              <Link href="/sign-in" className="btn-text">
                Sign in
              </Link>
              <Link href="/sign-up" className="btn-solid">
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="hero-badge">Simply scan — Shelf Nest does the rest</p>
          <h1>
            Add <span className="hero-accent">simply.</span> Organize{" "}
            <span className="hero-accent-3">systematically.</span> Arrange{" "}
            <span className="hero-accent-2">visually.</span>
          </h1>
          <p className="hero-sub">
            Scan a book and Shelf Nest files it automatically by genre. Then see
            your whole collection on a 3D bookshelf sized to your own room — the
            way a library should feel.
          </p>
          <div className="hero-cta">
            <Link href={start} className="btn-solid lg">
              {loggedIn ? "Open my library" : "Start your library"}
            </Link>
            <a href="#how" className="btn-outline lg">
              See how it works
            </a>
          </div>
        </div>
        <div className="hero-art" aria-hidden>
          <div className="hero-phone">
            <ScanPhone />
            <p className="hero-phone-caption">
              Point, scan, shelved &mdash; no typing.
            </p>
          </div>
        </div>
      </section>

      <section id="how" className="pillars">
        <div className="pillars-head">
          <p className="section-kicker">Three words, one workflow</p>
          <h2>
            Simply scan. Sorted systematically. Seen visually.
          </h2>
          <p className="pillars-lede">
            Shelf Nest turns a pile of books into an organized, browsable
            library — and then shows it to you as an actual bookshelf.
          </p>
        </div>
        <div className="pillar-grid">
          {pillars.map((p) => (
            <article className="pillar" key={p.word}>
              <div className="pillar-art">
                <PillarArt kind={p.kind} />
                <span className="pillar-step">{p.step}</span>
              </div>
              <p className="pillar-word">{p.word}</p>
              <h3>{p.title}</h3>
              <p className="pillar-body">{p.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="room" className="demo-section">
        <div className="section-head">
          <div>
            <p className="section-kicker">The visual part</p>
            <h2>See your library on your own shelves</h2>
          </div>
          <Link href={loggedIn ? "/shelf" : "/sign-up"} className="section-link">
            Plan my room
          </Link>
        </div>
        <p className="demo-lede">
          This is a live sample study — two wide bookcases between two narrow
          ones, with one tucked into the corner. Set your own room and shelf
          sizes and every spine falls into place, colored by genre and sized by
          page count. Drag to look around.
        </p>
        <DemoRoom3D />
      </section>

      <section className="closing">
        <p className="section-kicker">Simply · Systematically · Visually</p>
        <h2>From barcode to bookcase.</h2>
        <p>
          Create a free account and scan your first shelf in under a minute.
          Shelf Nest arranges the rest.
        </p>
        <Link href={start} className="btn-solid lg">
          {loggedIn ? "Open my library" : "Get started"}
        </Link>
      </section>

      <footer className="landing-footer">
        <span>Shelf Nest</span>
        <span className="muted">Simply · Systematically · Visually</span>
      </footer>
    </main>
  );
}
