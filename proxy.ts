import { auth } from "@/auth";

// Gate every route behind authentication, except the sign-in page and the
// Auth.js endpoints themselves.
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic =
    pathname.startsWith("/signin") || pathname.startsWith("/api/auth");
  if (!req.auth && !isPublic) {
    const url = new URL("/signin", req.nextUrl.origin);
    return Response.redirect(url);
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
