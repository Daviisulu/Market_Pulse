// Sintesi narrativa del digest: 2-3 frasi che danno il quadro generale
// invece di lasciare che sia l'utente a dedurlo leggendo ogni card una
// per una. Calcolata dai dati già presenti (menzioni, quota
// attenzione, sentiment, primaComparsa, variazione) — nessuna chiamata
// Claude in più, "alternativa architetturale" alla card come unico
// contenitore di informazione (vedi docs/idee-indicatori.md, sezione
// "Idea di presentazione, non un indicatore").

export interface SignalePerSintesi {
  nome: string;
  conteggioMenzioni: number;
  quotaAttenzione: number;
  sentimentMedio: number;
  primaComparsa: boolean;
  variazioneRispettoAlDigestPrecedente: number | null;
}

function sentimentLabel(v: number): string {
  if (v > 0.15) return "positivo";
  if (v < -0.15) return "negativo";
  return "neutro";
}

// Passa la stessa lista già filtrata per la visualizzazione (vedi
// SOGLIA_MENZIONI_MINIME_VISUALIZZAZIONE in lib/soglie.ts): la sintesi
// deve raccontare quello che si vede in pagina, non segnali nascosti.
export function sintetizzaDigest(signals: SignalePerSintesi[]): string | null {
  if (signals.length === 0) return null;

  const totaleMenzioni = signals.reduce((sum, s) => sum + s.conteggioMenzioni, 0);
  const sentimentPesato =
    signals.reduce((sum, s) => sum + s.sentimentMedio * s.conteggioMenzioni, 0) /
    totaleMenzioni;

  const temaPrincipale = [...signals].sort((a, b) => b.quotaAttenzione - a.quotaAttenzione)[0];

  const nuovi = signals.filter((s) => s.primaComparsa);

  const maggiorCrescita = [...signals]
    .filter(
      (s): s is SignalePerSintesi & { variazioneRispettoAlDigestPrecedente: number } =>
        s.variazioneRispettoAlDigestPrecedente !== null &&
        s.variazioneRispettoAlDigestPrecedente > 0,
    )
    .sort((a, b) => b.variazioneRispettoAlDigestPrecedente - a.variazioneRispettoAlDigestPrecedente)[0];

  const frasi: string[] = [];

  frasi.push(
    `Il tema più discusso è "${temaPrincipale.nome}" (${temaPrincipale.conteggioMenzioni} menzioni, ${(
      temaPrincipale.quotaAttenzione * 100
    ).toFixed(0)}% degli articoli).`,
  );

  frasi.push(`Il sentiment generale della giornata è ${sentimentLabel(sentimentPesato)}.`);

  if (nuovi.length === 1) {
    frasi.push(`È comparso per la prima volta: ${nuovi[0].nome}.`);
  } else if (nuovi.length > 1) {
    const elenco = nuovi.slice(0, 3).map((s) => s.nome).join(", ");
    const altri = nuovi.length > 3 ? ", tra gli altri" : "";
    frasi.push(`Sono comparsi per la prima volta ${nuovi.length} temi: ${elenco}${altri}.`);
  }

  if (maggiorCrescita && maggiorCrescita.nome !== temaPrincipale.nome) {
    frasi.push(
      `"${maggiorCrescita.nome}" ha la crescita di attenzione più marcata (+${(
        maggiorCrescita.variazioneRispettoAlDigestPrecedente * 100
      ).toFixed(0)}% rispetto al digest precedente).`,
    );
  }

  return frasi.join(" ");
}
