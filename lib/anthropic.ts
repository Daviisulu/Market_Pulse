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
