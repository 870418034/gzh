import { z } from "zod";

export const LicenseFeaturesSchema = z
  .object({
    copywriting: z.boolean(),
    storyboard: z.boolean(),
    digitalHuman: z.boolean(),
    industryPopular: z.boolean(),
  })
  .strict();

export const LicenseMachineSchema = z
  .object({
    fingerprintHash: z.string().min(1),
    hint: z.string().min(1).optional(),
  })
  .strict();

export const LicenseSchema = z
  .object({
    version: z.literal(1),
    product: z.literal("aurora-union-workbench"),
    licenseId: z.string().min(1),
    issuedAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
    machine: LicenseMachineSchema,
    features: LicenseFeaturesSchema,
    signature: z.string().min(1), // base64
  })
  .strict();

export const UnsignedLicenseSchema = LicenseSchema.omit({ signature: true });

export type License = z.infer<typeof LicenseSchema>;
export type UnsignedLicense = z.infer<typeof UnsignedLicenseSchema>;

