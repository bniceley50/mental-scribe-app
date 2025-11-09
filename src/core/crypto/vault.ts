/**
 * Client-side encryption for PHI
 * Uses WebCrypto API with AES-GCM and PBKDF2 key derivation
 * 
 * SECURITY: All PHI is encrypted at rest in IndexedDB
 * Passphrase never stored, only the salt for key derivation
 */

const ITERATIONS = 200_000; // PBKDF2 iterations for key derivation
const KEY_LENGTH = 256; // AES-256

export interface EncryptedData {
  iv: number[]; // Initialization vector
  ct: number[]; // Ciphertext
  salt?: number[]; // Salt (included on first encryption)
}

export interface Vault {
  dek: CryptoKey; // Data Encryption Key
  salt: Uint8Array;
}

/**
 * Create a new vault with a passphrase
 * Returns DEK and salt (store salt, NEVER store passphrase)
 */
export async function createVault(passphrase: string): Promise<Vault> {
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  const dek = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: KEY_LENGTH },
    true,
    ["encrypt", "decrypt"]
  );

  return { dek, salt };
}

/**
 * Unlock an existing vault with passphrase and salt
 */
export async function unlockVault(
  passphrase: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  const dek = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: KEY_LENGTH },
    true,
    ["encrypt", "decrypt"]
  );

  return dek;
}

/**
 * Encrypt data with DEK
 */
export async function encrypt(
  dek: CryptoKey,
  data: unknown
): Promise<EncryptedData> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(data));

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    dek,
    plaintext
  );

  return {
    iv: Array.from(iv),
    ct: Array.from(new Uint8Array(ciphertextBuffer)),
  };
}

/**
 * Decrypt data with DEK
 */
export async function decrypt<T = unknown>(
  dek: CryptoKey,
  encrypted: EncryptedData
): Promise<T> {
  const iv = new Uint8Array(encrypted.iv);
  const ciphertext = new Uint8Array(encrypted.ct);

  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    dek,
    ciphertext
  );

  const decoded = new TextDecoder().decode(plaintextBuffer);
  return JSON.parse(decoded) as T;
}

/**
 * Verify passphrase by attempting decryption
 */
export async function verifyPassphrase(
  passphrase: string,
  salt: Uint8Array,
  testData: EncryptedData
): Promise<boolean> {
  try {
    const dek = await unlockVault(passphrase, salt);
    await decrypt(dek, testData);
    return true;
  } catch {
    return false;
  }
}
