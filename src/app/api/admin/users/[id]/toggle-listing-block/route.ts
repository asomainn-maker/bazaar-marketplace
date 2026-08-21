import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requireAdmin();
  if (check.error) return NextResponse.json({ error: check.error }, { status: check.status });

  const { id } = await params;
  const { blocked } = await req.json();
  const admin = createAdminClient();
  await admin.from("profiles").update({ can_list: !blocked }).eq("id", id);
  return NextResponse.json({ ok: true });
}
