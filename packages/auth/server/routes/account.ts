import { Hono } from 'hono';
import superjson from 'superjson';

import { deleteAccountProvider } from '../lib/utils/delete-account-provider';
import { getAccounts } from '../lib/utils/get-accounts';
import { requireCsrfToken } from '../lib/utils/require-csrf-token';
import type { HonoAuthContext } from '../types/context';

export const accountRoute = new Hono<HonoAuthContext>()
  /**
   * Get all linked accounts.
   */
  .get('/accounts', async (c) => {
    const accounts = await getAccounts(c);

    return c.json(superjson.serialize({ accounts }));
  })
  /**
   * Delete an account linking method.
   */
  .delete('/account/:accountId', requireCsrfToken(), async (c) => {
    const accountId = c.req.param('accountId');

    await deleteAccountProvider(c, accountId);

    return c.json({ success: true });
  });
