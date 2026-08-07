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

/**
 * Mask a phone number in logs to avoid persisting PII (LGPD art. 5, 46).
 * e.g. 5521993666984 -> 55*****984
 */
function maskPhone(phone: string): string {
  const suffix = phone.slice(-3);

  return `${phone.slice(0, 2)}****${suffix}`;
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
      console.error(`[WHATSAPP] ${res.status} -> ${maskPhone(phone)}: ${body}`);
    }
  } catch (err) {
    console.error(`[WHATSAPP] error -> ${maskPhone(phone)}:`, err);
  }
}

export async function sendDocumentSent(
  docTitle: string,
  webappUrl: string,
  recipients: WhatsAppRecipient[],
  teamId?: number | null,
) {
  for (const r of recipients) {
    const phone = await getPhone(r.email, teamId);
    if (!phone) continue;
    const signUrl = r.token ? `${webappUrl}/sign/${r.token}` : webappUrl;
    const msg =
      `📄 *${docTitle}* aguarda sua assinatura.\n\n` +
      `Link: ${signUrl}\n\n` +
      `Use seu e-mail: ${r.email}`;
    await send(phone, msg);
  }
}

export async function sendDocumentCompleted(docTitle: string, recipients: WhatsAppRecipient[], teamId?: number | null) {
  const phones = await getPhones(
    recipients.map((r) => r.email),
    teamId,
  );
  for (const { email, phone } of phones) {
    if (!phone) continue;
    await send(phone, `✅ *${docTitle}* foi assinado por todos os participantes!`);
  }
}

export async function sendRecipientSigned(docTitle: string, recipientEmail: string, recipientName: string, teamId?: number | null) {
  const phone = await getPhone(recipientEmail, teamId);
  if (!phone) return;
  await send(phone, `✅ Você assinou *${docTitle}* com sucesso!`);
}

export async function sendDocumentRejected(docTitle: string, recipientEmail: string, reason?: string, teamId?: number) {
  const phone = await getPhone(recipientEmail, teamId);
  if (!phone) return;
  const msg = `❌ Você rejeitou *${docTitle}*.\nMotivo: ${reason || "não informado"}`;
  await send(phone, msg);
}

export async function sendWhatsAppTextToPhone(phone: string, text: string) {
  await send(phone, text);
}

async function getPhone(email: string, teamId?: number | null): Promise<string | null> {
  const recipient = await prisma.recipient.findFirst({
    where: { email },
    select: { phone: true },
    orderBy: { id: "desc" },
  });

  if (!recipient?.phone) {
    return null;
  }

  if (teamId) {
    const contact = await prisma.contact.findUnique({
      where: { teamId_email: { teamId, email } },
      select: { whatsappOptIn: true },
    });

    if (!contact?.whatsappOptIn) {
      return null;
    }
  }

  return recipient.phone;
}

async function getPhones(
  emails: string[],
  teamId?: number | null,
): Promise<{ email: string; phone: string | null }[]> {
  const recipients = await prisma.recipient.findMany({
    where: { email: { in: emails } },
    select: { email: true, phone: true },
    orderBy: { id: "desc" },
  });

  const map = new Map<string, string | null>();
  for (const r of recipients) {
    if (!map.has(r.email)) map.set(r.email, r.phone);
  }

  const result: { email: string; phone: string | null }[] = [];

  for (const email of emails) {
    const phone = map.get(email) || null;

    if (!phone) {
      result.push({ email, phone: null });
      continue;
    }

    if (teamId) {
      const contact = await prisma.contact.findUnique({
        where: { teamId_email: { teamId, email } },
        select: { whatsappOptIn: true },
      });

      if (!contact?.whatsappOptIn) {
        result.push({ email, phone: null });
        continue;
      }
    }

    result.push({ email, phone });
  }

  return result;
}
