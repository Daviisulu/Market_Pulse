import type { Explanation, PriceSnapshot, Signal } from "@/generated/prisma/client";

type SignalWithRelations = Signal & {
  explanation: Explanation | null;
  priceSnapshots: PriceSnapshot[];
};

function sentimentInfo(v: number): { label: string; varName: string } {
  if (v > 0.15) return { label: "positivo", varName: "--sentiment-positivo" };
  if (v < -0.15) return { label: "negativo", varName: "--sentiment-negativo" };
  return { label: "neutro", varName: "--sentiment-neutro" };
}

// tipo/nome sono già distinti tra loro dal grassetto del titolo: il badge
// non ha bisogno del proprio colore di sfondo per ogni valore (evita
// l'errore di "tingere tutto" segnalato nelle note su Liquid Glass/tinting
// — il colore va riservato all'informazione che conta davvero, il sentiment).
export function SignalCard({
  signal,
  featured = false,
}: {
  signal: SignalWithRelations;
  featured?: boolean;
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
        <h3 className={featured ? "text-xl font-semibold" : "text-lg font-semibold"}>
          {signal.nome}
        </h3>
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
