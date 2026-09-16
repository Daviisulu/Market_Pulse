# Market Pulse — webapp di indicatori di attenzione mediatica sui mercati

## Contesto

Continuazione della skill `/crea-app`: Fase 1 (requisiti) e Fase 2
(stack) già confermate dall'utente. Questa è la Fase 3 (architettura),
l'ultimo checkpoint prima di scrivere codice.

**Cosa deve fare**: raccogliere notizie mondiali (crypto + mercati
tradizionali), trasformarle in indicatori di "dove si concentra
l'attenzione" (entità/temi in aumento di copertura, con sentiment),
mostrarli in una dashboard con una spiegazione didattica per ogni
segnale rilevante. Obiettivo dichiarato ma non immediato: diventare uno
specchietto per decisioni di investimento, solo dopo aver dimostrato
quanto gli indicatori sono davvero predittivi — per questo si raccoglie
fin da subito, in parallelo ai segnali, anche il prezzo reale degli
asset coinvolti, così da poter validare più avanti riusando il
framework di backtesting/overfitting già presente in `Trading/` del
vault Brain (walk-forward analysis, PBO/CSCV, Deflated Sharpe Ratio).

Solo per l'utente, nessun login. Digest periodico (non tempo reale).
Hosting locale per ora.

## Nome e posizione del progetto

`market-pulse`, in `C:\Users\Ambienteimpresa\Desktop\market-pulse\` —
cartella separata da `Desktop\Brain\` (vault) e sibling di
`Desktop\File\` (intake), progetto software a sé.

## Struttura di cartelle — monolite modulare, due entry point

Un solo repository, ma **ingestion e dashboard sono processi separati**
che condividono solo lo schema Prisma/DB — non un'API route Next.js con
cron: il vault ha già una nota su come il piano Hobby di Vercel limiti i
cron a 1 esecuzione/giorno con fino a 59 minuti di imprecisione, quindi
l'ingestion resta uno script indipendente, schedulabile dal sistema
operativo (Windows Task Scheduler, stesso meccanismo già in uso per
`Brain-RoutineFonti`) indipendentemente da dove la dashboard verrà
ospitata in futuro.

```
market-pulse/
├── prisma/
│   └── schema.prisma          # schema dati condiviso (SQLite)
├── app/                        # Next.js App Router (dashboard)
│   ├── page.tsx                  # vista "trending" del digest più recente
│   ├── digest/[id]/page.tsx      # vista di un digest storico specifico
│   └── layout.tsx
├── components/                 # componenti React condivisi dalla dashboard
├── lib/
│   ├── db.ts                     # client Prisma condiviso
│   └── types.ts                  # tipi condivisi tra ingestion e dashboard
├── ingestion/                   # script standalone, non parte del server Next.js
│   ├── run-digest.ts             # entry point eseguito dal Task Scheduler
│   ├── sources/
│   │   ├── news-rss.ts           # fetch + parsing feed RSS (crypto + finanza)
│   │   ├── price-crypto.ts       # CoinGecko (pubblica, no chiave)
│   │   └── price-stocks.ts       # Yahoo Finance (non ufficiale, no chiave)
│   ├── analysis/
│   │   ├── extract-entities.ts   # Claude Haiku: entità + sentiment per articolo
│   │   └── explain-trending.ts   # Claude Sonnet: spiegazione didattica (solo trending)
│   └── log.ts                    # log su file dei run (successo/errore)
├── test/                        # Vitest
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## Modello dati essenziale (Prisma / SQLite)

- **Digest** — un run dell'ingestion (id, creatoIl, periodoCoperto)
- **NewsItem** — un articolo raccolto (id, digestId, fonte, url, titolo,
  estratto, dataPubblicazione)
- **Signal** — un'entità/tema estratto in un digest (id, digestId, tipo
  [azienda/asset/settore/paese/tema], nome, conteggioMenzioni,
  sentimentMedio, variazioneRispettoAlDigestPrecedente)
- **Explanation** — spiegazione didattica generata solo per i Signal
  "trending" (id, signalId, testo, modelloUsato)
- **PriceSnapshot** — prezzo di chiusura giornaliero dell'asset legato a
  un Signal, raccolto per la validazione futura (id, digestId, ticker,
  tipo [crypto/azione/indice], prezzoChiusura, data)

Relazioni: Digest 1—N NewsItem, Digest 1—N Signal, Signal 1—1
Explanation (solo trending), Signal 1—N PriceSnapshot.

## Punti di integrazione esterni

- RSS feed (lista curata iniziale hardcoded, no chiave API)
- CoinGecko API pubblica (crypto, no chiave)
- Yahoo Finance via libreria `yahoo-finance2` (azionario/indici, no
  chiave, non ufficiale — noto rischio di rottura, accettabile per un
  progetto personale)
- Anthropic API (Claude) — richiede `ANTHROPIC_API_KEY` in `.env`, Haiku
  per estrazione entità/sentiment, Sonnet per le spiegazioni didattiche
- Windows Task Scheduler (esterno al codice) — invoca `npm run digest`
  a intervalli regolari

## Ordine di implementazione (Fase 5 della skill)

1. ~~Scaffold + `prisma/schema.prisma` + prima migrazione SQLite~~ (fatto)
2. `ingestion/sources/news-rss.ts` — raccolta e salvataggio `NewsItem`
   grezzi (verificabile subito: righe nel DB dopo l'esecuzione)
3. `ingestion/analysis/extract-entities.ts` — `NewsItem` → `Signal`
   (entità + sentiment via Claude Haiku)
4. `ingestion/sources/price-crypto.ts` + `price-stocks.ts` — arricchisce
   i Signal con `PriceSnapshot`
5. `ingestion/analysis/explain-trending.ts` — `Explanation` solo per i
   Signal sopra una soglia di "trending" (soglia esatta da definire in
   implementazione, es. variazione menzioni vs digest precedente)
6. `run-digest.ts` — orchestratore degli step 2-5, con logging
7. Dashboard Next.js: vista digest più recente, poi storico digest
8. Test Vitest: parsing RSS (con fixture) e logica di trending (pura,
   facilmente testabile) — le chiamate Claude/API esterne si mockano,
   non si testano dal vivo nella suite automatica

## Cosa NON è in questa prima versione

Coerente con la Fase 1: modulo di reliability scoring vero e proprio
(serve accumulare `PriceSnapshot` per settimane/mesi prima di avere
senso statistico), dati whale on-chain/istituzionali come input del
segnale, autenticazione/multi-utente, tempo reale, notifiche.

## Verifica end-to-end

- `npm run digest` in locale produce righe nuove nel DB SQLite
  (verificabile con Prisma Studio o una query diretta)
- `npm run dev` avvia la dashboard, che mostra il digest più recente con
  almeno un Signal e la sua spiegazione
- Suite Vitest verde su parsing RSS e logica di trending
- Nessun segreto committato: `.env` in `.gitignore`, solo `.env.example`
  versionato

## Note emerse durante lo scaffold (Fase 4)

- Prisma 7 ha cambiato il modo di configurare la connessione: niente
  più `url` nel blocco `datasource` dello schema, ma un
  `prisma.config.ts` (per CLI/migrazioni) + un driver adapter passato a
  `PrismaClient` (per il runtime) — vedi `lib/db.ts`. Non era nella
  proposta di stack originale, scoperto durante lo scaffold effettivo.
- Il client Prisma generato vive in `generated/` (non `node_modules/@prisma/client`
  come nelle versioni precedenti), non versionato, rigenerato da
  `prisma generate` (script `postinstall`).
- 4 vulnerabilità "high" segnalate da `npm audit` restano note e
  accettate: vivono nelle dipendenze di dev-tooling di Prisma stesso
  (`deepmerge-ts`, `mysql2` — quest'ultimo bundlato anche se il progetto
  usa solo SQLite), non nel codice eseguito in produzione/runtime
  dell'app. Risolverle richiederebbe un downgrade a Prisma 6.x, una
  regressione non giustificata per un progetto locale a singolo utente.
