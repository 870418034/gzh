import { createHash } from "node:crypto";
import { canonicalize } from "./canonicalize";

export function sha256Hex(data: string | Uint8Array): string {
  const h = createHash("sha256");
  h.update(typeof data === "string" ? data : Buffer.from(data));
  return h.digest("hex");
}

/**
 * Compute a stable machine fingerprint hash.
 *
 * Input is intentionally generic: the caller decides how to collect machine identifiers
 * (Windows MachineGuid / disk serial / CPU info / etc). This function only:
 * 1) canonicalizes the identifiers as sorted JSON
 * 2) hashes them with SHA-256
 */
export function machineFingerprintHash(
  identifiers: Record<string, string | null | undefined>,
): string {
  // omit null/undefined to reduce accidental mismatch between collectors
  const normalized: Record<string, string> = {};
  for (const [k, v] of Object.entries(identifiers)) {
    if (v == null) continue;
    normalized[k] = v;
  }
  const payload = canonicalize(normalized);
  return sha256Hex(payload);
}

