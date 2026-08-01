import { auth } from "@clerk/nextjs/server";
import { getLocalAuthUserId, isLocalAuthBypassed } from "@/lib/local-auth";

/**
 * The current signed-in user's id (Clerk user id), or null.
 * Kept under this name so every data API route and server component that
 * already imports it continues to work unchanged.
 */
export async function getSessionUserId(): Promise<string | null> {
  if (isLocalAuthBypassed()) return getLocalAuthUserId();

  const { userId } = await auth();
  return userId ?? null;
}
