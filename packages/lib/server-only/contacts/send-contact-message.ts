import { prisma } from '@documenso/prisma';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { sendWhatsAppTextToPhone } from '@documenso/lib/server-only/whatsapp/send-whatsapp';

export interface SendContactMessageOptions {
  userId: number;
  teamId: number;
  contactId: number;
}

export const sendContactMessage = async ({ teamId, contactId }: SendContactMessageOptions) => {
  const contact = await prisma.contact.findFirst({
    where: {
      id: contactId,
      teamId,
    },
  });

  if (!contact) {
    throw new AppError(AppErrorCode.NOT_FOUND, {
      message: 'Contact not found.',
    });
  }

  if (!contact.whatsappOptIn) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, {
      message: 'Contact has not consented to WhatsApp messages (LGPD art. 7, I).',
    });
  }

  if (!contact.phone) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, {
      message: 'Contact has no phone number.',
    });
  }

  const message = `👋 Olá ${contact.name}! Teste de notificação do sistema de assinatura digital.`;

  await sendWhatsAppTextToPhone(contact.phone, message);

  return { success: true };
};
