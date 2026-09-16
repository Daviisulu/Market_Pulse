import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, MODELS, stimaCosto } from "../../lib/anthropic";
import { SIGNAL_TYPES, type SignalType } from "../../lib/types";
import { calcolaVarianzaSentiment } from "../../lib/dispersione-sentiment";
import { log } from "../log";

export interface NewsItemForExtraction {
  id: string;
  titolo: string;
  estratto: string;
  fonte: string;
}

export interface ExtractedSignal {
  tipo: SignalType;
  nome: string;
  conteggioMenzioni: number;
  sentimentMedio: number;
  sentimentVarianza: number;
  newsItemIds: string[];
}

// Haiku regge comodamente questo volume di articoli in un solo prompt.
// Oltre questa soglia servirebbe un chunking con merge delle entita' tra
// chunk (non implementato: nessun digest reale l'ha ancora superata).
const MAX_ARTICLES_PER_CALL = 150;

const EXTRACTION_TOOL: Anthropic.Tool = {
  name: "registra_segnali",
  description:
    "Registra le entita'/temi finanziari rilevanti trovati negli articoli forniti, con gli articoli (per indice) in cui ciascuna compare e il sentiment di ogni menzione.",
  input_schema: {
    type: "object",
    properties: {
      segnali: {
        type: "array",
        items: {
          type: "object",
          properties: {
            tipo: {
              type: "string",
              enum: [...SIGNAL_TYPES],
              description:
                "azienda (es. Nvidia), asset (es. Bitcoin, oro), settore (es. semiconduttori), paese (es. Cina), tema (es. tassi d'interesse)",
            },
            nome: {
              type: "string",
              description:
                "nome normalizzato dell'entita' (es. 'Bitcoin' non 'BTC', 'Nvidia' non 'NVDA')",
            },
            menzioni: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  indiceArticolo: {
                    type: "integer",
                    description: "indice 0-based nella lista di articoli fornita",
                  },
                  sentiment: {
                    type: "number",
                    description: "-1 (molto negativo) a 1 (molto positivo), 0 se neutro",
                  },
                },
                required: ["indiceArticolo", "sentiment"],
              },
            },
          },
          required: ["tipo", "nome", "menzioni"],
        },
      },
    },
    required: ["segnali"],
  },
};

function buildPrompt(articles: NewsItemForExtraction[]): string {
  const elenco = articles
    .map((a, i) => `[${i}] (${a.fonte}) ${a.titolo}\n${a.estratto.slice(0, 300)}`)
    .join("\n\n");

  return (
    `Analizza questi ${articles.length} titoli/estratti di notizie finanziarie ` +
    "(crypto e mercati tradizionali) e identifica le entita' finanziarie " +
    "rilevanti (aziende, asset, settori, paesi, temi macro) menzionate, con " +
    "il sentiment di ciascuna menzione. Non includere entita' citate solo di " +
    "sfuggita: solo quelle su cui l'articolo dice effettivamente qualcosa. " +
    `Usa lo strumento ${EXTRACTION_TOOL.name} per rispondere.\n\n${elenco}`
  );
}

interface RawMenzione {
  indiceArticolo: number;
  sentiment: number;
}

interface RawSegnale {
  tipo: string;
  nome: string;
  menzioni: RawMenzione[];
}

// Il cast "as" su toolUse.input non e' verificato a runtime: una risposta
// troncata puo' restituire un array "segnali" sintatticamente valido con
// dentro elementi mancanti di campi (vedi il crash gia' capitato e
// corretto su "segnali" mancante del tutto — questo copre il caso in cui
// e' presente ma incompleto). Senza questi controlli, un elemento con
// "menzioni" assente farebbe fallire .map() piu' sotto.
function isMenzioneValida(m: unknown): m is RawMenzione {
  if (typeof m !== "object" || m === null) return false;
  const c = m as Record<string, unknown>;
  return typeof c.indiceArticolo === "number" && typeof c.sentiment === "number";
}

function isSegnaleValido(s: unknown): s is RawSegnale {
  if (typeof s !== "object" || s === null) return false;
  const c = s as Record<string, unknown>;
  return (
    typeof c.nome === "string" &&
    c.nome.length > 0 &&
    typeof c.tipo === "string" &&
    Array.isArray(c.menzioni) &&
    c.menzioni.every(isMenzioneValida)
  );
}

export async function extractSignals(
  articlesInput: NewsItemForExtraction[],
): Promise<ExtractedSignal[]> {
  if (articlesInput.length === 0) return [];

  let articles = articlesInput;
  if (articles.length > MAX_ARTICLES_PER_CALL) {
    log.error(
      `extractSignals: ${articles.length} articoli superano il limite di ${MAX_ARTICLES_PER_CALL} per chiamata, troncati`,
    );
    articles = articles.slice(0, MAX_ARTICLES_PER_CALL);
  }

  const response = await anthropic.messages.create({
    model: MODELS.extraction,
    // Storia: 4096 -> troncava con batch reali (stop_reason: max_tokens,
    // "segnali" mancante). Alzato a 8192 -> troncava ANCORA con lo stesso
    // batch di 105 articoli (verificato dal vivo il 2026-09-16, stessa
    // causa: 0 segnali estratti, $0.048 spesi per nulla). 16000 e' anche
    // il default raccomandato per chiamate non-streaming. Se dovesse
    // troncare di nuovo a questo livello, la soluzione vera e' dividere
    // il batch in chunk piu' piccoli con merge dei risultati (non
    // implementato, vedi MAX_ARTICLES_PER_CALL sopra), non alzare ancora.
    max_tokens: 16000,
    tools: [EXTRACTION_TOOL],
    tool_choice: { type: "tool", name: EXTRACTION_TOOL.name },
    messages: [{ role: "user", content: buildPrompt(articles) }],
  });

  const costo = stimaCosto(MODELS.extraction, response.usage);
  log.info(
    `extractSignals: ${response.usage.input_tokens} input + ${response.usage.output_tokens} output token (Haiku) — stima $${costo.toFixed(4)}`,
  );

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );
  if (!toolUse) {
    log.error("extractSignals: nessun tool_use nella risposta di Claude");
    return [];
  }

  const parsed = toolUse.input as { segnali?: unknown };

  if (!Array.isArray(parsed.segnali)) {
    // Capita soprattutto su batch grandi: se la risposta viene troncata
    // prima di completare il JSON dello strumento, il campo richiesto
    // "segnali" puo' mancare del tutto invece di essere un array vuoto.
    // Si rinuncia ai segnali di questo digest invece di far crashare
    // l'intero run - ma si logga lo stop_reason per distinguere un
    // troncamento reale da un'altra causa, la prossima volta che capita.
    log.error(
      `extractSignals: campo "segnali" mancante o non valido (stop_reason: ${response.stop_reason}, articoli: ${articles.length})`,
    );
    return [];
  }

  const segnaliValidi = parsed.segnali.filter(isSegnaleValido);
  if (segnaliValidi.length < parsed.segnali.length) {
    log.error(
      `extractSignals: ${parsed.segnali.length - segnaliValidi.length} segnale/i scartati per forma non valida (stop_reason: ${response.stop_reason})`,
    );
  }

  return segnaliValidi
    .filter((s): s is RawSegnale & { tipo: SignalType } =>
      (SIGNAL_TYPES as readonly string[]).includes(s.tipo),
    )
    .map((s) => {
      const newsItemIds = s.menzioni
        .map((m) => articles[m.indiceArticolo]?.id)
        .filter((id): id is string => Boolean(id));
      const sentiments = s.menzioni.map((m) => m.sentiment);
      const sentimentMedio =
        sentiments.length > 0
          ? sentiments.reduce((sum, v) => sum + v, 0) / sentiments.length
          : 0;

      return {
        tipo: s.tipo,
        nome: s.nome,
        conteggioMenzioni: newsItemIds.length,
        sentimentMedio,
        sentimentVarianza: calcolaVarianzaSentiment(sentiments),
        newsItemIds,
      };
    })
    .filter((s) => s.conteggioMenzioni > 0);
}
