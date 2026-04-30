import { machineFingerprintHash, sha256Hex } from "./fingerprint";

describe("fingerprint", () => {
  it("sha256Hex returns 64-char hex", () => {
    const out = sha256Hex("hello");
    expect(out).toMatch(/^[0-9a-f]{64}$/);
  });

  it("machineFingerprintHash is stable regardless of key order", () => {
    const a = machineFingerprintHash({ machineGuid: "A", disk: "D" });
    const b = machineFingerprintHash({ disk: "D", machineGuid: "A" });
    expect(a).toBe(b);
  });

  it("machineFingerprintHash omits null/undefined inputs", () => {
    const a = machineFingerprintHash({ machineGuid: "A", disk: null });
    const b = machineFingerprintHash({ machineGuid: "A" });
    expect(a).toBe(b);
  });
});

