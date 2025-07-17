import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/api/webhook/register",
  "/sign-in",
  "/sign-up",
]);

export default clerkMiddleware(async (auth, req) => {
  console.log("in midddlewaare");
  const { userId } = await auth();
  const pathname = req.nextUrl.pathname;

  if (!userId && !isPublicRoute(req)) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  if (userId) {
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);

      const role = user.publicMetadata.role as string | undefined;

      // Admin going to /dashboard? Send them to admin dashboard
      if (role === "admin" && pathname === "/dashboard") {
        return NextResponse.redirect(new URL("/admin/dashboard", req.url));
      }

      // Non-admin trying to access admin? Block it
      if (role !== "admin" && pathname.startsWith("/admin")) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }

      // Signed in users trying to visit public routes( signin or sign up)
      if (isPublicRoute(req)) {
        return NextResponse.redirect(
          new URL(role === "admin" ? "/admin/dashboard" : "/dashboard", req.url)
        );
      }
    } catch (err) {
      console.error("Clerk client error:", err);
      return NextResponse.redirect(new URL("/error", req.url));
    }
  }
});

export const config = {
  matcher: [
    "/((?!api/webhook/register|.+\\.[\\w]+$|_next).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};
