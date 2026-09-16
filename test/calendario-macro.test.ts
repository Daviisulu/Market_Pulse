import { describe, expect, it } from "vitest";
import { eventiMacroPerData } from "@/lib/calendario-macro";

describe("eventiMacroPerData", () => {
  it("trova un evento FOMC noto (16 settembre 2026)", () => {
    const eventi = eventiMacroPerData(new Date("2026-09-16T10:00:00Z"));
    expect(eventi).toHaveLength(1);
    expect(eventi[0].tipo).toBe("FOMC");
  });

  it("trova un evento CPI noto (11 settembre 2026)", () => {
    const eventi = eventiMacroPerData(new Date("2026-09-11T20:00:00Z"));
    expect(eventi.some((e) => e.tipo === "CPI")).toBe(true);
  });

  it("ritorna un array vuoto per una data senza eventi noti", () => {
    expect(eventiMacroPerData(new Date("2026-09-17T10:00:00Z"))).toEqual([]);
  });

  it("confronta per data di calendario, non per istante esatto", () => {
    // Stesso giorno (2026-09-16), orari diversi nell'arco della giornata
    // italiana (08:00/12:00/22:00 locali restano lo stesso giorno UTC).
    const mattina = eventiMacroPerData(new Date("2026-09-16T06:00:00Z"));
    const sera = eventiMacroPerData(new Date("2026-09-16T20:00:00Z"));
    expect(mattina).toHaveLength(1);
    expect(sera).toHaveLength(1);
  });
});
