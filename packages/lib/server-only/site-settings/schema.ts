import { z } from 'zod';

import { ZSiteSettingsAppLogoSchema } from './schemas/app-logo';
import { ZSiteSettingsBannerSchema } from './schemas/banner';
import { ZSiteSettingsEmailBlocklistSchema } from './schemas/email-blocklist';
import { ZSiteSettingsTelemetrySchema } from './schemas/telemetry';

export const ZSiteSettingSchema = z.union([
  ZSiteSettingsAppLogoSchema,
  ZSiteSettingsBannerSchema,
  ZSiteSettingsEmailBlocklistSchema,
  ZSiteSettingsTelemetrySchema,
]);

export type TSiteSettingSchema = z.infer<typeof ZSiteSettingSchema>;

export const ZSiteSettingsSchema = z.array(ZSiteSettingSchema);

export type TSiteSettingsSchema = z.infer<typeof ZSiteSettingsSchema>;
