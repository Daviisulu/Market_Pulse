import { SignalCard, sentimentInfo, type SignalWithRelations } from "./SignalCard";
import { SOGLIA_BASSA_ATTIVITA } from "@/lib/soglie";
import { eventiMacroPerData } from "@/lib/calendario-macro";
import { isInWatchlist, ordinaConWatchlistInCima } from "@/lib/watchlist";
import { sintetizzaDigest } from "@/lib/sintesi";
import { calcolaConcentrazione } from "@/lib/concentrazione";
import { calcolaRapportoCategorie } from "@/lib/categoria-mercato";
import { calcolaRapportiAttenzioneCapitalizzazione } from "@/lib/attenzione-capitalizzazione";
import { calcolaRollupEntita, type VoceRollup } from "@/lib/rollup-entita";

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
  const concentrazione = calcolaConcentrazione(signals.map((s) => s.conteggioMenzioni));
  const rapportoCategorie = calcolaRapportoCategorie(signals);
  const totaleClassificato =
    (rapportoCategorie?.quotaCrypto ?? 0) + (rapportoCategorie?.quotaTradizionale ?? 0);
  const segnaliConCap = signals
    .map((s) => ({
      id: s.id,
      quotaAttenzione: s.quotaAttenzione,
      marketCap: s.priceSnapshots.at(-1)?.marketCap ?? null,
    }))
    .filter(
      (s): s is { id: string; quotaAttenzione: number; marketCap: number } =>
        s.marketCap !== null && s.marketCap > 0,
    );
  const livelliAttenzioneCap = calcolaRapportiAttenzioneCapitalizzazione(segnaliConCap);
  const rollupEntita = calcolaRollupEntita(signals);
  const etichettaEvento = tempo === "presente" ? "Oggi" : "In questa giornata";
  const verboEssere = tempo === "presente" ? "è" : "era";

  return (
    <>
      {sintesi && (
        <p className="glass rounded-3xl p-5 text-[15px] leading-relaxed">
          {sintesi}
          {concentrazione?.livello && (
            <span className="block mt-2 text-sm text-current/50">
              Concentrazione dell&apos;attenzione: {concentrazione.livello} — poche entità
              dominano il quadro, se alta; ampiamente distribuito, se bassa.
            </span>
          )}
          {totaleClassificato > 0 && (
            <span className="block mt-2 text-sm text-current/50">
              Crypto vs tradizionale:{" "}
              {((rapportoCategorie!.quotaCrypto / totaleClassificato) * 100).toFixed(0)}% crypto ·{" "}
              {((rapportoCategorie!.quotaTradizionale / totaleClassificato) * 100).toFixed(0)}%
              tradizionale — quota di attenzione, non di notizie pubblicate.
            </span>
          )}
        </p>
      )}

      {eventiMacroPerData(creatoIl).map((evento) => (
        <p key={evento.data + evento.tipo} className="text-sm glass rounded-2xl px-4 py-3">
          <strong>{etichettaEvento}:</strong> {evento.descrizione} — un picco di
          attenzione su temi collegati (tassi, inflazione, occupazione) {verboEssere}{" "}
          meno sorprendente in una giornata come questa.
        </p>
      ))}

      {rollupEntita && (
        <div className="glass rounded-3xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {rollupEntita.settori.length > 0 && (
            <RollupColonna titolo="Per settore" voci={rollupEntita.settori} />
          )}
          {rollupEntita.paesi.length > 0 && (
            <RollupColonna titolo="Per area geografica" voci={rollupEntita.paesi} />
          )}
        </div>
      )}

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
                  livelloAttenzioneCap={livelliAttenzioneCap.get(signal.id)}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

// Colonna del rollup per settore/area geografica: solo i temi già
// taggati come tali dall'estrazione (Signal.tipo === "settore"/"paese"),
// non un'aggregazione delle aziende/asset sotto il loro settore — vedi
// il commento in lib/rollup-entita.ts sul perché.
function RollupColonna({ titolo, voci }: { titolo: string; voci: VoceRollup[] }) {
  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-wide text-current/50 mb-2">
        {titolo}
      </h3>
      <ul className="flex flex-col gap-1.5">
        {voci.map((voce) => {
          const sentiment = sentimentInfo(voce.sentimentMedio);
          return (
            <li key={voce.nome} className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: `var(${sentiment.varName})` }}
                  aria-hidden
                />
                {voce.nome}
              </span>
              <span className="text-current/50">{(voce.quotaAttenzione * 100).toFixed(1)}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
