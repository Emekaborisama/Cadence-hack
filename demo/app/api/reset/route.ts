import { NextResponse } from "next/server";
import { resetState } from "@/lib/store";

export const dynamic = "force-dynamic";

// POST /api/reset — clears shared state for a clean demo re-run.
export async function POST() {
  return NextResponse.json(resetState());
}

// GET kept for convenience so the reset can be triggered from a browser.
export async function GET() {
  return NextResponse.json(resetState());
}
