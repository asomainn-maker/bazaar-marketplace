import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requireAdmin();
  if (check.error) return NextResponse.json({ error: check.error }, { status: check.status });

  const { id } = await params;
  const admin = createAdminClient();
  const { data: listings } = await admin
    .from("listings")
    .select("id, title, price, status")
    .eq("seller_id", id)
    .neq("status", "removed")
    .order("created_at", { ascending: false });

  return NextResponse.json({ listings: listings ?? [] });
}
