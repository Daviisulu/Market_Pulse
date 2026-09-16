// Rollup per settore/area geografica: i Signal di tipo "settore" e
// "paese" sono già estratti come entità di prima classe (vedi
// SIGNAL_TYPES in lib/types.ts) quando le notizie parlano direttamente
// di un settore o di un'area geografica — non serve una mappa curata
// azienda→settore per mostrarli, basta raggrupparli per tipo e
// ordinarli per quotaAttenzione, come già si fa per gli altri Signal.
//
// Non aggrega (ancora) le menzioni di aziende/asset SOTTO il loro
// settore/paese di appartenenza — l'idea originale in
// docs/idee-indicatori.md ("Rollup per settore") lo prevede, ma richiede
// una mappa di classificazione curata che non esiste ancora. Qui ci si
// limita a dare risalto a ciò che le notizie hanno già taggato
// esplicitamente come tema settoriale/geografico.

export interface VoceRollup {
  nome: string;
  quotaAttenzione: number;
  sentimentMedio: number;
}

interface SignalRollup {
  tipo: string;
  nome: string;
  quotaAttenzione: number;
  sentimentMedio: number;
}

export interface RollupEntita {
  settori: VoceRollup[];
  paesi: VoceRollup[];
}

function estraiOrdinato(signals: SignalRollup[], tipo: string): VoceRollup[] {
  return signals
    .filter((s) => s.tipo === tipo)
    .map((s) => ({
      nome: s.nome,
      quotaAttenzione: s.quotaAttenzione,
      sentimentMedio: s.sentimentMedio,
    }))
    .sort((a, b) => b.quotaAttenzione - a.quotaAttenzione);
}

export function calcolaRollupEntita(signals: SignalRollup[]): RollupEntita | null {
  const settori = estraiOrdinato(signals, "settore");
  const paesi = estraiOrdinato(signals, "paese");
  if (settori.length === 0 && paesi.length === 0) return null;
  return { settori, paesi };
}
