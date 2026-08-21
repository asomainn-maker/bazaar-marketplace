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
  const { action, listingId } = await req.json(); // 'remove_listing' | 'dismiss'
  const admin = createAdminClient();

  if (action === "remove_listing" && listingId) {
    await admin.from("listings").update({ status: "removed" }).eq("id", listingId);
  }

  await admin.from("listing_reports").update({ status: "resolved" }).eq("id", id);
  return NextResponse.json({ ok: true });
}
