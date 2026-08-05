import { buildTeamWhereQuery } from '@documenso/lib/utils/teams';
import { prisma } from '@documenso/prisma';
import { EnvelopeType, Prisma } from '@prisma/client';

export type GetRecipientSuggestionsOptions = {
  userId: number;
  teamId: number;
  query: string;
};

export const getRecipientSuggestions = async ({ userId, teamId, query }: GetRecipientSuggestionsOptions) => {
  const trimmedQuery = query.trim();

  const nameEmailFilter = trimmedQuery
    ? {
        OR: [
          {
            name: {
              contains: trimmedQuery,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            email: {
              contains: trimmedQuery,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ],
      }
    : {};

  const recipients = await prisma.recipient.findMany({
    where: {
      envelope: {
        type: EnvelopeType.DOCUMENT,
        team: buildTeamWhereQuery({ teamId, userId }),
      },
      ...nameEmailFilter,
    },
    select: {
      name: true,
      email: true,
      phone: true,
      envelope: {
        select: {
          createdAt: true,
        },
      },
    },
    distinct: ['email'],
    orderBy: {
      envelope: {
        createdAt: 'desc',
      },
    },
    take: 5,
  });

  const contacts = await prisma.contact.findMany({
    where: {
      teamId,
      ...nameEmailFilter,
    },
    select: { name: true, email: true, phone: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  const mergeContacts = (
    suggestions: { name: string | null; email: string; phone: string | null }[],
  ) => {
    const existingEmails = new Set(suggestions.map((suggestion) => suggestion.email.toLowerCase()));

    const newContacts = contacts.filter((contact) => !existingEmails.has(contact.email.toLowerCase()));

    return [...suggestions, ...newContacts].slice(0, 8);
  };

  if (teamId) {
    const teamMembers = await prisma.organisationMember.findMany({
      where: {
        user: {
          ...nameEmailFilter,
          NOT: { id: userId },
        },
        organisationGroupMembers: {
          some: {
            group: {
              teamGroups: {
                some: { teamId },
              },
            },
          },
        },
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
      take: 5,
    });

    const uniqueTeamMember = teamMembers.find((member) => !recipients.some((r) => r.email === member.user.email));

    if (uniqueTeamMember) {
      const teamMemberSuggestion = {
        email: uniqueTeamMember.user.email,
        name: uniqueTeamMember.user.name,
        phone: null,
      };

      const allSuggestions = [...recipients.slice(0, 4), teamMemberSuggestion];

      return mergeContacts(allSuggestions);
    }
  }

  return mergeContacts(recipients);
};
