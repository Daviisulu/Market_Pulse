import Link from "next/link";
import { db } from "@/lib/db";
import { SignalCard } from "@/components/SignalCard";
import { DigestList } from "@/components/DigestList";
import { SOGLIA_BASSA_ATTIVITA, SOGLIA_MENZIONI_MINIME_VISUALIZZAZIONE } from "@/lib/soglie";
import { eventiMacroPerData } from "@/lib/calendario-macro";
import { isInWatchlist, ordinaConWatchlistInCima } from "@/lib/watchlist";

// Query ogni volta: dashboard personale a basso traffico, la freschezza
// del digest più recente conta più della cache statica.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [digest, altriDigest] = await Promise.all([
    db.digest.findFirst({
      orderBy: { creatoIl: "desc" },
      include: {
        signals: {
          where: { conteggioMenzioni: { gte: SOGLIA_MENZIONI_MINIME_VISUALIZZAZIONE } },
          include: { explanation: true, priceSnapshots: true },
          orderBy: { conteggioMenzioni: "desc" },
        },
      },
    }),
    db.digest.findMany({
      orderBy: { creatoIl: "desc" },
      skip: 1,
      take: 10,
    }),
  ]);

  if (!digest) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="glass rounded-3xl p-8 flex flex-col items-center gap-2">
          <h1 className="text-xl font-semibold">Nessun digest ancora</h1>
          <p className="text-current/60">
            Esegui <code className="rounded bg-black/[.06] px-1.5 py-0.5 dark:bg-white/[.08]">npm run digest</code> per generarne uno.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-6 p-6 sm:p-8 max-w-5xl mx-auto w-full">
      <header className="glass rounded-3xl p-6 flex items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Market Pulse</h1>
          <p className="text-sm text-current/60">
            Digest del {new Date(digest.creatoIl).toLocaleString("it-IT")} — {digest.signals.length} segnali
          </p>
        </div>
        <Link
          href="/calendario"
          className="shrink-0 rounded-full bg-black/[.05] dark:bg-white/[.08] px-3 py-1.5 text-sm hover:bg-black/[.1] dark:hover:bg-white/[.14]"
        >
          calendario eventi
        </Link>
      </header>

      {eventiMacroPerData(digest.creatoIl).map((evento) => (
        <p
          key={evento.data + evento.tipo}
          className="text-sm glass rounded-2xl px-4 py-3"
        >
          <strong>Oggi:</strong> {evento.descrizione} — un picco di
          attenzione su temi collegati (tassi, inflazione, occupazione)
          è meno sorprendente in una giornata come questa.
        </p>
      ))}

      {digest.signals.length === 0 ? (
        <p className="text-current/60">Nessun segnale rilevante in questo digest.</p>
      ) : (
        <>
          {digest.signals.length < SOGLIA_BASSA_ATTIVITA && (
            <p className="text-sm text-current/60 glass rounded-2xl px-4 py-3">
              Giornata a bassa attività editoriale — pochi segnali non
              significa che qualcosa non funziona, solo che le fonti
              seguite hanno pubblicato poco in questa finestra.
            </p>
          )}
          {/* Griglia "bento" (Design-Tendenze-Web-Moderne/il-bento-grid...):
          stessa griglia per tutti, ma i segnali trending (con spiegazione)
          occupano due colonne invece di limitarsi a un blocco uniforme. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ordinaConWatchlistInCima(digest.signals).map((signal) => (
              <div key={signal.id} className={signal.explanation ? "sm:col-span-2" : ""}>
                <SignalCard
                  signal={signal}
                  featured={Boolean(signal.explanation)}
                  inWatchlist={isInWatchlist(signal.nome)}
                />
              </div>
            ))}
          </div>
        </>
      )}

      <DigestList digests={altriDigest} />
    </main>
  );
}
