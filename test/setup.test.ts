import { describe, expect, it } from "vitest";
import { SIGNAL_TYPES } from "@/lib/types";

describe("scaffold", () => {
  it("carica i tipi condivisi", () => {
    expect(SIGNAL_TYPES).toContain("azienda");
  });
});
