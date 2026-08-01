import Link from "next/link";
import { getSessionUserId } from "@/lib/auth";

export default async function Landing() {
  const loggedIn = Boolean(await getSessionUserId());

  const featuredBooks = [
    {
      title: "Mere Christianity",
      author: "C. S. Lewis",
      cover: "https://covers.openlibrary.org/b/id/9184573-L.jpg",
      note: "Theology",
    },
    {
      title: "The Hobbit",
      author: "J. R. R. Tolkien",
      cover: "https://covers.openlibrary.org/b/id/14624309-L.jpg",
      note: "Fiction",
    },
    {
      title: "Pride and Prejudice",
      author: "Jane Austen",
      cover: "https://covers.openlibrary.org/b/id/14619629-L.jpg",
      note: "Classics",
    },
    {
      title: "The Lion, the Witch and the Wardrobe",
      author: "C. S. Lewis",
      cover: "https://covers.openlibrary.org/b/id/14371458-L.jpg",
      note: "Fantasy",
    },
    {
      title: "The Brothers Karamazov",
      author: "Fyodor Dostoyevsky",
      cover: "https://covers.openlibrary.org/b/id/6620943-L.jpg",
      note: "Literature",
    },
  ];

  const features = [
    {
      eyebrow: "Scan",
      title: "Scan the stack",
      body: "Point your camera at the ISBN. Covers, authors, years, and page counts show up without the spreadsheet ritual.",
    },
    {
      eyebrow: "Sort",
      title: "Name your shelves",
      body: "Theology, fiction, odd rabbit trails, half-built obsessions. Make categories that sound like your actual library.",
    },
    {
      eyebrow: "Track",
      title: "Keep the trail",
      body: "Ratings, dates, Goodreads links, false starts, old favorites. See the story your reading life is quietly leaving behind.",
    },
    {
      eyebrow: "Plan",
      title: "Make shelves behave",
      body: "Turn the pile into a measured shelf plan, sized by page count, before your floor becomes a literary crime scene.",
    },
    {
      eyebrow: "Place",
      title: "Map the room",
      body: "Drop in the bookcases, corners, and towers. Preview the whole setup before moving one suspiciously heavy shelf.",
    },
    {
      eyebrow: "Lend",
      title: "Loan without the chase",
      body: "Let books go adventuring with a name and date attached. Send the reminder before friendship gets weird.",
    },
    {
      eyebrow: "Carry",
      title: "Pocket the whole thing",
      body: "Keep your catalog on your phone for bookstores, church halls, and used-book aisles where restraint goes to die.",
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
          <a href="#library" className="landing-tab">
            Library
          </a>
          <a href="#shelves" className="landing-tab">
            Shelves
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
          <p className="hero-badge">Personal library, beautifully kept</p>
          <h1>Shelf Nest</h1>
          <p className="hero-sub">
            Scan your books, search every shelf, and plan where each volume
            belongs in the room you actually live with.
          </p>
          <Link
            href={loggedIn ? "/library" : "/sign-up"}
            className="hero-search"
          >
            <span>Search by ISBN, title, author, or category</span>
            <strong>{loggedIn ? "Open" : "Start"}</strong>
          </Link>
          <div className="hero-cta">
            <Link
              href={loggedIn ? "/library" : "/sign-up"}
              className="btn-solid lg"
            >
              {loggedIn ? "Open my library" : "Start your library"}
            </Link>
            {!loggedIn && (
              <Link href="/sign-in" className="btn-outline lg">
                Sign in
              </Link>
            )}
          </div>
        </div>
        <div className="hero-art" aria-hidden>
          <div className="hero-device">
            <div className="hero-device-top">
              <span>Today</span>
              <strong>5 new books</strong>
            </div>
            <div className="hero-cover-stack">
              {featuredBooks.slice(0, 3).map((book) => (
                <img key={book.title} src={book.cover} alt="" />
              ))}
            </div>
            <div className="hero-note">
              <span>Next shelf</span>
              <strong>Doctrine and devotion</strong>
            </div>
          </div>
        </div>
      </section>

      <section id="library" className="store-section">
        <div className="section-head">
          <div>
            <p className="section-kicker">A library that feels browsable</p>
            <h2>Recently organized</h2>
          </div>
          <Link href={loggedIn ? "/library" : "/sign-up"} className="section-link">
            View library
          </Link>
        </div>
        <div className="book-rail">
          {featuredBooks.map((book) => (
            <article className="rail-book" key={book.title}>
              <div className="rail-cover">
                <img src={book.cover} alt="" loading="lazy" />
              </div>
              <p className="rail-title">{book.title}</p>
              <p className="rail-author">{book.author}</p>
              <p className="rail-note">{book.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="features" id="shelves">
        {features.map((f) => (
          <div key={f.title} className="feature">
            <p className="feature-eyebrow">{f.eyebrow}</p>
            <h3>{f.title}</h3>
            <p>{f.body}</p>
          </div>
        ))}
      </section>

      <section className="closing">
        <p className="section-kicker">Shelf planning, minus the spreadsheet</p>
        <h2>From barcode to bookcase.</h2>
        <p>Create a free account and scan your first shelf in under a minute.</p>
        <Link href={loggedIn ? "/library" : "/sign-up"} className="btn-solid lg">
          {loggedIn ? "Open my library" : "Get started"}
        </Link>
      </section>

      <footer className="landing-footer">
        <span>Shelf Nest</span>
        <span className="muted">Scan / organize / shelve</span>
      </footer>
    </main>
  );
}
