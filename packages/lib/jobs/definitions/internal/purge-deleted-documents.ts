import { z } from 'zod';

import type { JobDefinition } from '../../client/_internal/job';

const PURGE_DELETED_DOCUMENTS_JOB_DEFINITION_ID = 'internal.purge-deleted-documents';

const PURGE_DELETED_DOCUMENTS_JOB_DEFINITION_SCHEMA = z.object({});

export type TPurgeDeletedDocumentsJobDefinition = z.infer<
  typeof PURGE_DELETED_DOCUMENTS_JOB_DEFINITION_SCHEMA
>;

export const PURGE_DELETED_DOCUMENTS_JOB_DEFINITION = {
  id: PURGE_DELETED_DOCUMENTS_JOB_DEFINITION_ID,
  name: 'Purge soft-deleted documents (90+ days)',
  version: '1.0.0',
  trigger: {
    name: PURGE_DELETED_DOCUMENTS_JOB_DEFINITION_ID,
    schema: PURGE_DELETED_DOCUMENTS_JOB_DEFINITION_SCHEMA,
    cron: '0 3 * * *', // Daily at 03:00 UTC.
  },
  handler: async ({ payload, io }) => {
    const handler = await import('./purge-deleted-documents.handler');

    await handler.run({ payload, io });
  },
} as const satisfies JobDefinition<
  typeof PURGE_DELETED_DOCUMENTS_JOB_DEFINITION_ID,
  TPurgeDeletedDocumentsJobDefinition
>;
