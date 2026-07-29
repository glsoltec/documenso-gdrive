import { getSiteSettings } from '@documenso/lib/server-only/site-settings/get-site-settings';
import { SITE_SETTINGS_APP_LOGO_ID } from '@documenso/lib/server-only/site-settings/schemas/app-logo';
import { sha256 } from '@documenso/lib/universal/crypto';

import type { Route } from './+types/branding.logo.app';

const CACHE_CONTROL = 'public, max-age=0, stale-while-revalidate=86400';

export async function loader({ request }: Route.LoaderArgs) {
  const settings = await getSiteSettings();
  const appLogo = settings.find((setting) => setting.id === SITE_SETTINGS_APP_LOGO_ID);

  if (!appLogo?.enabled || !appLogo.data || !appLogo.data.contentType || !appLogo.data.content) {
    return Response.json({ status: 'error', message: 'Logo not found' }, { status: 404 });
  }

  const { contentType, content } = appLogo.data as { contentType: string; content: string };
  const buffer = Buffer.from(content, 'base64');

  const etag = `"${Buffer.from(sha256(content)).toString('hex')}"`;

  if (request.headers.get('If-None-Match') === etag) {
    return new Response(null, {
      status: 304,
      headers: { ETag: etag, 'Cache-Control': CACHE_CONTROL },
    });
  }

  return new Response(buffer, {
    headers: {
      'Content-Type': contentType,
      'Content-Length': buffer.length.toString(),
      'Cache-Control': CACHE_CONTROL,
      ETag: etag,
    },
  });
}
