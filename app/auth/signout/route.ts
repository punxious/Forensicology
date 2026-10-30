import { NextResponse } from "next/server";
import { signOut } from "@/lib/server/auth";

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  const self = new URL(req.url).origin;
  if (origin && origin !== self) return new NextResponse("Forbidden", { status: 403 });
  await signOut();
  return NextResponse.redirect(new URL("/", self), { status: 303 });
}
