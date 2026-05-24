import crypto from 'crypto';

const SECRET_KEY = process.env.SECRET_KEY || 'gbeye_secret_dev';

/**
 * Sign a payload using HMAC-SHA256.
 * @param {string|object} payload - The event payload to sign.
 * @param {string} [secret] - Override the default secret key.
 * @returns {string} Hex-encoded HMAC-SHA256 signature.
 */
export function signPayload(payload, secret = SECRET_KEY) {
  const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Verify a payload against a given signature.
 * @param {string|object} payload - The event payload to verify.
 * @param {string} signature - The hex-encoded signature to compare.
 * @param {string} [secret] - Override the default secret key.
 * @returns {boolean} True if the signature matches.
 */
export function verifySignature(payload, signature, secret = SECRET_KEY) {
  const expected = signPayload(payload, secret);
  const expectedBuf = Buffer.from(expected, 'hex');
  const signatureBuf = Buffer.from(signature, 'hex');

  if (expectedBuf.length !== signatureBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, signatureBuf);
}
