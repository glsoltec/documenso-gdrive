import { prisma } from '@documenso/prisma';
import { buildTeamWhereQuery } from '@documenso/lib/utils/teams';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';

export type UpdateRecipientContactOptions = {
  userId: number;
  teamId: number;
  recipientId: number;
  name?: string;
  email?: string;
  phone?: string | null;
};

export const updateRecipientContact = async ({
  userId,
  teamId,
  recipientId,
  name,
  email,
  phone,
}: UpdateRecipientContactOptions) => {
  const recipient = await prisma.recipient.findFirst({
    where: {
      id: recipientId,
      envelope: {
        team: buildTeamWhereQuery({ teamId, userId }),
      },
    },
    include: {
      envelope: {
        select: { id: true },
      },
    },
  });

  if (!recipient) {
    throw new AppError(AppErrorCode.NOT_FOUND, {
      message: 'Recipient not found in this team.',
    });
  }

  return await prisma.recipient.update({
    where: {
      id: recipientId,
    },
    data: {
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email }),
      ...(phone !== undefined && { phone }),
    },
  });
};
