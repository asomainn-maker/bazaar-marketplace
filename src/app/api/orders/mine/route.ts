import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const admin = createAdminClient();
  const { data: orders } = await admin
    .from("orders")
    .select("id, amount, status, created_at, listings(title)")
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({
    orders: (orders ?? []).map((o) => ({
      id: o.id,
      amount: o.amount,
      status: o.status,
      title: (o.listings as unknown as { title: string } | null)?.title ?? "Sifariş",
    })),
  });
}
