import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function SignInPage() {
  return (
    <main className="auth-page">
      <div className="auth-clerk">
        <Link href="/" className="auth-brand">
          🪺 Shelf Nest
        </Link>
        <SignIn fallbackRedirectUrl="/library" signUpUrl="/sign-up" />
      </div>
    </main>
  );
}
