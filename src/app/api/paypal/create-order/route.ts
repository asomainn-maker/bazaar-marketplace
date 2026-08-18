import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPaypalOrder } from "@/lib/paypal";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const { amount } = await req.json();
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount < 1 || numericAmount > 5000) {
    return NextResponse.json({ error: "Məbləğ 1-5000 aralığında olmalıdır" }, { status: 400 });
  }

  const origin = req.nextUrl.origin;
  const { orderId, approveLink } = await createPaypalOrder(
    numericAmount,
    `${origin}/api/paypal/capture-order?redirect=1`,
    `${origin}/dashboard/wallet?cancelled=1`
  );

  const admin = createAdminClient();
  const fee = Math.round(numericAmount * 0.1 * 100) / 100;
  await admin.from("deposits").insert({
    user_id: user.id,
    provider: "paypal",
    provider_ref: orderId,
    gross_amount: numericAmount,
    fee_amount: fee,
    net_amount: Math.round((numericAmount - fee) * 100) / 100,
    status: "pending",
  });

  if (!approveLink) {
    return NextResponse.json({ error: "PayPal təsdiq linki alınmadı" }, { status: 502 });
  }
  return NextResponse.json({ approveLink });
}
