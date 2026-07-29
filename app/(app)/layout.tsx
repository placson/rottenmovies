import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { getSessionUserId } from "@/lib/auth";
import { migrateOrphansOnce } from "@/lib/db";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Middleware already protects these routes; this is a belt-and-suspenders check.
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in");

  // First signed-in user adopts any pre-accounts library data (runs once).
  await migrateOrphansOnce(userId);

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  return (
    <>
      <header className="appbar no-print">
        <Link href="/library" className="appbar-brand">
          📚 My Bookshelves
        </Link>
        <div className="appbar-right">
          {email && <span className="appbar-user">{email}</span>}
          <UserButton />
        </div>
      </header>
      {children}
    </>
  );
}
