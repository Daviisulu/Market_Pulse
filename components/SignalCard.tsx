import type { Explanation, PriceSnapshot, Signal } from "@/generated/prisma/client";
import { SOGLIA_SENTIMENT_CONTRASTANTE } from "@/lib/soglie";

export type SignalWithRelations = Signal & {
  explanation: Explanation | null;
  priceSnapshots: PriceSnapshot[];
  newsItems: { categoria: string }[];
};

const ETICHETTA_ATTENZIONE_CAP: Record<"sproporzionata" | "sottotono", string> = {
  sproporzionata: "attenzione elevata vs size",
  sottotono: "attenzione contenuta vs size",
};

export function sentimentInfo(v: number): { label: string; varName: string } {
  if (v > 0.15) return { label: "positivo", varName: "--sentiment-positivo" };
  if (v < -0.15) return { label: "negativo", varName: "--sentiment-negativo" };
  return { label: "neutro", varName: "--sentiment-neutro" };
}

const formatVolume = new Intl.NumberFormat("it-IT", {
  notation: "compact",
  maximumFractionDigits: 1,
});

// tipo/nome sono già distinti tra loro dal grassetto del titolo: il badge
// non ha bisogno del proprio colore di sfondo per ogni valore (evita
// l'errore di "tingere tutto" segnalato nelle note su Liquid Glass/tinting
// — il colore va riservato all'informazione che conta davvero, il sentiment).
export function SignalCard({
  signal,
  featured = false,
  inWatchlist = false,
  livelloAttenzioneCap,
}: {
  signal: SignalWithRelations;
  featured?: boolean;
  inWatchlist?: boolean;
  livelloAttenzioneCap?: "sproporzionata" | "proporzionata" | "sottotono";
}) {
  const prezzo = signal.priceSnapshots.at(-1);
  const variazione = signal.variazioneRispettoAlDigestPrecedente;
  const sentiment = sentimentInfo(signal.sentimentMedio);

  return (
    <article
      className={`glass glass-hover rounded-3xl flex flex-col gap-3 ${
        featured ? "p-6" : "p-5"
      }`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {inWatchlist && (
            <span
              className="text-current/50"
              role="img"
              aria-label="Nella tua watchlist"
              title="Nella tua watchlist"
            >
              ★
            </span>
          )}
          <h3 className={featured ? "text-xl font-semibold" : "text-lg font-semibold"}>
            {signal.nome}
          </h3>
          {signal.primaComparsa && (
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{
                color: "var(--sentiment-positivo)",
                backgroundColor: "rgba(127, 127, 127, 0.12)",
              }}
              title="Mai comparso in un digest precedente"
            >
              nuovo
            </span>
          )}
          {(livelloAttenzioneCap === "sproporzionata" || livelloAttenzioneCap === "sottotono") && (
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium bg-black/[.05] dark:bg-white/[.08] text-current/70"
              title="Rispetto alla capitalizzazione di mercato, confrontato con gli altri segnali di questo digest"
            >
              {ETICHETTA_ATTENZIONE_CAP[livelloAttenzioneCap]}
            </span>
          )}
          {signal.sentimentVarianza !== null &&
            signal.sentimentVarianza > SOGLIA_SENTIMENT_CONTRASTANTE && (
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium bg-black/[.05] dark:bg-white/[.08] text-current/70"
                title="Le fonti non sono d'accordo: menzioni con sentiment molto diverso tra loro, la media da sola non lo mostra"
              >
                sentiment contrastante
              </span>
            )}
        </div>
        <span className="shrink-0 rounded-full bg-black/[.05] dark:bg-white/[.08] px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-current/70">
          {signal.tipo}
        </span>
      </header>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
        <span className="text-current/60">
          {signal.conteggioMenzioni} menzioni · {(signal.quotaAttenzione * 100).toFixed(1)}%
          degli articoli
        </span>

        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: `var(${sentiment.varName})` }}
            aria-hidden
          />
          <span className="text-current/60">sentiment {sentiment.label}</span>
        </span>

        {variazione !== null && (
          <span
            className="rounded-full px-2 py-0.5 text-xs font-medium"
            style={{
              color: `var(${variazione >= 0 ? "--sentiment-positivo" : "--sentiment-negativo"})`,
              backgroundColor: "rgba(127, 127, 127, 0.12)",
            }}
          >
            {variazione >= 0 ? "+" : ""}
            {(variazione * 100).toFixed(0)}%
          </span>
        )}

        {prezzo && (
          <span className="ml-auto font-mono text-xs text-current/60">
            {prezzo.ticker} · {prezzo.prezzoChiusura.toLocaleString("it-IT")}
            {prezzo.volume !== null && ` · vol ${formatVolume.format(prezzo.volume)}`}
          </span>
        )}
      </div>

      {signal.explanation && (
        <p className="rounded-2xl bg-black/[.03] dark:bg-white/[.05] p-3 text-sm leading-relaxed text-current/80">
          {signal.explanation.testo}
        </p>
      )}
    </article>
  );
}
