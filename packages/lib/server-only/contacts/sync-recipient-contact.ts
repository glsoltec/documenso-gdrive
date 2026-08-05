import { prisma } from '@documenso/prisma';

export type SyncRecipientContactOptions = {
  teamId: number;
  email: string;
  name: string;
  phone?: string | null;
};

/**
 * Creates or updates a team Contact from a document recipient's data.
 *
 * Only runs when a phone number is present, since contacts without a phone
 * are not useful for WhatsApp notifications. Uses the unique (teamId, email)
 * constraint to avoid duplicates.
 */
export const syncRecipientContact = async ({ teamId, email, name, phone }: SyncRecipientContactOptions) => {
  if (!phone) {
    return null;
  }

  const existing = await prisma.contact.findUnique({
    where: {
      teamId_email: { teamId, email },
    },
    select: {
      id: true,
      name: true,
      phone: true,
    },
  });

  if (existing) {
    const nameChanged = existing.name !== name;
    const phoneChanged = existing.phone !== phone;

    if (!nameChanged && !phoneChanged) {
      return existing;
    }

    return await prisma.contact.update({
      where: { id: existing.id },
      data: {
        name,
        phone,
      },
    });
  }

  return await prisma.contact.create({
    data: {
      teamId,
      email,
      name,
      phone,
    },
  });
};

/**
 * Syncs all recipients with a phone number into the team's contacts.
 */
export const syncRecipientsToContacts = async ({
  teamId,
  recipients,
}: {
  teamId: number;
  recipients: { email: string; name: string; phone?: string | null }[];
}) => {
  await Promise.all(
    recipients
      .filter((recipient) => Boolean(recipient.phone))
      .map((recipient) =>
        syncRecipientContact({
          teamId,
          email: recipient.email,
          name: recipient.name,
          phone: recipient.phone,
        }),
      ),
  );
};
