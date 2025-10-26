import { NextResponse } from "next/server";

// Middleware disabled: let /projects* 404 naturally.
// Keeping a no-op here avoids accidental redirects while preserving
// the option to re-enable middleware in the future without churn.
export function middleware() {
  return NextResponse.next();
}

// No matchers — this middleware will not run on any path.
export const config = {
  matcher: [],
};
