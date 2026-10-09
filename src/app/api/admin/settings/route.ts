import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const check = await requireAdmin();
  if (check.error) return NextResponse.json({ error: check.error }, { status: check.status });

  const { key, value } = await req.json();
  if (typeof key !== "string" || typeof value !== "string" || !key.trim()) {
    return NextResponse.json({ error: "key/value tələb olunur" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("site_settings")
    .upsert({ key: key.trim(), value: value.trim(), updated_at: new Date().toISOString() });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
