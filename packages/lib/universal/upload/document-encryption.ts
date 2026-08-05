import { DOCUMENSO_ENCRYPTION_KEY } from '@documenso/lib/constants/crypto';
import { env } from '@documenso/lib/utils/env';
import { symmetricDecrypt, symmetricEncrypt } from '@documenso/lib/universal/crypto';

/**
 * At-rest document encryption (LGPD art. 46-49) for the database storage
 * transport (`DocumentDataType.BYTES_64`).
 *
 * Enabled via `NEXT_PRIVATE_DOCUMENT_ENCRYPTION_ENABLED=true`. When on, document
 * contents are encrypted with XChaCha20-Poly1305 and stored with a version
 * prefix. Legacy records (no prefix) are read transparently, so enabling this
 * never breaks previously saved documents.
 */
export const DOCUMENT_ENCRYPTION_PREFIX = 'enc:v1:';

export const isDocumentEncryptionEnabled = () => env('NEXT_PRIVATE_DOCUMENT_ENCRYPTION_ENABLED') === 'true';

export const encryptDocumentData = (asciiBase64Data: string): string => {
  if (!isDocumentEncryptionEnabled() || !DOCUMENSO_ENCRYPTION_KEY) {
    return asciiBase64Data;
  }

  const ciphertext = symmetricEncrypt({ key: DOCUMENSO_ENCRYPTION_KEY, data: asciiBase64Data });

  return `${DOCUMENT_ENCRYPTION_PREFIX}${ciphertext}`;
};

export const decryptDocumentData = (data: string): string => {
  if (data.startsWith(DOCUMENT_ENCRYPTION_PREFIX) && DOCUMENSO_ENCRYPTION_KEY) {
    const ciphertext = data.slice(DOCUMENT_ENCRYPTION_PREFIX.length);

    return new TextDecoder().decode(
      symmetricDecrypt({ key: DOCUMENSO_ENCRYPTION_KEY, data: ciphertext }),
    );
  }

  return data;
};