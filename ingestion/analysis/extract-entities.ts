import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, MODELS } from "../../lib/anthropic";
import { SIGNAL_TYPES, type SignalType } from "../../lib/types";
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

interface RawExtraction {
  segnali: {
    tipo: string;
    nome: string;
    menzioni: { indiceArticolo: number; sentiment: number }[];
  }[];
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
    max_tokens: 4096,
    tools: [EXTRACTION_TOOL],
    tool_choice: { type: "tool", name: EXTRACTION_TOOL.name },
    messages: [{ role: "user", content: buildPrompt(articles) }],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );
  if (!toolUse) {
    log.error("extractSignals: nessun tool_use nella risposta di Claude");
    return [];
  }

  const parsed = toolUse.input as RawExtraction;

  return parsed.segnali
    .filter((s): s is RawExtraction["segnali"][number] & { tipo: SignalType } =>
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
        newsItemIds,
      };
    })
    .filter((s) => s.conteggioMenzioni > 0);
}
