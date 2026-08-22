import { createAdminClient } from "@/lib/supabase/admin";

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return; // konfiqurasiya olunmayıbsa sakitcə keç

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Bazar <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });
  } catch {
    // email göndərilməsə də əsas əməliyyat davam etsin
  }
}

export async function notifyAdmin(subject: string, message: string) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;
  await sendEmail(
    adminEmail,
    `İtemBazar: ${subject}`,
    `<p>${message}</p><p><a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://bazaar-flax.vercel.app"}/admin">Admin panelinə keç</a></p>`
  );
}

export async function getUserEmail(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<string | null> {
  const { data } = await admin.auth.admin.getUserById(userId);
  return data.user?.email ?? null;
}

export async function notifyUser(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  subject: string,
  message: string
) {
  const email = await getUserEmail(admin, userId);
  if (!email) return;
  await sendEmail(
    email,
    `İtemBazar: ${subject}`,
    `<p>${message}</p><p><a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://bazaar-flax.vercel.app"}/dashboard">Dashboard-a keç</a></p>`
  );
}
