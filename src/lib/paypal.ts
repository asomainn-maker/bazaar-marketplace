const PAYPAL_API_BASE =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

async function getAccessToken(): Promise<string> {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) throw new Error("PayPal token error");
  const data = await res.json();
  return data.access_token;
}

export async function createPaypalOrder(amount: number, returnUrl: string, cancelUrl: string) {
  const token = await getAccessToken();
  const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: { currency_code: "USD", value: amount.toFixed(2) },
          description: "Balans artırımı",
        },
      ],
      application_context: {
        return_url: returnUrl,
        cancel_url: cancelUrl,
        user_action: "PAY_NOW",
      },
    }),
  });

  if (!res.ok) throw new Error("PayPal order creation failed");
  const data = await res.json();
  const approveLink = data.links?.find((l: { rel: string; href: string }) => l.rel === "approve")?.href;
  return { orderId: data.id as string, approveLink: approveLink as string | undefined };
}

export async function capturePaypalOrder(orderId: string) {
  const token = await getAccessToken();
  const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "PayPal capture failed");

  const status = data.status as string;
  const grossValue = parseFloat(
    data.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value ?? "0"
  );

  return { status, grossValue };
}
