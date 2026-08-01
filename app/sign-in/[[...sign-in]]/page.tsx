import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isLocalAuthBypassed } from "@/lib/local-auth";

export default function SignInPage() {
  if (isLocalAuthBypassed()) redirect("/library");

  return (
    <main className="auth-page">
      <div className="auth-clerk">
        <Link href="/" className="auth-brand">
          <span className="brand-dot" aria-hidden />
          Shelf Nest
        </Link>
        <SignIn fallbackRedirectUrl="/library" signUpUrl="/sign-up" />
      </div>
    </main>
  );
}
