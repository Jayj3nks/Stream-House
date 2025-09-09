import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";

// (optional) Ensure Node runtime for Mongo/JWT libs
export const runtime = "nodejs";

export async function GET() {
  try {
    const db = await getDb();
    const count = await db.collection("users").countDocuments();
    return NextResponse.json({ ok: true, userCount: count });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
