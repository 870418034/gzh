import { canonicalize } from "./canonicalize";
import { signEd25519Base64, verifyEd25519Base64 } from "./ed25519";
import { LicenseSchema, UnsignedLicenseSchema, type License, type UnsignedLicense } from "./schema";

export function canonicalizeLicenseForSigning(license: UnsignedLicense | License): string {
  // Never sign/verify the signature field itself.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { signature: _sig, ...rest } = license as License;
  return canonicalize(rest);
}

export function parseUnsignedLicense(input: unknown): UnsignedLicense {
  return UnsignedLicenseSchema.parse(input);
}

export function parseLicense(input: unknown): License {
  return LicenseSchema.parse(input);
}

export async function signLicense(
  unsigned: UnsignedLicense,
  privateKey: Uint8Array,
): Promise<License> {
  const payload = canonicalizeLicenseForSigning(unsigned);
  const signature = await signEd25519Base64(payload, privateKey);
  const license: License = { ...unsigned, signature };
  // Validate final shape too.
  return LicenseSchema.parse(license);
}

export async function verifyLicenseSignature(
  license: License,
  publicKey: Uint8Array,
): Promise<boolean> {
  const payload = canonicalizeLicenseForSigning(license);
  return verifyEd25519Base64(license.signature, payload, publicKey);
}

