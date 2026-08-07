const BLACKLISTED_CPFS = new Set([
  '00000000000',
  '11111111111',
  '22222222222',
  '33333333333',
  '44444444444',
  '55555555555',
  '66666666666',
  '77777777777',
  '88888888888',
  '99999999999',
]);

/**
 * Validate a Brazilian CPF (Cadastro de Pessoas Fisicas) number using the
 * modulo-11 check-digit algorithm.
 *
 * Strips non-numeric characters, rejects blacklisted pan-digital sequences,
 * and verifies both check digits. Returns `false` for strings shorter/longer
 * than 11 digits after cleaning.
 */
export function validateCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');

  if (digits.length !== 11) {
    return false;
  }

  if (BLACKLISTED_CPFS.has(digits)) {
    return false;
  }

  let sum = 0;

  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i]) * (10 - i);
  }

  let remainder = (sum * 10) % 11;

  if (remainder === 10) {
    remainder = 0;
  }

  if (remainder !== parseInt(digits[9])) {
    return false;
  }

  sum = 0;

  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits[i]) * (11 - i);
  }

  remainder = (sum * 10) % 11;

  if (remainder === 10) {
    remainder = 0;
  }

  return remainder === parseInt(digits[10]);
}

/**
 * Mask a CPF for safe audit-log display, keeping only the last block.
 * "52998224725" -> "***.247.**"
 */
export function maskCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');

  if (digits.length !== 11) {
    return '***';
  }

  return `***.${digits.slice(3, 6)}.**`;
}
