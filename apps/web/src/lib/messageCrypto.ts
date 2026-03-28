type SerializedCipherEnvelope = {
  alg: "AES-GCM";
  iv: string;
  ciphertext: string;
};

const ROOM_KEY_ITERATIONS = 250_000;
const ROOM_KEY_SALT = new TextEncoder().encode("sy-ph3r-room-key-v1");

export async function encryptRoomMessage(roomSecret: string, plaintext: string) {
  const key = await deriveRoomKey(roomSecret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);

  const payload: SerializedCipherEnvelope = {
    alg: "AES-GCM",
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext))
  };

  return JSON.stringify(payload);
}

export async function decryptRoomMessage(roomSecret: string, payload: string) {
  const envelope = JSON.parse(payload) as SerializedCipherEnvelope;
  const key = await deriveRoomKey(roomSecret);
  const decrypted = await crypto.subtle.decrypt(
    {
      name: envelope.alg,
      iv: base64ToBytes(envelope.iv)
    },
    key,
    base64ToBytes(envelope.ciphertext)
  );

  return new TextDecoder().decode(decrypted);
}

async function deriveRoomKey(roomSecret: string) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(roomSecret),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: toArrayBuffer(ROOM_KEY_SALT),
      iterations: ROOM_KEY_ITERATIONS,
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

function toArrayBuffer(bytes: Uint8Array) {
  const copy = Uint8Array.from(bytes);
  return copy.buffer as ArrayBuffer;
}
