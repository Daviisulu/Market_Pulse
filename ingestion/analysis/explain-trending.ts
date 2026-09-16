import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, MODELS } from "../../lib/anthropic";
import type { SignalType } from "../../lib/types";

export interface ArticoloPerSpiegazione {
  titolo: string;
  fonte: string;
  estratto: string;
}

export interface SignalForExplanation {
  tipo: SignalType;
  nome: string;
  conteggioMenzioni: number;
  sentimentMedio: number;
  variazioneRispettoAlDigestPrecedente: number | null;
  articoli: ArticoloPerSpiegazione[];
}

function buildPrompt(signal: SignalForExplanation): string {
  const articoliTesto = signal.articoli
    .map((a) => `- (${a.fonte}) ${a.titolo}: ${a.estratto.slice(0, 200)}`)
    .join("\n");

  const variazioneTesto =
    signal.variazioneRispettoAlDigestPrecedente !== null
      ? `variazione del ${(signal.variazioneRispettoAlDigestPrecedente * 100).toFixed(0)}% rispetto al digest precedente`
      : "prima comparsa in un digest";

  return (
    `"${signal.nome}" (${signal.tipo}) sta guadagnando attenzione mediatica: ` +
    `${signal.conteggioMenzioni} menzioni, sentiment medio ${signal.sentimentMedio.toFixed(2)} ` +
    `(-1 molto negativo, +1 molto positivo), ${variazioneTesto}.\n\n` +
    `Articoli che ne parlano:\n${articoliTesto}\n\n` +
    "Scrivi una spiegazione didattica di massimo 3-4 frasi per un lettore " +
    "non esperto: cosa sta succedendo secondo questi articoli, perché se ne " +
    "parla di più ora. Non dare consigli di investimento e non inventare " +
    "numeri o fatti non presenti negli articoli forniti. Se gli articoli non " +
    "bastano a spiegare l'aumento di attenzione, dillo esplicitamente invece " +
    "di indovinare."
  );
}

// Sonnet invece di Haiku: poche chiamate per digest (solo i segnali
// trending), dove la qualità del testo pesa più del costo — vedi commento
// in lib/anthropic.ts.
export async function explainTrendingSignal(
  signal: SignalForExplanation,
): Promise<string> {
  const response = await anthropic.messages.create({
    model: MODELS.explanation,
    max_tokens: 400,
    messages: [{ role: "user", content: buildPrompt(signal) }],
  });

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text",
  );
  return textBlock?.text ?? "";
}
