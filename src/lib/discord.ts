export type LogType =
  | "ban"          // ban/unban
  | "phone"        // telefon doğrulama tələbləri/kodlar
  | "transfer"     // admin balans köçürmələri
  | "deposit"      // balans artırma (PayPal + bank)
  | "withdrawal"   // çıxarış tələbləri/təsdiqləri
  | "listing"      // yeni elan / redaktə / silmə
  | "order"        // alış / təhvil / təsdiq / ləğv
  | "dispute"      // mübahisə / report / dəstək ticket
  | "recovery"     // hesab qurtarma / email dəyişmə
  | "admin";       // digər ümumi admin əməliyyatları

const ENV_MAP: Record<LogType, string | undefined> = {
  ban: process.env.DISCORD_WEBHOOK_BAN,
  phone: process.env.DISCORD_WEBHOOK_PHONE,
  transfer: process.env.DISCORD_WEBHOOK_TRANSFER,
  deposit: process.env.DISCORD_WEBHOOK_DEPOSIT,
  withdrawal: process.env.DISCORD_WEBHOOK_WITHDRAWAL,
  listing: process.env.DISCORD_WEBHOOK_LISTING,
  order: process.env.DISCORD_WEBHOOK_ORDER,
  dispute: process.env.DISCORD_WEBHOOK_DISPUTE,
  recovery: process.env.DISCORD_WEBHOOK_RECOVERY,
  admin: process.env.DISCORD_WEBHOOK_ADMIN,
};

async function sendWebhook(url: string | undefined, content: string) {
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
  } catch {
    // Discord bildirişi getməsə də əsas əməliyyat davam etsin.
  }
}

export async function logToDiscord(type: LogType, content: string) {
  await sendWebhook(ENV_MAP[type], content);
}
