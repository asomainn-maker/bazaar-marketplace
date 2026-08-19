import twilio from "twilio";

export function getTwilioClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
}

export function normalizePhone(input: string): string {
  const digits = input.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.startsWith("0")) return `+994${digits.slice(1)}`; // Azərbaycan defolt
  if (digits.startsWith("994")) return `+${digits}`;
  return `+994${digits}`;
}
