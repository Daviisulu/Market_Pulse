# Market Pulse

Webapp personale che raccoglie notizie mondiali (crypto + mercati
tradizionali) e le trasforma in indicatori di "dove si concentra
l'attenzione" — entità/temi in aumento di copertura mediatica, con
sentiment — mostrati in una dashboard con una spiegazione didattica per
ogni segnale rilevante.

**Cosa NON è (ancora)**: un consiglio di investimento. Gli indicatori
misurano attenzione mediatica, non un segnale di mercato validato — per
questo, in parallelo a ogni segnale, il sistema registra anche il
prezzo reale degli asset coinvolti nei giorni successivi. Solo quando
ci sarà storico sufficiente si potrà misurare quanto questi indicatori
sono davvero predittivi (vedi `ingestion/analysis/` e
`docs/piano-architettura.md` per il ragionamento completo).

## Stack

- Dashboard: Next.js (App Router) + TypeScript + React + Tailwind
- Ingestion: script standalone Node.js/TypeScript (`ingestion/`), non
  una route Next.js — schedulato dal sistema operativo (Task
  Scheduler), non da un cron Next.js/Vercel
- Dati: SQLite via Prisma (adapter `@prisma/adapter-better-sqlite3`,
  richiesto da Prisma 7)
- Analisi testo: API Claude (Haiku per estrazione entità/sentiment,
  Sonnet per le spiegazioni didattiche)
- Prezzi: CoinGecko (crypto), Yahoo Finance non ufficiale (azionario)
- Test: Vitest

## Avvio in locale

```bash
npm install          # esegue anche `prisma generate` (postinstall)
cp .env.example .env # poi imposta ANTHROPIC_API_KEY
npm run db:migrate   # solo se prisma/dev.db non esiste ancora
npm run dev          # dashboard su http://localhost:3000
npm run digest       # esegue una raccolta/analisi manuale
npm test             # suite Vitest
npm run db:studio    # esplora il DB SQLite con Prisma Studio
```

## Variabili d'ambiente

Vedi `.env.example`:

- `DATABASE_URL` — percorso del file SQLite locale (default va bene)
- `ANTHROPIC_API_KEY` — chiave API Claude, necessaria sia per
  l'ingestion che per le spiegazioni didattiche

## Note tecniche

- **Perché l'ingestion non è un cron Next.js**: il piano Hobby di
  Vercel limita i cron a 1 esecuzione/giorno con fino a 59 minuti di
  imprecisione — non regge un digest orario, e l'architettura non deve
  dipendere da dove verrà eventualmente ospitata la dashboard.
- **Perché Prisma richiede un adapter invece del solo `DATABASE_URL`
  nello schema**: cambiamento introdotto in Prisma 7 — la connessione
  ora vive in `prisma.config.ts` (per CLI/migrazioni) e in un
  `driver adapter` passato a `PrismaClient` (per il runtime), vedi
  `lib/db.ts`.
- Il client Prisma generato vive in `generated/` (non versionato,
  rigenerato da `prisma generate`/`postinstall`).
