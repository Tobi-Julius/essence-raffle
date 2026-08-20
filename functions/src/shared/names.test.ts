import { describe, expect, it } from "vitest";
import { maskName } from "./names";

describe("maskName", () => {
  it("masks a two-part name to first name + last initial", () => {
    expect(maskName("Chidinma Okafor")).toBe("Chidinma O.");
  });

  it("keeps the first and last of a multi-part name", () => {
    expect(maskName("John Paul Adeyemi")).toBe("John A.");
  });

  it("returns a single-word name unchanged", () => {
    expect(maskName("Beyonce")).toBe("Beyonce");
  });

  it("trims surrounding whitespace", () => {
    expect(maskName("  Jane Doe  ")).toBe("Jane D.");
  });
});
