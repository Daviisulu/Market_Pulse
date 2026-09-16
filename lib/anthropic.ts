import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env["ANTHROPIC_API_KEY"];
if (!apiKey) {
  throw new Error(
    "ANTHROPIC_API_KEY mancante — impostala in .env (vedi .env.example)",
  );
}

export const anthropic = new Anthropic({ apiKey });

// Modelli usati nella pipeline di ingestion: Haiku per l'estrazione
// entita'/sentiment (economico, alto volume), Sonnet per le spiegazioni
// didattiche (poche per digest, qualita' del testo piu' importante).
export const MODELS = {
  extraction: "claude-haiku-4-5-20251001",
  explanation: "claude-sonnet-5",
} as const;

// Prezzi ufficiali per milione di token (verificati il 2026-09-16),
// usati solo per stimare il costo di un digest nei log — non e' la
// fatturazione reale, quella la calcola Anthropic. Da aggiornare se
// cambiano i prezzi pubblici.
const PREZZI_PER_MILIONE: Record<string, { input: number; output: number }> = {
  [MODELS.extraction]: { input: 1.0, output: 5.0 },
  [MODELS.explanation]: { input: 2.0, output: 10.0 },
};

export function stimaCosto(
  modello: string,
  usage: { input_tokens: number; output_tokens: number },
): number {
  const prezzi = PREZZI_PER_MILIONE[modello];
  if (!prezzi) return 0;
  return (
    (usage.input_tokens / 1_000_000) * prezzi.input +
    (usage.output_tokens / 1_000_000) * prezzi.output
  );
}
