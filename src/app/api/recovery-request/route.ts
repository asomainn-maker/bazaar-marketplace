import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClientIp } from "@/lib/geo";
import { logToDiscord } from "@/lib/discord";
import { notifyAdmin } from "@/lib/email";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const claimedUsername = clean(body.claimedUsername, 60);
  const claimedPhone = clean(body.claimedPhone, 30);
  const claimedEmail = clean(body.claimedEmail, 120);
  const contactEmail = clean(body.contactEmail, 120);
  const details = clean(body.details, 2000);
  if (clean(body.website, 50)) return NextResponse.json({ ok: true });
  if (!contactEmail || !/^\S+@\S+\.\S+$/.test(contactEmail)) {
    return NextResponse.json({ error: "Sizinlə əlaqə üçün düzgün email yazın" }, { status: 400 });
  }
  if (!claimedUsername && !claimedPhone && !claimedEmail) {
    return NextResponse.json({ error: "İstifadəçi adı, telefon və ya köhnə email-dən ən azı birini yazın" }, { status: 400 });
  }
  const ip = getClientIp(req.headers);
  const admin = createAdminClient();
  const since = new Date(Date.now() - 3600 * 1000).toISOString();
  const { count } = await admin.from("recovery_requests").select("*", { count: "exact", head: true }).eq("ip", ip).gte("created_at", since);
  if ((count ?? 0) >= 3) {
    return NextResponse.json({ error: "Çox tez-tez müraciət göndərirsiniz. Bir az sonra yenidən cəhd edin." }, { status: 429 });
  }
  const { error } = await admin.from("recovery_requests").insert({
    claimed_username: claimedUsername || null, claimed_phone: claimedPhone || null, claimed_email: claimedEmail || null,
    contact_email: contactEmail, details: details || null, ip,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await logToDiscord("recovery", `🆘 Hesab qurtarma müraciəti: istifadəçi **${claimedUsername || "?"}**, telefon \`${claimedPhone || "?"}\`, köhnə email \`${claimedEmail || "?"}\`, əlaqə: ${contactEmail}`);
  await notifyAdmin("Hesab qurtarma müraciəti", `İstifadəçi adı: ${claimedUsername || "?"}<br/>Telefon: ${claimedPhone || "?"}<br/>Email: ${claimedEmail || "?"}<br/>Əlaqə: ${contactEmail}`);
  return NextResponse.json({ ok: true });
}
