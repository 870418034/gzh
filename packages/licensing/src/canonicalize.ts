/**
 * Deterministic JSON canonicalization used for signing/verifying.
 *
 * Properties are sorted lexicographically at every object level.
 * Behavior is intentionally aligned with JSON.stringify for unsupported values:
 * - object properties with `undefined` are omitted
 * - array entries that are `undefined` become `null`
 */
export function canonicalize(value: unknown): string {
  return canonicalizeInternal(value);
}

function canonicalizeInternal(value: unknown): string {
  if (value === null) return "null";

  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean") {
    return JSON.stringify(value);
  }

  if (t === "bigint") {
    // JSON doesn't support bigint; make it explicit to avoid accidental mismatch.
    throw new TypeError("canonicalize: bigint is not supported");
  }

  if (t === "undefined" || t === "function" || t === "symbol") {
    // Mirrors JSON.stringify at the top-level: returns undefined -> undefined.
    // But we need a string. Better to fail loudly for signing.
    throw new TypeError(`canonicalize: unsupported top-level type "${t}"`);
  }

  if (Array.isArray(value)) {
    const items = value.map((v) => {
      if (v === undefined || typeof v === "function" || typeof v === "symbol") {
        return "null";
      }
      return canonicalizeInternal(v);
    });
    return `[${items.join(",")}]`;
  }

  // Plain object (and other objects). We treat it as a key-value map.
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();

  const parts: string[] = [];
  for (const k of keys) {
    const v = obj[k];
    if (v === undefined || typeof v === "function" || typeof v === "symbol") {
      continue; // JSON.stringify omits these in objects
    }
    parts.push(`${JSON.stringify(k)}:${canonicalizeInternal(v)}`);
  }
  return `{${parts.join(",")}}`;
}

