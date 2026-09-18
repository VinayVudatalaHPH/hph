// §4b (application-level payload encryption). Every request/response body is
// AES-256-GCM encrypted except key exchange itself — mirrors
// backend/app/encryption/hooks.py's ENCRYPTION_EXEMPT_PATHS exactly: it
// can't encrypt the very key used to decrypt. Login is encrypted like
// everything else, since key exchange is reachable pre-login (see
// backend/app/sessions/hooks.py's EXEMPT_PATHS) specifically so a brand-new
// client can fetch that key before its very first request.

import { getCachedOrFetchKey, getKeyForVersion } from "./encryptionKey";

const NONCE_SIZE = 12; // 96-bit, matches backend/app/encryption/crypto.py

const EXEMPT_PATHS = new Set(["GET /encryption/current-key"]);

export function isEncryptionExempt(method: string, url: string): boolean {
  return EXEMPT_PATHS.has(`${method} ${url}`);
}

export interface EncryptedRequestBody {
  bytes: Uint8Array;
  keyVersion: number;
}

// Wire format is nonce (12 bytes) + ciphertext+tag, matching the backend's
// cryptography.hazmat AESGCM output exactly — Web Crypto's AES-GCM also
// appends a 16-byte tag to the ciphertext by default, so the two are
// directly interoperable with no format translation needed.
export async function encryptRequestBody(bodyJson: unknown): Promise<EncryptedRequestBody> {
  const { version, cryptoKey } = await getCachedOrFetchKey();
  const plaintext = new TextEncoder().encode(JSON.stringify(bodyJson));
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_SIZE));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, cryptoKey, plaintext);

  const combined = new Uint8Array(nonce.length + ciphertext.byteLength);
  combined.set(nonce, 0);
  combined.set(new Uint8Array(ciphertext), nonce.length);
  return { bytes: combined, keyVersion: version };
}

export async function decryptResponseBody(bytes: Uint8Array, keyVersionHeader: string | null): Promise<unknown> {
  if (keyVersionHeader === null) {
    throw new Error("Encrypted response is missing its X-Encryption-Key-Version header.");
  }
  const cryptoKey = await getKeyForVersion(Number(keyVersionHeader));
  const nonce = bytes.slice(0, NONCE_SIZE);
  const ciphertext = bytes.slice(NONCE_SIZE);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, cryptoKey, ciphertext);
  return JSON.parse(new TextDecoder().decode(plaintext)) as unknown;
}
