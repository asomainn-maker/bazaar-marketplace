import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const check = await requireAdmin();
  if (check.error) return NextResponse.json({ error: check.error }, { status: check.status });

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ users: [] });

  const admin = createAdminClient();
  const { data: users } = await admin
    .from("profiles")
    .select("id, username, wallet_balance, is_banned, is_admin, phone, phone_verified, can_list, can_message, created_at")
    .ilike("username", `%${q}%`)
    .limit(20);

  return NextResponse.json({ users: users ?? [] });
}
