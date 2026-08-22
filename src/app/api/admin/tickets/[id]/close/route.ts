import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requireAdmin();
  if (check.error) return NextResponse.json({ error: check.error }, { status: check.status });

  const { id } = await params;
  const admin = createAdminClient();
  await admin.from("tickets").update({ status: "closed", resolved_at: new Date().toISOString() }).eq("id", id);
  return NextResponse.json({ ok: true });
}
