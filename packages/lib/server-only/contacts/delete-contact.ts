import { prisma } from '@documenso/prisma';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';

export interface DeleteContactOptions {
  userId: number;
  teamId: number;
  contactId: number;
}

export const deleteContact = async ({ userId, teamId, contactId }: DeleteContactOptions) => {
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

  await prisma.contact.delete({
    where: { id: contactId },
  });
};
