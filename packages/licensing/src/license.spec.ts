import { getPublicKey } from "./ed25519";
import { canonicalizeLicenseForSigning, signLicense, verifyLicenseSignature } from "./license";
import { type UnsignedLicense, UnsignedLicenseSchema } from "./schema";

describe("license signing", () => {
  const privateKey = new Uint8Array(32).fill(7);

  const unsigned: UnsignedLicense = UnsignedLicenseSchema.parse({
    version: 1,
    product: "aurora-union-workbench",
    licenseId: "test-license",
    issuedAt: "2026-04-29T00:00:00.000Z",
    expiresAt: "2027-04-29T00:00:00.000Z",
    machine: {
      fingerprintHash: "deadbeef",
    },
    features: {
      copywriting: true,
      storyboard: true,
      digitalHuman: false,
      industryPopular: true,
    },
  });

  it("canonicalizeLicenseForSigning omits signature", () => {
    const payload = canonicalizeLicenseForSigning({ ...unsigned, signature: "abc" } as any);
    expect(payload).not.toContain("signature");
  });

  it("signs and verifies a license", async () => {
    const publicKey = await getPublicKey(privateKey);
    const signed = await signLicense(unsigned, privateKey);
    expect(signed.signature).toBeTruthy();

    const ok = await verifyLicenseSignature(signed, publicKey);
    expect(ok).toBe(true);
  });

  it("verification fails if payload is modified", async () => {
    const publicKey = await getPublicKey(privateKey);
    const signed = await signLicense(unsigned, privateKey);
    const tampered = { ...signed, licenseId: "tampered" };
    const ok = await verifyLicenseSignature(tampered, publicKey);
    expect(ok).toBe(false);
  });
});

