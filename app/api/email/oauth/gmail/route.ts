import { NextRequest, NextResponse } from "next/server";

/** Alias — UI provider id is `gmail`, OAuth route segment is `google`. */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/api/email/oauth/google";
  return NextResponse.redirect(url);
}
