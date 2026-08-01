import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isLocalAuthBypassed } from "@/lib/local-auth";

export default function SignUpPage() {
  if (isLocalAuthBypassed()) redirect("/library");

  return (
    <main className="auth-page">
      <div className="auth-clerk">
        <Link href="/" className="auth-brand">
          <span className="brand-dot" aria-hidden />
          Shelf Nest
        </Link>
        <SignUp fallbackRedirectUrl="/library" signInUrl="/sign-in" />
      </div>
    </main>
  );
}
