import { prisma } from '@documenso/prisma';
import { DateTime } from 'luxon';

import type { JobRunIO } from '../../client/_internal/job';
import type { TPurgeDeletedDocumentsJobDefinition } from './purge-deleted-documents';

const BATCH_SIZE = 100;
const RETENTION_DAYS = 90;

export const run = async ({
  payload: _payload,
  io,
}: {
  payload: TPurgeDeletedDocumentsJobDefinition;
  io: JobRunIO;
}) => {
  const cutoff = DateTime.now().minus({ days: RETENTION_DAYS }).toJSDate();

  let totalPurged = 0;

  let batch = await findBatch(cutoff);

  while (batch.length > 0) {
    await prisma.envelope.deleteMany({
      where: {
        id: { in: batch },
      },
    });

    totalPurged += batch.length;

    batch = await findBatch(cutoff);
  }

  if (totalPurged > 0) {
    io.logger.info(`Purged ${totalPurged} soft-deleted documents (older than ${RETENTION_DAYS} days)`);
  } else {
    io.logger.info('No soft-deleted documents to purge');
  }
};

const findBatch = async (cutoff: Date): Promise<string[]> => {
  const rows = await prisma.envelope.findMany({
    where: {
      deletedAt: { lt: cutoff },
    },
    select: { id: true },
    take: BATCH_SIZE,
    orderBy: { deletedAt: 'asc' },
  });

  return rows.map((r) => r.id);
};
