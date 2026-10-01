export async function lookupGeo(ip: string): Promise<{ country: string; city: string }> {
  if (!ip || ip === "unknown" || ip.startsWith("127.") || ip === "::1") {
    return { country: "Naməlum", city: "Naməlum" };
  }
  try {
    const res = await fetch(`https://ipwho.is/${ip}`, { cache: "no-store" });
    const data = await res.json();
    if (data.success === false) return { country: "Naməlum", city: "Naməlum" };
    return { country: data.country ?? "Naməlum", city: data.city ?? "Naməlum" };
  } catch {
    return { country: "Naməlum", city: "Naməlum" };
  }
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
