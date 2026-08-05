import { prisma } from '@documenso/prisma';

export interface FindContactsOptions {
  userId: number;
  teamId: number;
}

export const findContacts = async ({ userId, teamId }: FindContactsOptions) => {
  return await prisma.contact.findMany({
    where: {
      teamId,
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
};
