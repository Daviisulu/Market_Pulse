import { SignalCard, type SignalWithRelations } from "./SignalCard";
import { SOGLIA_BASSA_ATTIVITA } from "@/lib/soglie";
import { eventiMacroPerData } from "@/lib/calendario-macro";
import { isInWatchlist, ordinaConWatchlistInCima } from "@/lib/watchlist";
import { sintetizzaDigest } from "@/lib/sintesi";

// Corpo condiviso tra app/page.tsx (digest più recente) e
// app/digest/[id]/page.tsx (digest storico) — prima gli stessi 4 blocchi
// (sintesi, banner calendario, banner bassa attività, griglia segnali)
// erano duplicati letteralmente nei due file e avevano già iniziato a
// divergere nel testo. `tempo` cambia solo il tempo verbale del banner
// calendario ("è" vs "era" — un digest storico descrive un evento
// passato, non uno in corso).
export function DigestBody({
  creatoIl,
  signals,
  totaleSegnali,
  tempo,
}: {
  creatoIl: Date;
  signals: SignalWithRelations[];
  totaleSegnali: number;
  tempo: "presente" | "passato";
}) {
  const sintesi = sintetizzaDigest(signals);
  const etichettaEvento = tempo === "presente" ? "Oggi" : "In questa giornata";
  const verboEssere = tempo === "presente" ? "è" : "era";

  return (
    <>
      {sintesi && (
        <p className="glass rounded-3xl p-5 text-[15px] leading-relaxed">{sintesi}</p>
      )}

      {eventiMacroPerData(creatoIl).map((evento) => (
        <p key={evento.data + evento.tipo} className="text-sm glass rounded-2xl px-4 py-3">
          <strong>{etichettaEvento}:</strong> {evento.descrizione} — un picco di
          attenzione su temi collegati (tassi, inflazione, occupazione) {verboEssere}{" "}
          meno sorprendente in una giornata come questa.
        </p>
      ))}

      {signals.length === 0 ? (
        <p className="text-current/60">Nessun segnale rilevante in questo digest.</p>
      ) : (
        <>
          {totaleSegnali < SOGLIA_BASSA_ATTIVITA && (
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
            {ordinaConWatchlistInCima(signals).map((signal) => (
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
    </>
  );
}
