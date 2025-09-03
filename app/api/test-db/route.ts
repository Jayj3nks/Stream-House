// app/api/test-db/route.ts
import { NextResponse } from "next/server";
import clientPromise from "../../../lib/mongo"; // relative path to lib/mongo.ts

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME!);
    const count = await db.collection("users").countDocuments();
    return NextResponse.json({ ok: true, userCount: count });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
