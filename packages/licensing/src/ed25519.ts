import nacl from "tweetnacl";

function toBytes(message: string | Uint8Array): Uint8Array {
  if (typeof message === "string") return new TextEncoder().encode(message);
  return message;
}

export function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

export function base64ToBytes(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, "base64"));
}

/**
 * The "private key" here is a 32-byte Ed25519 seed.
 * (Keeps storage/transport simple for license generator tooling.)
 */
export async function getPublicKey(privateKeySeed: Uint8Array): Promise<Uint8Array> {
  if (privateKeySeed.length !== 32) {
    throw new Error(`ed25519: expected 32-byte seed, got ${privateKeySeed.length}`);
  }
  return nacl.sign.keyPair.fromSeed(privateKeySeed).publicKey;
}

export async function signEd25519(
  message: string | Uint8Array,
  privateKeySeed: Uint8Array,
): Promise<Uint8Array> {
  const msg = toBytes(message);
  if (privateKeySeed.length !== 32) {
    throw new Error(`ed25519: expected 32-byte seed, got ${privateKeySeed.length}`);
  }
  const { secretKey } = nacl.sign.keyPair.fromSeed(privateKeySeed);
  return nacl.sign.detached(msg, secretKey);
}

export async function verifyEd25519(
  signature: Uint8Array,
  message: string | Uint8Array,
  publicKey: Uint8Array,
): Promise<boolean> {
  const msg = toBytes(message);
  return nacl.sign.detached.verify(msg, signature, publicKey);
}

export async function signEd25519Base64(
  message: string | Uint8Array,
  privateKey: Uint8Array,
): Promise<string> {
  const sig = await signEd25519(message, privateKey);
  return bytesToBase64(sig);
}

export async function verifyEd25519Base64(
  signatureBase64: string,
  message: string | Uint8Array,
  publicKey: Uint8Array,
): Promise<boolean> {
  const sig = base64ToBytes(signatureBase64);
  return verifyEd25519(sig, message, publicKey);
}
