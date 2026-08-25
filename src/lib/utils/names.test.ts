import { describe, expect, it } from "vitest";
import { maskDisplayName } from "./names";

describe("maskDisplayName", () => {
  it("masks a two-part name to first name + last initial", () => {
    expect(maskDisplayName("Chidinma Okafor")).toBe("Chidinma O.");
  });

  it("keeps the first and last of a multi-part name", () => {
    expect(maskDisplayName("John Paul Adeyemi")).toBe("John A.");
  });

  it("returns a single-word name unchanged", () => {
    expect(maskDisplayName("Beyonce")).toBe("Beyonce");
  });

  it("trims surrounding whitespace", () => {
    expect(maskDisplayName("  Jane Doe  ")).toBe("Jane D.");
  });
});
