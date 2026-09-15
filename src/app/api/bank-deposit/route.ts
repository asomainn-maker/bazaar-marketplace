import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { logToDiscord } from "@/lib/discord";
import { notifyAdmin } from "@/lib/email";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const admin = createAdminClient();
  if (!(await checkRateLimit(admin, user.id, "bank_deposit", 5, 3600))) {
    return NextResponse.json({ error: "Çox tez-tez tələb göndərirsiniz. Bir az sonra cəhd edin." }, { status: 429 });
  }

  const { amount, senderNote } = await req.json();
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount < 1 || numericAmount > 5000) {
    return NextResponse.json({ error: "Məbləğ 1-5000 ₼ aralığında olmalıdır" }, { status: 400 });
  }
  if (typeof senderNote !== "string" || !senderNote.trim()) {
    return NextResponse.json({ error: "Köçürməni edən kartın son 4 rəqəmini və ya adınızı yazın" }, { status: 400 });
  }

  const { data: request, error } = await admin
    .from("bank_deposit_requests")
    .insert({ user_id: user.id, amount: numericAmount, sender_note: senderNote.trim().slice(0, 300) })
    .select("id, amount, status, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data: profile } = await admin.from("profiles").select("username").eq("id", user.id).maybeSingle();
  await logToDiscord("deposit", `🏦 @${profile?.username ?? user.id} bank köçürməsi bildirdi: ${numericAmount.toFixed(2)} ₼ — qeyd: ${senderNote.trim()}`);
  await notifyAdmin("Yeni bank köçürməsi tələbi", `@${profile?.username ?? "istifadəçi"}: ${numericAmount.toFixed(2)} ₼ — ${senderNote.trim()}`);

  return NextResponse.json({ request });
}
