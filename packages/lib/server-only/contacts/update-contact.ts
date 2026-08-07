import { prisma } from '@documenso/prisma';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';

export interface UpdateContactOptions {
  userId: number;
  teamId: number;
  contactId: number;
  email?: string;
  name?: string;
  phone?: string | null;
  whatsappOptIn?: boolean;
  whatsappOptInSource?: string | null;
}

export const updateContact = async ({ userId, teamId, contactId, email, name, phone, whatsappOptIn, whatsappOptInSource }: UpdateContactOptions) => {
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

  return await prisma.contact.update({
    where: { id: contactId },
    data: {
      ...(email !== undefined && { email }),
      ...(name !== undefined && { name }),
      ...(phone !== undefined && { phone }),
      ...(whatsappOptIn !== undefined && {
        whatsappOptIn,
        whatsappOptInAt: whatsappOptIn ? new Date() : null,
        whatsappOptInSource,
      }),
    },
  });
};
