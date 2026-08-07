import { AppError } from '@documenso/lib/errors/app-error';
import type { Context, MiddlewareHandler } from 'hono';

import { AuthenticationErrorCode } from '../errors/error-codes';
import { getCsrfCookie } from '../session/session-cookies';

/**
 * Defense-in-depth CSRF protection for state-changing authentication routes.
 *
 * Validates that the `csrfToken` sent in the JSON body matches the signed CSRF
 * cookie. This is required because the session cookie uses `SameSite=None`
 * in production, meaning browsers will send it on cross-site requests. The
 * origin check alone is not sufficient since some clients may omit the Origin
 * header.
 */
export function requireCsrfToken(headerName = 'X-CSRF-Token'): MiddlewareHandler {
  return async (c: Context, next) => {
    const csrfToken = c.req.header(headerName);

    if (!csrfToken) {
      throw new AppError(AuthenticationErrorCode.InvalidRequest, {
        message: 'Missing CSRF token',
      });
    }

    const csrfCookieToken = await getCsrfCookie(c);

    if (!csrfCookieToken || csrfToken !== csrfCookieToken) {
      throw new AppError(AuthenticationErrorCode.InvalidRequest, {
        message: 'Invalid CSRF token',
      });
    }

    await next();
  };
}