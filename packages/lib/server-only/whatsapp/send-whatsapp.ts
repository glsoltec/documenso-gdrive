import { prisma } from "@documenso/prisma";

interface WhatsAppRecipient {
  email: string;
  name: string;
  token?: string;
}

function getConfig() {
  return {
    url: process.env.EVOLUTION_API_URL || "",
    apiKey: process.env.EVOLUTION_API_KEY || "",
    instance: process.env.EVOLUTION_INSTANCE_NAME || "",
  };
}

async function send(phone: string, text: string) {
  const { url, apiKey, instance } = getConfig();
  if (!url || !apiKey || !instance || !phone) return;
  const endpoint = `${url}/message/sendText/${instance}`;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: apiKey },
      body: JSON.stringify({ number: phone, text, delay: 1200 }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`[WHATSAPP] ${res.status} -> ${phone}: ${body}`);
    }
  } catch (err) {
    console.error(`[WHATSAPP] error -> ${phone}:`, err);
  }
}

export async function sendDocumentSent(docTitle: string, webappUrl: string, recipients: WhatsAppRecipient[]) {
  for (const r of recipients) {
    const phone = await getPhone(r.email);
    if (!phone) continue;
    const signUrl = r.token ? `${webappUrl}/sign/${r.token}` : webappUrl;
    const msg =
      `📄 *${docTitle}* aguarda sua assinatura.\n\n` +
      `Link: ${signUrl}\n\n` +
      `Use seu e-mail: ${r.email}`;
    await send(phone, msg);
  }
}

export async function sendDocumentCompleted(docTitle: string, recipients: WhatsAppRecipient[]) {
  const phones = await getPhones(recipients.map((r) => r.email));
  for (const { email, phone } of phones) {
    if (!phone) continue;
    await send(phone, `✅ *${docTitle}* foi assinado por todos os participantes!`);
  }
}

export async function sendRecipientSigned(docTitle: string, recipientEmail: string, recipientName: string) {
  const phone = await getPhone(recipientEmail);
  if (!phone) return;
  await send(phone, `✅ Você assinou *${docTitle}* com sucesso!`);
}

export async function sendDocumentRejected(docTitle: string, recipientEmail: string, reason?: string) {
  const phone = await getPhone(recipientEmail);
  if (!phone) return;
  const msg = `❌ Você rejeitou *${docTitle}*.\nMotivo: ${reason || "não informado"}`;
  await send(phone, msg);
}

export async function sendWhatsAppTextToPhone(phone: string, text: string) {
  await send(phone, text);
}

async function getPhone(email: string): Promise<string | null> {
  const recipient = await prisma.recipient.findFirst({
    where: { email },
    select: { phone: true },
    orderBy: { id: "desc" },
  });
  return recipient?.phone || null;
}

async function getPhones(emails: string[]): Promise<{ email: string; phone: string | null }[]> {
  const recipients = await prisma.recipient.findMany({
    where: { email: { in: emails } },
    select: { email: true, phone: true },
    orderBy: { id: "desc" },
  });
  const map = new Map<string, string | null>();
  for (const r of recipients) {
    if (!map.has(r.email)) map.set(r.email, r.phone);
  }
  return emails.map((email) => ({ email, phone: map.get(email) || null }));
}
