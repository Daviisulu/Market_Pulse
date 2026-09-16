import type { ReactNode } from "react";
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
// app/digest/[id]/page.tsx (digest storico). Layout a 3 zone (invece di
// un unico stack verticale): la griglia dei segnali — il contenuto che
// conta davvero — resta al centro e larga; il contesto rapido (evento
// macro del giorno, avviso di bassa attività) va nella colonna a
// sinistra, gli approfondimenti (rollup settore/paese, elenco digest
// precedenti) in quella a destra. Sotto `xl` (schermi stretti) le
// colonne collassano in un unico stack, nell'ordine in cui compaiono nel
// markup: contesto, poi il contenuto principale, poi gli
// approfondimenti. `tempo` cambia solo il tempo verbale del banner
// calendario ("è" vs "era" — un digest storico descrive un evento
// passato, non uno in corso).
export function DigestBody({
  creatoIl,
  signals,
  totaleSegnali,
  tempo,
  extraSidebar,
}: {
  creatoIl: Date;
  signals: SignalWithRelations[];
  totaleSegnali: number;
  tempo: "presente" | "passato";
  extraSidebar?: ReactNode;
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
  const eventiOggi = eventiMacroPerData(creatoIl);
  const etichettaEvento = tempo === "presente" ? "Oggi" : "In questa giornata";
  const verboEssere = tempo === "presente" ? "è" : "era";

  const bassaAttivita = signals.length > 0 && totaleSegnali < SOGLIA_BASSA_ATTIVITA;
  const haContestoSinistra = eventiOggi.length > 0 || bassaAttivita;
  const haApprofondimentiDestra = Boolean(rollupEntita) || Boolean(extraSidebar);

  // Le 3 combinazioni statiche (invece di comporre le classi a pezzi) —
  // Tailwind scansiona il sorgente per stringhe letterali, una classe
  // costruita a runtime concatenando frammenti non verrebbe rilevata.
  const grigliaClassName =
    haContestoSinistra && haApprofondimentiDestra
      ? "grid grid-cols-1 xl:grid-cols-[220px_minmax(0,1fr)_260px] gap-6 items-start"
      : haContestoSinistra
        ? "grid grid-cols-1 xl:grid-cols-[220px_minmax(0,1fr)] gap-6 items-start"
        : haApprofondimentiDestra
          ? "grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_260px] gap-6 items-start"
          : "";

  return (
    <>
      {sintesi && (
        <div className="glass rounded-3xl p-4 sm:p-5 flex flex-col gap-2.5">
          <p className="text-[15px] leading-relaxed">{sintesi}</p>
          {(concentrazione?.livello || totaleClassificato > 0) && (
            <div className="flex flex-wrap gap-2">
              {concentrazione?.livello && (
                <span className="rounded-full bg-black/[.04] dark:bg-white/[.06] px-2.5 py-1 text-xs text-current/60">
                  Concentrazione: {concentrazione.livello}
                </span>
              )}
              {totaleClassificato > 0 && (
                <span className="rounded-full bg-black/[.04] dark:bg-white/[.06] px-2.5 py-1 text-xs text-current/60">
                  {((rapportoCategorie!.quotaCrypto / totaleClassificato) * 100).toFixed(0)}%
                  crypto · {((rapportoCategorie!.quotaTradizionale / totaleClassificato) * 100).toFixed(0)}%
                  tradizionale
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <div className={grigliaClassName}>
        {haContestoSinistra && (
          <aside className="flex flex-col gap-4">
            {/* Colonna stretta (220px): frase intera più breve invece di
            affidarsi al tooltip via hover (poco affidabile: dipende dal
            browser/dispositivo, facile non accorgersene). */}
            {eventiOggi.map((evento) => (
              <p key={evento.data + evento.tipo} className="text-sm glass rounded-2xl px-4 py-3">
                <strong>{etichettaEvento}:</strong> {evento.descrizione} — un picco di
                attenzione {verboEssere} atteso.
              </p>
            ))}
            {bassaAttivita && (
              <p className="text-sm text-current/60 glass rounded-2xl px-4 py-3">
                Bassa attività editoriale — poche notizie, non un problema.
              </p>
            )}
          </aside>
        )}

        {signals.length === 0 ? (
          <p className="text-current/60">Nessun segnale rilevante in questo digest.</p>
        ) : (
          // Griglia "bento" (Design-Tendenze-Web-Moderne/il-bento-grid...):
          // stessa griglia per tutti, ma i segnali trending (con spiegazione)
          // occupano due colonne invece di limitarsi a un blocco uniforme.
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
        )}

        {haApprofondimentiDestra && (
          <aside className="flex flex-col gap-4">
            {rollupEntita && (
              <div className="glass rounded-3xl p-5 flex flex-col gap-4 text-sm">
                {rollupEntita.settori.length > 0 && (
                  <RollupColonna titolo="Per settore" voci={rollupEntita.settori} />
                )}
                {rollupEntita.paesi.length > 0 && (
                  <RollupColonna titolo="Per area geografica" voci={rollupEntita.paesi} />
                )}
              </div>
            )}
            {extraSidebar}
          </aside>
        )}
      </div>
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
