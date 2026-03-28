import { EMPTY_DRAFT_VAULT, type DraftVaultState } from "../domain/drafts";

const VAULT_STORAGE_KEY = "sy-ph3r.localVault";
const PBKDF2_ITERATIONS = 250_000;

type StoredVaultPayload = {
  version: 1;
  salt: string;
  iv: string;
  ciphertext: string;
};

export async function saveDraftVault(
  passphrase: string,
  state: DraftVaultState
) {
  const salt = copyBytes(crypto.getRandomValues(new Uint8Array(16)));
  const iv = copyBytes(crypto.getRandomValues(new Uint8Array(12)));
  const key = await deriveKey(passphrase, salt);
  const encoded = new TextEncoder().encode(JSON.stringify(state));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);

  const payload: StoredVaultPayload = {
    version: 1,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext))
  };

  localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(payload));
}

export async function loadDraftVault(passphrase: string) {
  const raw = localStorage.getItem(VAULT_STORAGE_KEY);
  if (!raw) {
    return EMPTY_DRAFT_VAULT;
  }

  const payload = JSON.parse(raw) as StoredVaultPayload;
  const salt = copyBytes(base64ToBytes(payload.salt));
  const iv = copyBytes(base64ToBytes(payload.iv));
  const ciphertext = copyBytes(base64ToBytes(payload.ciphertext));
  const key = await deriveKey(passphrase, salt);

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );

    return JSON.parse(new TextDecoder().decode(decrypted)) as DraftVaultState;
  } catch {
    throw new Error("Could not unlock local vault. Check the local unlock phrase.");
  }
}

export function hasStoredDraftVault() {
  return localStorage.getItem(VAULT_STORAGE_KEY) !== null;
}

async function deriveKey(passphrase: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: toArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256"
    },
    material,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    ["encrypt", "decrypt"]
  );
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const value of bytes) {
    binary += String.fromCharCode(value);
  }

  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function copyBytes(bytes: Uint8Array) {
  return Uint8Array.from(bytes);
}

function toArrayBuffer(bytes: Uint8Array) {
  const copy = Uint8Array.from(bytes);
  return copy.buffer as ArrayBuffer;
}
