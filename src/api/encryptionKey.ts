// §4b key management: fetches and caches the active AES-256 key so crypto.ts
// can encrypt/decrypt without every call site knowing about key exchange.
// Deliberately bypasses apiSlice/RTK Query via a plain fetch — apiBaseQuery
// itself depends on this module, so going through apiSlice would be
// circular, and /encryption/current-key is the one endpoint exempt from
// payload encryption anyway (see backend PHASE1_BACKEND_DEVELOPMENT.md §4b).

import { API_BASE_URL } from "@/lib/env";

interface CurrentKeyEnvelope {
  data: { keyVersion: number; key: string };
}

interface CachedKey {
  version: number;
  cryptoKey: CryptoKey;
}

let cached: CachedKey | null = null;
let inFlight: Promise<CachedKey> | null = null;

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function fetchCurrentKey(): Promise<CachedKey> {
  const response = await fetch(`${API_BASE_URL}/encryption/current-key`, { credentials: "include" });
  if (!response.ok) {
    throw new Error(`Failed to fetch the current encryption key (HTTP ${response.status}).`);
  }
  const envelope = (await response.json()) as CurrentKeyEnvelope;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    base64ToBytes(envelope.data.key),
    "AES-GCM",
    false,
    ["encrypt", "decrypt"],
  );
  return { version: envelope.data.keyVersion, cryptoKey };
}

// Returns the cached key, fetching it first if nothing's cached yet.
// Concurrent callers share one in-flight fetch rather than firing several.
export async function getCachedOrFetchKey(): Promise<CachedKey> {
  if (cached) return cached;
  if (!inFlight) {
    inFlight = fetchCurrentKey().then(
      (key) => {
        cached = key;
        inFlight = null;
        return key;
      },
      (error: unknown) => {
        inFlight = null;
        throw error;
      },
    );
  }
  return inFlight;
}

// A response tagged with a key version we don't have cached means the
// server rotated since we last fetched — refetch and replace the cache,
// per the doc's "re-fetch on a newer key version" behavior.
export async function getKeyForVersion(version: number): Promise<CryptoKey> {
  const current = await getCachedOrFetchKey();
  if (current.version === version) return current.cryptoKey;

  cached = null;
  const refreshed = await getCachedOrFetchKey();
  if (refreshed.version === version) return refreshed.cryptoKey;

  // The server only ever encrypts responses with its currently active key,
  // so a version that's still unavailable after a refetch means something
  // is genuinely wrong (e.g. a request that raced two rotations), not just
  // a normal one-rotation-behind client.
  throw new Error(`No encryption key available for version ${version} (current is ${refreshed.version}).`);
}

// Called on logout so a stale key doesn't linger into the next login.
export function resetEncryptionKeyCache() {
  cached = null;
  inFlight = null;
}
