export async function notifyAdmin(subject: string, message: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!apiKey || !adminEmail) return; // sakitcə keç, konfiqurasiya olunmayıbsa

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Bazar <onboarding@resend.dev>",
        to: [adminEmail],
        subject: `Bazar: ${subject}`,
        html: `<p>${message}</p><p><a href="https://bazaar-flax.vercel.app/admin">Admin panelinə keç</a></p>`,
      }),
    });
  } catch {
    // email göndərilməsə də əsas əməliyyat davam etsin
  }
}
