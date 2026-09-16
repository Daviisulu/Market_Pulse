# Sessione 2026-09-15 — Fasi 4-7 (prezzi, spiegazioni, orchestratore, dashboard)

Continuazione di `piano-architettura.md`, svolta **da un altro dispositivo**
(quello dove gira il vault Brain Sync) rispetto a quello che ha creato le
Fasi 1-3 con la skill `/crea-app`. La skill vive in `~/.claude/` locale a
quel dispositivo (non sincronizzato dal vault), quindi qui non era
disponibile: si è proceduto seguendo direttamente `piano-architettura.md`
già scritto, senza il suo flusso interattivo a checkpoint. Riprende dal
punto in cui erano state completate solo le Fasi 1-3 (scaffold,
`news-rss.ts`, `extract-entities.ts`).

**Stato ambiente al momento dell'analisi iniziale**: `node_modules`
risultava corrotto/incompleto dopo il trasferimento via zip (mancavano file
di `vitest` e `prisma`, e conteneva pacchetti estranei non presenti in
`package.json`) — risolto con `rm -rf node_modules && npm install`.
`npm test` prima falliva per questo, non per il codice.

## Cosa è stato implementato

### Fase 4 — `ingestion/sources/price-crypto.ts` e `price-stocks.ts`

- **price-crypto.ts**: CoinGecko (`/simple/price`, pubblica, no chiave).
  Mappa curata nome→ID CoinGecko (10 asset: Bitcoin, Ethereum, Solana, XRP,
  Cardano, Dogecoin, BNB, Shiba Inu, Polkadot, Litecoin) — stesso principio
  "piccola lista verificata" già usato per i feed RSS in `news-rss.ts`. Un
  nome non mappato viene ignorato silenziosamente (loggato), non genera
  errore.
- **price-stocks.ts**: Yahoo Finance via `yahoo-finance2`. Mappa curata
  nome→ticker per 7 aziende (Nvidia, Apple, Microsoft, Tesla, Amazon,
  Google, Meta) e 3 indici (S&P 500, Nasdaq, Dow Jones).
  **Attenzione (breaking change di libreria, scoperto solo con `tsc`)**:
  `yahoo-finance2` v4 esporta la **classe** client, non un'istanza pronta —
  va istanziata con `new YahooFinance()`, non usata come singleton
  (`import yahooFinance from "yahoo-finance2"` da solo non basta). Il primo
  tentativo compilava male (`Property 'regularMarketPrice' does not exist
  on type 'never'`); risolto istanziando esplicitamente la classe.
- Entrambi i moduli: un asset/ticker che fallisce non blocca gli altri
  (stesso pattern `Promise.allSettled`/try-catch per-item già visto in
  `news-rss.ts` per i feed).

### Fase 5 — `ingestion/analysis/explain-trending.ts`

Claude Sonnet (`MODELS.explanation`), riceve il Signal trending **con gli
articoli reali** da cui è stato estratto come contesto — non fa scrivere a
Claude una spiegazione senza fonti sotto mano. Prompt istruisce
esplicitamente a non dare consigli di investimento, non inventare
numeri/fatti assenti dagli articoli, e a dichiarare "non c'è abbastanza
contesto" invece di indovinare se gli articoli non bastano.

### Nuovo modulo non nel piano originale — `ingestion/analysis/trending.ts`

Il piano diceva "soglia esatta da definire in implementazione" per capire
quali Signal sono trending. Ho isolato questa decisione in un modulo puro
(nessuna dipendenza DB/rete, facile da testare — coerente con la Fase 8 del
piano "logica di trending pura, testabile"):

- **Segnale mai visto prima**: trending se ha ≥3 menzioni nel digest.
- **Segnale già visto in un digest precedente**: trending se le menzioni
  crescono di almeno il 50% rispetto a prima.

Soglie scelte a giudizio, **non da nessuna fonte esterna** — segnalale
esplicitamente come punto da ricalibrare quando c'è storico reale
(coerente con "Cosa NON è in questa prima versione" del piano). Vanno
riviste se in produzione risultano troppo/poco permissive.

### Fase 6 — `ingestion/run-digest.ts`

Orchestratore: raccoglie notizie → crea `Digest` → salva `NewsItem` → estrae
`Signal` (con `variazioneRispettoAlDigestPrecedente` calcolata confrontando
col digest precedente per stesso nome+tipo) → instrada i Signal di tipo
`asset`/`azienda` verso CoinGecko o Yahoo Finance in base al nome → salva
`PriceSnapshot` → genera `Explanation` solo per i Signal trending. Logga
un riepilogo finale (articoli/segnali/trending). Era referenziato da
`package.json` (`npm run digest`) ma non esisteva ancora: prima di questa
sessione lo script avrebbe fallito all'avvio.

### Fase 7 — Dashboard

- `components/SignalCard.tsx` — card riusata da entrambe le viste
  (menzioni, sentiment con etichetta positivo/neutro/negativo, variazione %
  vs digest precedente, prezzo se disponibile, spiegazione se trending).
- `components/DigestList.tsx` — elenco link ai digest precedenti.
- `app/page.tsx` — riscritta da zero: prima era ancora il boilerplate di
  `create-next-app` ("To get started, edit the page.tsx file..."), non
  toccato dalle Fasi 1-3. Mostra il digest più recente + link allo storico.
- `app/digest/[id]/page.tsx` — vista di un digest storico specifico (non
  esisteva neanche come file, solo la cartella `app/digest/[id]/` vuota).
- `app/layout.tsx` — aggiornato solo il `metadata` (titolo/descrizione
  ancora "Create Next App" da boilerplate).

**Nota tecnica Next.js 16** (coerente con l'avviso in `AGENTS.md` — "This is
NOT the Next.js you know"): le pagine usano il tipo globale generato
`PageProps<'/digest/[id]'>` invece di tipizzare `params` a mano. Questo
tipo viene rigenerato automaticamente da `next dev`/`next build`/
`next typegen` in `.next/types/routes.d.ts` — se in una sessione futura
`tsc --noEmit` segnala che la route non esiste ancora in `AppRoutes`,
lanciare `npx next typegen` prima di preoccuparsi.

### Test aggiunti

`test/trending.test.ts`, `test/price-crypto.test.ts` (mock di `fetch`
globale), `test/price-stocks.test.ts` (mock del modulo `yahoo-finance2`,
aggiornato per riflettere l'istanza di classe) — stesso stile già in uso
(mock espliciti, nessuna chiamata di rete/Claude reale nella suite).

## Verifiche eseguite (nessuna chiamata esterna reale)

- `npm test` → 28/28 test passati (6 file: i 3 preesistenti + i 3 nuovi).
- `npx tsc --noEmit` → nessun errore.
- `npm run lint` → nessun errore.
- `npm run build` → build di produzione completata; `/` e `/digest/[id]`
  correttamente marcate dinamiche (`ƒ`), non prerenderizzate staticamente
  (coerente con `export const dynamic = "force-dynamic"` su entrambe: la
  dashboard deve leggere il digest più recente a ogni richiesta).

**Non eseguito volutamente**: `npm run digest` — farebbe chiamate reali a
CoinGecko, Yahoo Finance, e all'API Anthropic (a pagamento). Da lanciare
manualmente quando si vuole il primo digest reale end-to-end.

### Aggiunta successiva nella stessa sessione — restyling visivo

Su richiesta esplicita dell'utente, dopo aver visto la dashboard col
layout di default ("riusciamo a rendere visivamente migliore usando
anche gli stili che abbiamo nel vault?"), riferendosi al vault Brain
Sync dove nella stessa sessione sono state create le categorie
`Design-Apple/`, `Design-Material/`, `Design-Fluent/`,
`Design-Glassmorphism/`, `Design-Neumorphism/`,
`Design-Tendenze-Web-Moderne/`. Scelta deliberata, non applicare tutto:

- **Glassmorphism** (`Design-Glassmorphism/anatomia-css-di-una-card...`):
  ricetta CSS usata quasi verbatim (sfondo semi-trasparente,
  `backdrop-filter: blur(20px)`, bordo sottile, ombre esterne+interne) in
  una classe `.glass` in `app/globals.css`, applicata a tutte le card.
  Serve uno sfondo colorato dietro per essere visibile: aggiunto un
  fondo con tre gradienti radiali (variabili CSS, diverse in dark mode).
- **Bento grid** (`Design-Tendenze-Web-Moderne/il-bento-grid...`): i
  Signal con una spiegazione (trending) occupano `sm:col-span-2` invece
  di un blocco uniforme — asimmetria controllata sulla stessa griglia,
  non un layout diverso per ogni caso.
- **Font di sistema** (`Design-Apple/il-valore-system-ui...`): rimossi i
  webfont Geist caricati via `next/font/google` in `app/layout.tsx`, in
  favore di `font-family: system-ui, sans-serif` — eredita San Francisco
  su Apple, Segoe UI su Windows, Roboto su Android, senza dipendere da un
  font scaricato.
- **`prefers-color-scheme` e `prefers-reduced-motion`**
  (`Design-Apple/la-media-query-prefers-...`): dark mode già presente
  nel progetto (Tailwind v4, variante `dark:` su media query) esteso a
  tutte le nuove variabili CSS (sfondo, vetro, colori sentiment); le
  transizioni hover sulle card sono avvolte in
  `@media (prefers-reduced-motion: no-preference)`.
- **Deliberatamente NON usati**: neumorphism (il vault ne documenta
  esplicitamente il rischio di accessibilità — pulsanti indistinguibili
  dallo sfondo, vedi `Design-Neumorphism/`) e neobrutalismo (tono
  cromatico/tipografico che stonerebbe con una dashboard di dati
  finanziari, per quanto il vault lo documenti come tendenza valida in
  altri contesti). Colore riservato a sentiment/variazione (un accento
  puntuale, non l'intera card tinta) — coerente con il principio
  "tinting solo per enfasi selettiva" delle note su Liquid Glass.

**Verifica**: screenshot reale via Playwright (installato temporaneamente
con `npm install --no-save`, poi disinstallato) contro dati finti inseriti
localmente (nessuna chiamata a Claude/CoinGecko/Yahoo) e rimossi subito
dopo lo screenshot — nessun dato di test è rimasto nel DB. `tsc`, lint e
la suite di test restano puliti dopo il redesign.

## Cosa NON è stato toccato

- Il modulo di reliability scoring vero e proprio (esplicitamente fuori
  scope anche nel piano originale).
- Il problema pre-esistente per cui `ingestion/log.ts` scrive su file reale
  (`ingestion/digest.log`) anche durante `vitest run`, non mockato nei test
  esistenti né in quelli nuovi — le righe di errore nel log dopo una run di
  test sono artefatti dei fixture, non fallimenti reali. Non l'ho corretto
  perché tocca file di test già scritti nelle Fasi 2-3 (fuori dallo scope
  di questa sessione), ma segnalo che varrebbe la pena mockare `log` nella
  suite se si vuole un log pulito.
- Nessun commit git: tutto lo stato precedente (Fasi 1-3) risultava già in
  staging ma **mai committato** (`git status` mostrava "No commits yet");
  ho aggiunto i file nuovi ma non ho fatto `git add`/`git commit` di nulla —
  lasciato alla revisione.

## Per la revisione dall'altro dispositivo

1. Le soglie di `trending.ts` (3 menzioni per un segnale nuovo, +50% per uno
   esistente) sono una scelta arbitraria di chi ha scritto questa sessione,
   non discussa con l'utente né derivata da una fonte: da confermare o
   correggere.
2. Le mappe curate nome→ID (CoinGecko) e nome→ticker (Yahoo Finance) sono
   piccole e limitate agli asset più comuni citati nell'esempio del piano
   originale (Bitcoin, Nvidia, oro...) — "oro"/commodity in genere non è
   coperto (lo schema Prisma non ha un tipo `commodity` in `PriceSnapshot`,
   solo crypto/azione/indice): da decidere se e come estenderlo. Estendere
   le mappe è semplice (una riga per asset) ma richiede giudizio su quali
   asset sono ricorrenti abbastanza da meritarlo.
3. La breaking change di `yahoo-finance2` v4 (classe da istanziare, non
   singleton) non era nella proposta di stack originale — stesso tipo di
   sorpresa già capitata con Prisma 7 nelle Fasi 1-3.
4. Non è ancora stato eseguito un `npm run digest` reale: prima release
   end-to-end da verificare manualmente (richiede `ANTHROPIC_API_KEY`
   valida in `.env`).
