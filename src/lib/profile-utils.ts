import { createAdminClient } from "@/lib/supabase/admin";

function slugifyUsername(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 20) || "user"
  );
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 7);
}

export async function ensureProfile(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  email: string
) {
  const { data: existing } = await admin
    .from("profiles")
    .select("username, is_admin, wallet_balance, locked_balance, is_verified_seller")
    .eq("id", userId)
    .maybeSingle();

  if (existing) return existing;

  const base = slugifyUsername(email.split("@")[0] || "user");
  let username = base;
  for (let attempt = 0; attempt < 8; attempt++) {
    const { data: taken } = await admin
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (!taken) break;
    username = `${base}-${randomSuffix()}`;
  }

  const isAdmin = !!process.env.ADMIN_EMAIL && email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();

  const { data: created } = await admin
    .from("profiles")
    .insert({ id: userId, username, is_admin: isAdmin })
    .select("username, is_admin, wallet_balance, locked_balance, is_verified_seller")
    .single();

  return created!;
}
