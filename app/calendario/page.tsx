import Link from "next/link";
import { EVENTI_MACRO, type EventoMacro } from "@/lib/calendario-macro";

// Dati statici (nessuna query al DB): può restare prerenderizzata.

const NOMI_MESI_IT = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

function formatGiorno(dataISO: string): string {
  const [, mese, giorno] = dataISO.split("-");
  return `${Number(giorno)} ${NOMI_MESI_IT[Number(mese) - 1]}`;
}

function raggruppaPerMese(eventi: EventoMacro[]): [string, EventoMacro[]][] {
  const gruppi = new Map<string, EventoMacro[]>();
  for (const evento of eventi) {
    const chiaveMese = evento.data.slice(0, 7); // YYYY-MM
    const lista = gruppi.get(chiaveMese) ?? [];
    lista.push(evento);
    gruppi.set(chiaveMese, lista);
  }
  return [...gruppi.entries()];
}

function etichettaMese(chiaveMese: string): string {
  const [anno, mese] = chiaveMese.split("-");
  return `${NOMI_MESI_IT[Number(mese) - 1]} ${anno}`;
}

export default function CalendarioPage() {
  const oggi = new Date().toISOString().slice(0, 10);
  const eventiOrdinati = [...EVENTI_MACRO].sort((a, b) => a.data.localeCompare(b.data));
  const gruppi = raggruppaPerMese(eventiOrdinati);

  return (
    <main className="flex flex-1 flex-col gap-6 p-6 sm:p-8 max-w-3xl mx-auto w-full">
      <header className="glass rounded-3xl p-6 flex items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Calendario eventi macro</h1>
          <p className="text-sm text-current/60">
            FOMC, CPI, NFP — date pubbliche note in anticipo (fonti:
            federalreserve.gov, bls.gov)
          </p>
        </div>
        <Link
          href="/"
          className="shrink-0 rounded-full bg-black/[.05] dark:bg-white/[.08] px-3 py-1.5 text-sm hover:bg-black/[.1] dark:hover:bg-white/[.14]"
        >
          digest più recente
        </Link>
      </header>

      <div className="flex flex-col gap-5">
        {gruppi.map(([chiaveMese, eventi]) => (
          <section key={chiaveMese} className="flex flex-col gap-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-current/50 px-1">
              {etichettaMese(chiaveMese)}
            </h2>
            <ul className="glass rounded-3xl divide-y divide-black/[.06] dark:divide-white/[.08]">
              {eventi.map((evento) => {
                const passato = evento.data < oggi;
                const eOggi = evento.data === oggi;
                return (
                  <li
                    key={evento.data + evento.tipo}
                    className={`flex items-center gap-3 px-5 py-3 ${passato ? "opacity-50" : ""}`}
                  >
                    <span className="w-20 shrink-0 text-sm text-current/70">
                      {formatGiorno(evento.data)}
                    </span>
                    <span className="shrink-0 rounded-full bg-black/[.05] dark:bg-white/[.08] px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-current/70">
                      {evento.tipo}
                    </span>
                    <span className="text-sm flex-1">{evento.descrizione}</span>
                    {eOggi && (
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{
                          color: "var(--sentiment-positivo)",
                          backgroundColor: "rgba(127, 127, 127, 0.12)",
                        }}
                      >
                        oggi
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
