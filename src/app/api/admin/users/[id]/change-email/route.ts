import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logToDiscord } from "@/lib/discord";
import { notifyUser } from "@/lib/email";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const check = await requireAdmin();
  if (check.error) return NextResponse.json({ error: check.error }, { status: check.status });
  const { id } = await params;
  const { newEmail } = await req.json();
  if (typeof newEmail !== "string" || !/^\S+@\S+\.\S+$/.test(newEmail.trim())) {
    return NextResponse.json({ error: "Düzgün email yazın" }, { status: 400 });
  }
  const email = newEmail.trim().toLowerCase();
  const admin = createAdminClient();
  const { data: current } = await admin.auth.admin.getUserById(id);
  if (!current.user) return NextResponse.json({ error: "İstifadəçi tapılmadı" }, { status: 404 });
  const oldEmail = current.user.email ?? null;
  if (oldEmail?.toLowerCase() === email) return NextResponse.json({ error: "Bu email artıq hesabdadır" }, { status: 400 });

  await notifyUser(admin, id, "Hesabınızın emaili dəyişdirildi", `Hesabınızın email ünvanı administrator tərəfindən <b>${email}</b> olaraq dəyişdirildi. Bu siz istəməmisinizsə, dərhal dəstəklə əlaqə saxlayın.`);
  const { error } = await admin.auth.admin.updateUserById(id, { email, email_confirm: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await admin.from("email_change_log").insert({ user_id: id, old_email: oldEmail, new_email: email, changed_by: check.user!.id });
  const { data: p } = await admin.from("profiles").select("username").eq("id", id).maybeSingle();
  await logToDiscord("recovery", `🔁 @${p?.username ?? id} emaili dəyişdirildi: \`${oldEmail ?? "?"}\` → \`${email}\``);
  return NextResponse.json({ ok: true });
}
