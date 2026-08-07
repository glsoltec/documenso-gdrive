import { createContact } from '@documenso/lib/server-only/contacts/create-contact';
import { deleteContact } from '@documenso/lib/server-only/contacts/delete-contact';
import { findContacts } from '@documenso/lib/server-only/contacts/find-contacts';
import { sendContactMessage } from '@documenso/lib/server-only/contacts/send-contact-message';
import { updateContact } from '@documenso/lib/server-only/contacts/update-contact';

import { ZGenericSuccessResponse, ZSuccessResponseSchema } from '../schema';
import { authenticatedProcedure, router } from '../trpc';
import {
  ZCreateContactRequestSchema,
  ZCreateContactResponseSchema,
  ZDeleteContactRequestSchema,
  ZFindContactsResponseSchema,
  ZSendContactMessageRequestSchema,
  ZSendContactMessageResponseSchema,
  ZUpdateContactRequestSchema,
  ZUpdateContactResponseSchema,
} from './schema';

export const contactRouter = router({
  find: authenticatedProcedure
    .output(ZFindContactsResponseSchema)
    .query(async ({ ctx }) => {
      const { teamId, user } = ctx;

      const contacts = await findContacts({
        userId: user.id,
        teamId,
      });

      return { contacts };
    }),

  create: authenticatedProcedure
    .input(ZCreateContactRequestSchema)
    .output(ZCreateContactResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const { teamId, user } = ctx;
      const { email, name, phone, whatsappOptIn, whatsappOptInSource } = input;

      return await createContact({
        userId: user.id,
        teamId,
        email,
        name,
        phone,
        whatsappOptIn,
        whatsappOptInSource,
      });
    }),

  update: authenticatedProcedure
    .input(ZUpdateContactRequestSchema)
    .output(ZUpdateContactResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const { teamId, user } = ctx;
      const { id, ...data } = input;

      return await updateContact({
        userId: user.id,
        teamId,
        contactId: id,
        ...data,
      });
    }),

  delete: authenticatedProcedure
    .input(ZDeleteContactRequestSchema)
    .output(ZSuccessResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const { teamId, user } = ctx;
      const { id } = input;

      await deleteContact({
        userId: user.id,
        teamId,
        contactId: id,
      });

      return ZGenericSuccessResponse;
    }),

  sendMessage: authenticatedProcedure
    .input(ZSendContactMessageRequestSchema)
    .output(ZSendContactMessageResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const { teamId, user } = ctx;
      const { id } = input;

      return await sendContactMessage({
        userId: user.id,
        teamId,
        contactId: id,
      });
    }),
});
