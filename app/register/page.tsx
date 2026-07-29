import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import AuthForm from "@/components/AuthForm";

export default async function RegisterPage() {
  if (await getSessionUserId()) redirect("/library");
  return <AuthForm mode="register" />;
}
