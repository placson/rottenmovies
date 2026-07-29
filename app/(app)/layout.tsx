import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { getUserById } from "@/lib/db";
import LogoutButton from "@/components/LogoutButton";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  const user = await getUserById(userId);
  if (!user) redirect("/login");

  return (
    <>
      <header className="appbar no-print">
        <Link href="/library" className="appbar-brand">
          📚 My Bookshelves
        </Link>
        <div className="appbar-right">
          <span className="appbar-user">{user.email}</span>
          <LogoutButton />
        </div>
      </header>
      {children}
    </>
  );
}
