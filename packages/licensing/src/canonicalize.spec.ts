import { canonicalize } from "./canonicalize";

describe("canonicalize", () => {
  it("sorts object keys recursively", () => {
    const input = { b: 1, a: 2, c: { z: 1, y: 2 } };
    expect(canonicalize(input)).toBe('{"a":2,"b":1,"c":{"y":2,"z":1}}');
  });

  it("keeps array order and canonicalizes values", () => {
    const input = [{ b: 1, a: 2 }, 3, "x"];
    expect(canonicalize(input)).toBe('[{"a":2,"b":1},3,"x"]');
  });

  it("omits undefined in objects but converts undefined array entries to null", () => {
    const input = { a: undefined as unknown as number, b: [1, undefined] };
    expect(canonicalize(input)).toBe('{"b":[1,null]}');
  });
});

