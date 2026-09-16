// Lista curata di eventi macro noti in anticipo — stesso principio
// delle mappe ticker/feed RSS già in uso nel resto del progetto ("lista
// piccola e verificata" invece di una fonte automatica fragile). Un
// picco di attenzione che coincide con un evento programmato è meno
// "sorprendente" di uno che spunta dal nulla, utile per interpretare i
// segnali del giorno (vedi docs/idee-indicatori.md).
//
// Fonti primarie, verificate il 2026-09-16:
// - FOMC: federalreserve.gov/monetarypolicy/fomccalendars.htm — le
//   date oltre la prossima riunione sono dichiarate "tentative" dalla
//   Fed stessa, confermate solo alla riunione immediatamente
//   precedente. Segnato il secondo giorno di ogni riunione (quello in
//   cui viene comunicata la decisione).
// - CPI/NFP: bls.gov/schedule/news_release/{cpi,empsit}.htm — dati
//   riferiti al mese precedente. Il calendario 2027 non era ancora
//   pubblicato da BLS a questa data.
//
// Da aggiornare quando BLS pubblica il 2027 e quando la Fed conferma
// le riunioni FOMC successive a quella corrente.

export type TipoEventoMacro = "FOMC" | "CPI" | "NFP";

export interface EventoMacro {
  data: string; // YYYY-MM-DD
  tipo: TipoEventoMacro;
  descrizione: string;
}

export const EVENTI_MACRO: EventoMacro[] = [
  // FOMC 2026
  { data: "2026-01-28", tipo: "FOMC", descrizione: "Decisione FOMC sui tassi" },
  { data: "2026-03-18", tipo: "FOMC", descrizione: "Decisione FOMC sui tassi" },
  { data: "2026-04-29", tipo: "FOMC", descrizione: "Decisione FOMC sui tassi" },
  { data: "2026-06-17", tipo: "FOMC", descrizione: "Decisione FOMC sui tassi" },
  { data: "2026-07-29", tipo: "FOMC", descrizione: "Decisione FOMC sui tassi" },
  { data: "2026-09-16", tipo: "FOMC", descrizione: "Decisione FOMC sui tassi" },
  { data: "2026-10-28", tipo: "FOMC", descrizione: "Decisione FOMC sui tassi" },
  { data: "2026-12-09", tipo: "FOMC", descrizione: "Decisione FOMC sui tassi" },

  // CPI 2026
  { data: "2026-01-13", tipo: "CPI", descrizione: "Rilascio CPI (inflazione USA)" },
  { data: "2026-02-13", tipo: "CPI", descrizione: "Rilascio CPI (inflazione USA)" },
  { data: "2026-03-11", tipo: "CPI", descrizione: "Rilascio CPI (inflazione USA)" },
  { data: "2026-04-10", tipo: "CPI", descrizione: "Rilascio CPI (inflazione USA)" },
  { data: "2026-05-12", tipo: "CPI", descrizione: "Rilascio CPI (inflazione USA)" },
  { data: "2026-06-10", tipo: "CPI", descrizione: "Rilascio CPI (inflazione USA)" },
  { data: "2026-07-14", tipo: "CPI", descrizione: "Rilascio CPI (inflazione USA)" },
  { data: "2026-08-12", tipo: "CPI", descrizione: "Rilascio CPI (inflazione USA)" },
  { data: "2026-09-11", tipo: "CPI", descrizione: "Rilascio CPI (inflazione USA)" },
  { data: "2026-10-14", tipo: "CPI", descrizione: "Rilascio CPI (inflazione USA)" },
  { data: "2026-11-10", tipo: "CPI", descrizione: "Rilascio CPI (inflazione USA)" },
  { data: "2026-12-10", tipo: "CPI", descrizione: "Rilascio CPI (inflazione USA)" },

  // NFP / Employment Situation 2026
  { data: "2026-01-09", tipo: "NFP", descrizione: "Employment Situation (occupazione USA)" },
  { data: "2026-02-11", tipo: "NFP", descrizione: "Employment Situation (occupazione USA)" },
  { data: "2026-03-06", tipo: "NFP", descrizione: "Employment Situation (occupazione USA)" },
  { data: "2026-04-03", tipo: "NFP", descrizione: "Employment Situation (occupazione USA)" },
  { data: "2026-05-08", tipo: "NFP", descrizione: "Employment Situation (occupazione USA)" },
  { data: "2026-06-05", tipo: "NFP", descrizione: "Employment Situation (occupazione USA)" },
  { data: "2026-07-02", tipo: "NFP", descrizione: "Employment Situation (occupazione USA)" },
  { data: "2026-08-07", tipo: "NFP", descrizione: "Employment Situation (occupazione USA)" },
  { data: "2026-09-04", tipo: "NFP", descrizione: "Employment Situation (occupazione USA)" },
  { data: "2026-10-02", tipo: "NFP", descrizione: "Employment Situation (occupazione USA)" },
  { data: "2026-11-06", tipo: "NFP", descrizione: "Employment Situation (occupazione USA)" },
  { data: "2026-12-04", tipo: "NFP", descrizione: "Employment Situation (occupazione USA)" },

  // FOMC 2027 — tentative, non ancora confermate dalla Fed
  { data: "2027-01-27", tipo: "FOMC", descrizione: "Decisione FOMC sui tassi (data tentativa)" },
  { data: "2027-03-17", tipo: "FOMC", descrizione: "Decisione FOMC sui tassi (data tentativa)" },
  { data: "2027-04-28", tipo: "FOMC", descrizione: "Decisione FOMC sui tassi (data tentativa)" },
  { data: "2027-06-09", tipo: "FOMC", descrizione: "Decisione FOMC sui tassi (data tentativa)" },
  { data: "2027-07-28", tipo: "FOMC", descrizione: "Decisione FOMC sui tassi (data tentativa)" },
  { data: "2027-09-15", tipo: "FOMC", descrizione: "Decisione FOMC sui tassi (data tentativa)" },
  { data: "2027-10-27", tipo: "FOMC", descrizione: "Decisione FOMC sui tassi (data tentativa)" },
  { data: "2027-12-08", tipo: "FOMC", descrizione: "Decisione FOMC sui tassi (data tentativa)" },
];

// Il confronto è per data di calendario (YYYY-MM-DD), non per istante
// preciso: con i digest solo a 08:00/12:00/22:00 ora Italia (sempre 1-2
// ore avanti rispetto a UTC, mai abbastanza da superare la mezzanotte),
// la data UTC di digest.creatoIl coincide sempre con la data locale
// italiana e con la data USA orientale degli eventi elencati sopra.
export function eventiMacroPerData(dataDigest: Date): EventoMacro[] {
  const dataISO = dataDigest.toISOString().slice(0, 10);
  return EVENTI_MACRO.filter((e) => e.data === dataISO);
}
