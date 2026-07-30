import Link from "next/link";
import { getSessionUserId } from "@/lib/auth";

export default async function Landing() {
  const loggedIn = Boolean(await getSessionUserId());

  const features = [
    {
      icon: "📷",
      title: "Scan any barcode",
      body: "Point your phone at a book's ISBN barcode and it's added in seconds — cover, author, year, and page count filled in automatically.",
    },
    {
      icon: "🏷️",
      title: "Smart categories",
      body: "Every book is auto-sorted into your own taxonomy. Create, rename, and merge categories however you think about your collection.",
    },
    {
      icon: "⭐",
      title: "Track your reading",
      body: "Your rating, start and finish dates, and a Goodreads link on every book. Search and filter your whole library instantly.",
    },
    {
      icon: "🗄️",
      title: "Plan your shelves",
      body: "See your books laid onto to-scale bookcases, sized by page count. Print a shelf-by-shelf plan to arrange your real shelves.",
    },
    {
      icon: "🗺️",
      title: "Design your room in 3D",
      body: "Map your actual room — wide and narrow cases, corners at any angle, towers — then step inside a 3D view and orbit around your shelves.",
    },
    {
      icon: "🤝",
      title: "Lend with a smile",
      body: "Lend a book to a friend and Shelf Nest emails them a warm reminder — not a stern library notice — to bring it home within about 30 days. Track who has what, with dates.",
    },
    {
      icon: "📲",
      title: "Works like an app",
      body: "Install it to your phone's home screen. No app store, no downloads — just open, scan, and go. Your library syncs everywhere.",
    },
  ];

  return (
    <main className="landing">
      <header className="landing-nav">
        <span className="landing-logo">🪺 Shelf Nest</span>
        <nav className="landing-nav-links">
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
        <div className="hero-badge">Your whole library, in your pocket</div>
        <h1>
          Scan your books.
          <br />
          Organize your shelves.
        </h1>
        <p className="hero-sub">
          Shelf Nest turns your phone into a barcode scanner and your
          collection into a beautifully organized, searchable library — then
          helps you arrange it on your real shelves.
        </p>
        <div className="hero-cta">
          <Link href={loggedIn ? "/library" : "/sign-up"} className="btn-solid lg">
            {loggedIn ? "Open my library" : "Start your library — free"}
          </Link>
          {!loggedIn && (
            <Link href="/sign-in" className="btn-outline lg">
              I already have an account
            </Link>
          )}
        </div>
        <div className="hero-shelf" aria-hidden>
          {Array.from({ length: 24 }).map((_, i) => (
            <span
              key={i}
              className="hero-spine"
              style={{
                height: `${60 + ((i * 37) % 40)}%`,
                background: `hsl(${(i * 47) % 360} 45% 52%)`,
              }}
            />
          ))}
        </div>
      </section>

      <section className="features">
        {features.map((f) => (
          <div key={f.title} className="feature">
            <div className="feature-icon" aria-hidden>
              {f.icon}
            </div>
            <h3>{f.title}</h3>
            <p>{f.body}</p>
          </div>
        ))}
      </section>

      <section className="closing">
        <h2>Ready to see your whole collection?</h2>
        <p>Create a free account and scan your first book in under a minute.</p>
        <Link href={loggedIn ? "/library" : "/sign-up"} className="btn-solid lg">
          {loggedIn ? "Open my library" : "Get started"}
        </Link>
      </section>

      <footer className="landing-footer">
        <span>🪺 Shelf Nest</span>
        <span className="muted">Scan · Organize · Shelve</span>
      </footer>
    </main>
  );
}
