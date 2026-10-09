import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const admin = createAdminClient();
  const { data } = await admin.from("site_settings").select("key, value");
  const map = Object.fromEntries((data ?? []).map((s) => [s.key, s.value]));
  return NextResponse.json(map);
}
