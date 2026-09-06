const API_BASE = "https://api.telegram.org";

function requireToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN not configured");
  return token;
}

export async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  const token = requireToken();
  // Telegram messages cap at 4096 UTF-16 code units — split long agent
  // replies into multiple messages instead of letting the API reject them.
  const CHUNK = 4000;
  for (let i = 0; i < text.length; i += CHUNK) {
    const chunk = text.slice(i, i + CHUNK);
    const response = await fetch(`${API_BASE}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: chunk }),
    });
    if (!response.ok) {
      console.error("[telegram] sendMessage failed:", response.status, await response.text());
    }
  }
}

/** Registers the webhook URL with Telegram — run once from an authenticated admin action, not automatically (see connectTelegramWebhook). */
export async function setTelegramWebhook(url: string, secretToken: string): Promise<{ ok: boolean; description?: string }> {
  const token = requireToken();
  const response = await fetch(`${API_BASE}/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, secret_token: secretToken }),
  });
  return response.json();
}

export async function getTelegramWebhookInfo(): Promise<unknown> {
  const token = requireToken();
  const response = await fetch(`${API_BASE}/bot${token}/getWebhookInfo`);
  return response.json();
}
