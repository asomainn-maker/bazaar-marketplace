import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const check = await requireAdmin();
  if (check.error) return NextResponse.json({ error: check.error }, { status: check.status });
  const q = (req.nextUrl.searchParams.get("q")?.trim() ?? "").replace(/[,()%]/g, "");
  if (q.length < 2) return NextResponse.json({ accounts: [] });

  const admin = createAdminClient();
  const ids = new Set<string>();
  const { data: byProfile } = await admin.from("profiles").select("id").or(`username.ilike.%${q}%,phone.ilike.%${q}%`).limit(10);
  (byProfile ?? []).forEach((p) => ids.add(p.id));
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  (list?.users ?? []).filter((u) => (u.email ?? "").toLowerCase().includes(q.toLowerCase())).slice(0, 10).forEach((u) => ids.add(u.id));
  const { data: byOld } = await admin.from("email_change_log").select("user_id").or(`old_email.ilike.%${q}%,new_email.ilike.%${q}%`).limit(10);
  (byOld ?? []).forEach((r) => ids.add(r.user_id));

  const accounts = [];
  for (const id of [...ids].slice(0, 10)) {
    const { data: profile } = await admin.from("profiles")
      .select("id, username, phone, phone_verified, wallet_balance, is_banned, can_list, can_message, created_at").eq("id", id).maybeSingle();
    if (!profile) continue;
    const { data: u } = await admin.auth.admin.getUserById(id);
    const { data: emailLog } = await admin.from("email_change_log").select("old_email, new_email, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(10);
    const { data: cards } = await admin.from("deposits").select("card_last4, gross_amount, created_at").eq("user_id", id).eq("status", "completed").not("card_last4", "is", null).order("created_at", { ascending: false }).limit(5);
    const { data: bank } = await admin.from("bank_deposit_requests").select("sender_note, amount, status, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(5);
    const { count: salesCount } = await admin.from("orders").select("*", { count: "exact", head: true }).eq("seller_id", id).eq("status", "completed");
    const { count: purchaseCount } = await admin.from("orders").select("*", { count: "exact", head: true }).eq("buyer_id", id);
    accounts.push({
      ...profile, email: u.user?.email ?? null, last_sign_in_at: u.user?.last_sign_in_at ?? null,
      providers: (u.user?.identities ?? []).map((i) => i.provider),
      email_history: emailLog ?? [], cards: cards ?? [], bank_notes: bank ?? [], sales: salesCount ?? 0, purchases: purchaseCount ?? 0,
    });
  }
  return NextResponse.json({ accounts });
}
