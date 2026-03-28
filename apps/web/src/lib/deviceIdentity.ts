const deviceKeys = new Map<string, CryptoKeyPair>();

export async function createDeviceIdentity(deviceId: string) {
  const pair = await crypto.subtle.generateKey(
    {
      name: "Ed25519"
    },
    true,
    ["sign", "verify"]
  );

  deviceKeys.set(deviceId, pair);

  const publicKey = await crypto.subtle.exportKey("spki", pair.publicKey);
  return {
    deviceId,
    publicKey: bytesToBase64(new Uint8Array(publicKey))
  };
}

export async function signDeviceProof(deviceId: string, proof: string) {
  const pair = deviceKeys.get(deviceId);
  if (!pair) {
    throw new Error("Device keypair not found in memory. Redeem the invite again on this device.");
  }

  const signature = await crypto.subtle.sign(
    "Ed25519",
    pair.privateKey,
    new TextEncoder().encode(`${deviceId}:${proof}`)
  );

  return bytesToBase64(new Uint8Array(signature));
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const value of bytes) {
    binary += String.fromCharCode(value);
  }

  return btoa(binary);
}
