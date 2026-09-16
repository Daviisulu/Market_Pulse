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
- **PriceSnapshot** — prezzo dell'asset legato a un Signal nel momento in
  cui gira il digest, raccolto per la validazione futura (id, digestId,
  ticker, tipo [crypto/azione/indice], prezzoChiusura, data). **Non è
  sempre un prezzo di "chiusura" in senso stretto** (vedi decisione sulla
  frequenza sotto: con 3 digest al giorno, solo quello delle 22:00
  corrisponde a una vera chiusura di mercato USA, gli altri due sono
  prezzi intraday) — il nome del campo resta `prezzoChiusura` per non
  aggiungere una migrazione solo per una rinomina, ma va letto come
  "prezzo al momento della rilevazione".

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

Tutti gli 8 step completati (step 4-8 svolti su un altro dispositivo il
2026-09-15, senza accesso alla skill `/crea-app` — non sincronizzata dal
vault — ma seguendo questo stesso piano; revisionati e verificati di
persona il 2026-09-16: 28/28 test, tsc/lint/build puliti).

1. ~~Scaffold + `prisma/schema.prisma` + prima migrazione SQLite~~
2. ~~`ingestion/sources/news-rss.ts`~~
3. ~~`ingestion/analysis/extract-entities.ts`~~
4. ~~`ingestion/sources/price-crypto.ts` + `price-stocks.ts`~~
5. ~~`ingestion/analysis/explain-trending.ts` + `ingestion/analysis/trending.ts`~~
   (soglia di "trending" isolata in un modulo puro, non previsto nel piano
   originale come file a sé — vedi "Decisione sulla frequenza" sotto)
6. ~~`run-digest.ts`~~ — orchestratore di tutti gli step sopra
7. ~~Dashboard Next.js~~ — vista digest più recente + storico, restyling
   con Glassmorphism/Bento grid dal vault (vedi
   `docs/sessione-2026-09-15-fasi-4-7.md`)
8. ~~Test Vitest~~ — 28 test, 6 file, nessuna chiamata di rete/Claude reale
   nella suite automatica

## Decisione sulla frequenza del digest (2026-09-16)

**3 digest al giorno, solo lun-ven, orari Italia**:

- **08:00** — copre la notte, i mercati asiatici, l'attività crypto
  overnight
- **12:00** — mercati europei già aperti, polso di metà giornata
- **22:00** — chiusura NYSE/Nasdaq (16:00 ET, coincide quasi sempre con
  le 22:00 italiane; scarto di un'ora nelle ~2 settimane l'anno in cui UE
  e USA non sono ancora allineate sul cambio ora legale)

Weekend saltati: i mercati tradizionali sono chiusi, e anche il crypto
(tecnicamente 24/7) ha un calo forte di copertura editoriale il weekend
— non vale la complessità di gestirlo diversamente per ora.

**Due conseguenze pratiche, non ancora risolte nel codice**:

- Le finestre tra un digest e il successivo non sono uguali (08→12 = 4h,
  12→22 e 22→08 = 10h ciascuna): confrontare `conteggioMenzioni` tra
  digest consecutivi non è mai un confronto a parità di finestra
  temporale. Motivo in più, insieme all'idea "share of voice" già in
  `docs/idee-indicatori.md`, per non affezionarsi alle soglie numeriche
  assolute attuali di `trending.ts` — restano "da ricalibrare quando c'è
  storico reale" (commento già presente nel file).
- Solo il digest delle 22:00 produce un vero `PriceSnapshot` di
  "chiusura" in senso stretto — vedi nota sul modello dati sopra.

## Cosa NON è in questa prima versione

Coerente con la Fase 1: modulo di reliability scoring vero e proprio
(serve accumulare `PriceSnapshot` per settimane/mesi prima di avere
senso statistico), dati whale on-chain/istituzionali come input del
segnale, autenticazione/multi-utente, tempo reale, notifiche.

## Verifica end-to-end

- ~~`npm run digest` in locale produce righe nuove nel DB SQLite~~ —
  verificato il 2026-09-15 con una chiamata reale (15 articoli → 24
  Signal estratti, categorie/sentiment plausibili)
- `npm run dev` avvia la dashboard — verificato via screenshot Playwright
  su dati finti (rimossi subito dopo), non ancora su un digest reale
  completo
- Suite Vitest verde su parsing RSS e logica di trending (28/28 test)
- Nessun segreto committato: `.env` in `.gitignore`, solo `.env.example`
  versionato
- **Non ancora verificato**: un run reale completo di `npm run digest`
  con i 3 orari programmati su Task Scheduler (vedi sotto)

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

## Congelamento feature fino al 2026-09-23

Decisione esplicita dell'utente il 2026-09-16, dopo una valutazione
onesta dello stato del progetto: **2 dei 4 digest reali tentati oggi
sono falliti** (risposta Claude troncata, 0 segnali). Troppe feature
di analisi (HHI, attenzione/capitalizzazione, watchlist, sintesi
narrativa...) erano state costruite sopra una pipeline che non aveva
ancora dimostrato di reggere da sola. Il backlog in
`docs/idee-indicatori.md` resta congelato fino al 2026-09-23 — nessuna
nuova feature/indicatore prima di quella data, indipendentemente da
quali idee sembrano buone nel frattempo.

Nel periodo di congelamento, il lavoro deve concentrarsi su affidabilità
operativa, non su nuove analisi:

- **Fatto il 2026-09-16**: un digest con 0 segnali (Claude troncato,
  o nessuna notizia raccolta) ora esce con codice 1 invece di 0 — prima
  usciva come un successo, invisibile a qualunque controllo automatico.
  Aggiunta una notifica toast Windows nativa (`scripts/notifica-esito-digest.ps1`,
  chiamata da `run-digest-scheduled.bat`) che segnala un fallimento senza
  dover controllare `scheduled-run.log` a mano, più un file di stato
  sempre aggiornato (`scripts/ultimo-esito.txt`, non versionato).
- **Fatto il 2026-09-16**: diagnosticato (non solo aggirato) il problema
  dello schema-engine Prisma su questo dispositivo ("spawn UNKNOWN" su
  Node 24/Windows per un sottocomando specifico — il binario stesso
  funziona perfettamente se lanciato direttamente, verosimilmente un
  antivirus che doveva "fidarsi" del file la prima volta). Riconciliata
  la tabella `_prisma_migrations` con `prisma migrate resolve --applied`
  per le migrazioni applicate a mano nei giorni scorsi — `prisma migrate
  status` ora conferma lo schema allineato, non serve più applicare SQL
  a mano ad ogni nuova migrazione.
- **Da tenere d'occhio nel periodo di congelamento**: se il problema
  dello schema-engine si ripresenta (es. dopo un riavvio, o su un
  antivirus che dimentica la "fiducia" accordata), il sintomo è
  "spawn UNKNOWN" e la diagnosi rapida è: lanciare
  `./node_modules/@prisma/engines/schema-engine-windows.exe --help`
  direttamente — se funziona, il binario è sano e il problema è nello
  spawn di Node/nell'antivirus, non nel Prisma Client generato.

**Alla riapertura (dal 2026-09-23)**: rivalutare il backlog con lo
storico reale accumulato nel frattempo (attesi ~30 digest con 3
run/giorno lun-ven), non a priori — diverse idee di Livello 2/3 (market
mood nel tempo, tasso di successo dei segnali trending, correlazioni)
diventano costruibili solo a quel punto.
