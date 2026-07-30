import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <main className="auth-page">
      <div className="auth-clerk">
        <Link href="/" className="auth-brand">
          🪺 Shelf Nest
        </Link>
        <SignUp fallbackRedirectUrl="/library" signInUrl="/sign-in" />
      </div>
    </main>
  );
}
