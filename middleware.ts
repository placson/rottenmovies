import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Everything except the public landing page, Clerk's own routes, and static
// assets requires a signed-in user.
const isProtected = createRouteMatcher([
  "/library(.*)",
  "/shelf(.*)",
  "/room(.*)",
  "/api/books(.*)",
  "/api/categories(.*)",
  "/api/reorganize(.*)",
  "/api/room(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next internals and static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
