import { SOGLIA_MENZIONI_MINIME_VISUALIZZAZIONE } from "./soglie";

// Argomenti Prisma per la relazione "signals" di un Digest, condivisi
// tra app/page.tsx e app/digest/[id]/page.tsx (prima duplicati
// letteralmente nei due file, rischio di far divergere le due pagine
// modificando solo una). Da passare a `include.signals` in una query
// `db.digest.findFirst`/`findUnique`.
export const SIGNALS_QUERY_ARGS = {
  where: { conteggioMenzioni: { gte: SOGLIA_MENZIONI_MINIME_VISUALIZZAZIONE } },
  include: {
    explanation: true,
    priceSnapshots: true,
    // Solo la categoria, non l'articolo intero: serve unicamente per
    // risalire alla categoria dominante del segnale (lib/categoria-mercato.ts).
    newsItems: { select: { categoria: true } },
  },
  orderBy: { conteggioMenzioni: "desc" },
} as const;

// _count.signals conta TUTTI i Signal del digest, senza risentire del
// filtro "where" sopra — serve per la soglia di bassa attività, che
// deve riflettere quanto è successo davvero nel digest, non quanti
// segnali sono sopravvissuti al filtro di visualizzazione (un digest
// con 12 segnali di cui 8 a una sola menzione non è "poco attivo",
// è filtrato).
export const DIGEST_COUNT_ARGS = { select: { signals: true } } as const;
