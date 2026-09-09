import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logToDiscord } from "@/lib/discord";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requireAdmin();
  if (check.error) return NextResponse.json({ error: check.error }, { status: check.status });

  const { id } = await params;
  const { banned } = await req.json();
  const admin = createAdminClient();
  await admin.from("profiles").update({ is_banned: !!banned }).eq("id", id);

  const { data: profile } = await admin.from("profiles").select("username").eq("id", id).maybeSingle();
  await logToDiscord("ban", banned
    ? `🚫 @${profile?.username ?? id} BAN edildi.`
    : `✅ @${profile?.username ?? id}-in banı açıldı.`);

  return NextResponse.json({ ok: true });
}
