import { prisma } from '@documenso/prisma';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';

export interface CreateContactOptions {
  userId: number;
  teamId: number;
  email: string;
  name: string;
  phone?: string | null;
  whatsappOptIn?: boolean;
  whatsappOptInSource?: string | null;
}

export const createContact = async ({
  userId,
  teamId,
  email,
  name,
  phone,
  whatsappOptIn = false,
  whatsappOptInSource = null,
}: CreateContactOptions) => {
  const existing = await prisma.contact.findUnique({
    where: {
      teamId_email: { teamId, email },
    },
  });

  if (existing) {
    throw new AppError(AppErrorCode.ALREADY_EXISTS, {
      message: 'A contact with this email already exists in this team.',
    });
  }

  return await prisma.contact.create({
    data: {
      email,
      name,
      phone,
      teamId,
      whatsappOptIn,
      whatsappOptInAt: whatsappOptIn ? new Date() : null,
      whatsappOptInSource,
    },
  });
};