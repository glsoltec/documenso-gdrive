import { env } from '../utils/env';

export const DOCUMENSO_ENCRYPTION_KEY = env('NEXT_PRIVATE_ENCRYPTION_KEY');

export const DOCUMENSO_ENCRYPTION_SECONDARY_KEY = env('NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY');

/**
 * LGPD (art. 46-49) — segurança da informação. O aplicativo se recusa a
 * inicializar em produção com chaves de criptografia ausentes, iguais ou
 * iguais aos defaults de fábrica, evitando sigilo de documentos comprometido.
 */
export const assertStrongEncryptionKeys = () => {
  if (typeof window !== 'undefined') {
    return;
  }

  if (!DOCUMENSO_ENCRYPTION_KEY || !DOCUMENSO_ENCRYPTION_SECONDARY_KEY) {
    throw new Error('Missing DOCUMENSO_ENCRYPTION_KEY or DOCUMENSO_ENCRYPTION_SECONDARY_KEY keys');
  }

  if (DOCUMENSO_ENCRYPTION_KEY === DOCUMENSO_ENCRYPTION_SECONDARY_KEY) {
    throw new Error('DOCUMENSO_ENCRYPTION_KEY and DOCUMENSO_ENCRYPTION_SECONDARY_KEY cannot be equal');
  }

  const weakKeys = new Set(['CAFEBABE', 'DEADBEEF', 'secret']);

  if (weakKeys.has(DOCUMENSO_ENCRYPTION_KEY) || weakKeys.has(DOCUMENSO_ENCRYPTION_SECONDARY_KEY)) {
    throw new Error(
      'Weak encryption key detected. Generate strong random keys and set NEXT_PRIVATE_ENCRYPTION_KEY / NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY.',
    );
  }
};
