import { z } from 'zod';

import { ZSiteSettingsBaseSchema } from './_base';

export const SITE_SETTINGS_APP_LOGO_ID = 'site.app-logo';

export const ZSiteSettingsAppLogoSchema = ZSiteSettingsBaseSchema.extend({
  id: z.literal(SITE_SETTINGS_APP_LOGO_ID),
  data: z
    .object({
      contentType: z.string(),
      content: z.string(),
    })
    .optional()
    .default({
      contentType: '',
      content: '',
    }),
});

export type TSiteSettingsAppLogoSchema = z.infer<typeof ZSiteSettingsAppLogoSchema>;
