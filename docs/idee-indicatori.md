# Idee per nuovi indicatori — backlog

Non è un piano di implementazione: è un elenco di idee raccolte
buttandole giù in sessione, da riprendere quando si decide di
implementarne una. Nessuna delle idee qui sotto è stata costruita.

## Perché diviso in 3 livelli

Rischio esplicito sollevato dall'utente: più indicatori non è
automaticamente meglio — la card rischia di diventare confusionaria, e
non tutto ha senso alla stessa frequenza (ogni digest vs
settimanale/mensile). Per questo ogni idea è classificata per **dove va
mostrata**, non solo per "quanto è interessante":

- **Livello 1** — sulla card del Signal, visibile a ogni digest. Deve
  restare minimo: aggiungere qui ha un costo diretto in chiarezza.
- **Livello 2** — vista aggregata separata (settimanale/mensile), non
  sulla card principale. Roba da consultare meno spesso.
- **Livello 3** — calcolato e salvato, non mostrato in UI per ora.
  Alimenta la futura validazione/reliability scoring (già previsto come
  step successivo in `piano-architettura.md`) — ha senso accumularlo
  silenziosamente prima di avere abbastanza storico per mostrarlo.

Quando si decide di implementare un'idea, questo file va aggiornato
(spuntata/rimossa) invece di lasciarla qui a marcire.

## Livello 1 — sulla card, ogni digest

- [x] **Share of voice invece di conteggio assoluto** — **implementato
  il 2026-09-16** come campo `Signal.quotaAttenzione`
  (`conteggioMenzioni / totale articoli del digest`), usato al posto
  del conteggio grezzo sia per decidere se un segnale esistente è
  trending sia per `variazioneRispettoAlDigestPrecedente`. Il minimo
  assoluto di menzioni (3) resta come filtro anti-rumore separato,
  applicato in aggiunta alla quota, non al suo posto. Deciso in
  conversazione dopo aver fissato la frequenza del digest (3 volte al
  giorno con finestre non uniformi tra loro), che rendeva il problema
  concreto e non solo teorico. Vedi `ingestion/analysis/trending.ts` e
  `docs/piano-architettura.md`.
- [x] **Badge "nuovo"** — **implementato il 2026-09-16** come
  `Signal.primaComparsa`, con il raffinamento incluso fin da subito
  (non solo la versione base): cerca in TUTTO lo storico, non solo il
  digest immediatamente precedente, quindi distingue davvero "mai
  apparso prima" da "torna dopo un'assenza". Una query sola su tutti i
  nome+tipo storici invece di una per segnale. Vedi `ingestion/run-digest.ts`.
- [x] **Etichetta "giornata a bassa attività"** — **implementato il
  2026-09-16**, soglia `SOGLIA_BASSA_ATTIVITA` in `lib/soglie.ts`
  (arbitraria, da ricalibrare con storico reale, come le soglie di
  trending).
- [x] **Watchlist personale** — **implementato il 2026-09-16** come
  `lib/watchlist.ts`, lista curata modificabile a mano (nessuna UI di
  gestione, nessuna tabella DB — corrispondenza per nome, calcolata a
  ogni visualizzazione così vale anche sui digest passati). Set
  iniziale "i principali asset" (richiesta esplicita, non preferenze
  specifiche): Bitcoin, Ethereum, S&P 500, Nasdaq, Dow Jones, Nvidia,
  Apple, Microsoft. Verificato visivamente che l'ordinamento funziona
  davvero (un asset in watchlist con poche menzioni precede uno fuori
  watchlist con molte più menzioni).
- [x] **Volume di scambio reale accanto al prezzo** — **implementato il
  2026-09-16** come `PriceSnapshot.volume` (opzionale), letto dalla
  stessa chiamata già fatta per il prezzo (`usd_24h_vol` su CoinGecko,
  `regularMarketVolume` su Yahoo Finance) — nessuna fonte dati nuova.

## Livello 2 — vista aggregata separata (settimanale/mensile)

- [~] **Rollup per settore/paese** — **versione ridotta implementata il
  2026-09-16** in `lib/rollup-entita.ts`, mostrata come blocco a sé in
  `DigestBody.tsx` ("Per settore" / "Per area geografica"), ordinata per
  quotaAttenzione. Raggruppa solo i Signal già estratti con
  `tipo: "settore"`/`"paese"` (tipi di prima classe in
  `SIGNAL_TYPES`, non serve una mappa curata per mostrarli) — **non**
  aggrega ancora le menzioni di `azienda`/`asset` SOTTO il loro settore
  di appartenenza, che è l'idea originale qui sotto e richiederebbe la
  mappa di classificazione curata: rimane da fare. Da valutare in futuro
  se pesare quell'aggregazione per capitalizzazione delle aziende
  coinvolte invece di contare le menzioni a peso uguale — vedi "Rapporto
  attenzione/capitalizzazione" sotto.
- [x] **Rapporto attenzione/capitalizzazione** — **implementato il
  2026-09-16** in `lib/attenzione-capitalizzazione.ts`: confronta il
  rapporto quotaAttenzione/marketCap di ogni segnale con la mediana del
  gruppo (solo segnali con marketCap noto) ALL'INTERNO dello stesso
  digest, non nel tempo come pensato inizialmente — un confronto storico
  richiederebbe normalizzare per la volatilità propria di ogni asset,
  rimandato. Badge "attenzione elevata/contenuta vs size" sulla card
  solo per gli outlier (≥3x o ≤1/3 della mediana), non per ogni segnale.
  `PriceSnapshot.marketCap` (crypto: CoinGecko `usd_market_cap`; azioni:
  Yahoo Finance `marketCap`, assente per gli indici — entrambi verificati
  dal vivo il 2026-09-16) letto dalla stessa chiamata già fatta per
  prezzo/volume, nessuna fonte dati nuova.
- [x] **Rapporto crypto vs tradizionale** — **implementato il
  2026-09-16** in `lib/categoria-mercato.ts`: `NewsItem.categoria` (nuovo
  campo, valorizzato da `RssFeedConfig.categoria` già esistente in
  `news-rss.ts`) propagato a ogni Signal in base alla categoria
  maggioritaria dei suoi articoli di origine (o "mista" in caso di
  parità), sommato per quotaAttenzione e mostrato come riga nella sintesi
  del digest.
- [ ] **Market mood index nel tempo** — media pesata di tutti i
  sentiment di un digest, come termometro generale; interessante come
  grafico storico su più digest, non come numero isolato.
- [ ] **Durata media dell'attenzione** — quanti digest consecutivi
  un'entità resta rilevante prima di sparire, per capire se un picco è
  un lampo isolato o un trend che dura.
- [x] **Dispersione/varianza del sentiment**, non solo la media —
  **implementato il 2026-09-16** come `Signal.sentimentVarianza`
  (opzionale: righe precedenti a questo campo non hanno le menzioni
  individuali per ricalcolarlo), varianza di popolazione calcolata in
  `lib/dispersione-sentiment.ts` all'estrazione (stessi dati già usati
  per `sentimentMedio`, nessuna chiamata Claude in più). Badge "sentiment
  contrastante" sulla card solo sopra `SOGLIA_SENTIMENT_CONTRASTANTE`
  (`lib/soglie.ts`), non su ogni segnale.
- [x] **Indice di concentrazione del digest** (tipo Herfindahl) —
  **implementato il 2026-09-16** in `lib/concentrazione.ts`: HHI
  normalizzato per il numero di segnali (confrontabile tra digest con un
  numero diverso di segnali), etichettato bassa/media/alta e mostrato
  nella sintesi del digest come contesto, non come dato su ogni card.

### Calendario di eventi noti — segnalato di interesse dall'utente

**Implementato il 2026-09-16**: parte macro generale (FOMC/CPI/NFP), sia
come banner sulla pagina del digest (evento del giorno) sia come vista a
sé (`/calendario`, raggiungibile dal pulsante "calendario eventi" nella
dashboard) — tutti gli eventi 2026-2027 raggruppati per mese, con quello
di oggi evidenziato. Vedi `lib/calendario-macro.ts` e
`app/calendario/page.tsx`: date reali verificate su
federalreserve.gov/bls.gov (non generate), FOMC 2027 marcate
esplicitamente "tentative" perché non ancora confermate dalla Fed. Da
aggiornare quando escono nuovi calendari ufficiali.

Arricchire il digest con un contesto calendario: un picco di attenzione
che coincide con un evento macro programmato (riunione FOMC, rilascio
dati CPI/occupazione, earnings season) è meno "sorprendente" di uno che
spunta dal nulla — utile per distinguere rumore da segnale prima ancora
di guardare i numeri.

**Resta da fare** (non implementato):
- Un calendario **earnings per singola azienda** è più granulare ma
  richiederebbe una fonte esterna dedicata (le API earnings-calendar
  gratuite sono limitate): da valutare solo se il rollup per
  settore/azienda mostra che serve davvero, non da aggiungere di
  default.
- L'halving di Bitcoin è noto e fisso, ma a cadenza pluriennale — poco
  utile come "evento ricorrente" su base giornaliera/mensile.

## Idea di presentazione, non un indicatore

- [x] **Digest come "changelog" invece che come lista di card** —
  **implementato il 2026-09-16** come `lib/sintesi.ts`
  (`sintetizzaDigest`), su richiesta esplicita dell'utente dopo aver
  chiesto "cosa può rendere meglio l'idea di cosa sta succedendo al
  mercato". Testo generato da template (nessuna chiamata Claude, tutti
  i dati sono già nel DB), non da LLM: tema principale per quota di
  attenzione (non conteggio grezzo), sentiment generale come media
  pesata per menzioni, nuovi segnali comparsi, maggior crescita di
  attenzione. In cima a entrambe le pagine digest (recente e storico).
  **Nota di scope importante**: l'utente ha chiesto anche qualcosa di
  più ambizioso — capire "cosa sta per succedere" incrociando prezzi e
  notizie (previsione, non solo descrizione) — deliberatamente NON
  implementato ora: con 1-2 digest reali non c'è storico sufficiente
  per validare un indicatore predittivo, sarebbe rumore spacciato per
  segnale (vedi Livello 3 sotto e il rischio di multiple testing bias
  già segnalato da `Trading/` nel vault). Da riprendere quando c'è
  storico reale.

## Livello 3 — calcolato e salvato, non mostrato in UI per ora

- [ ] **Divergenza attenzione/prezzo** — casi in cui il sentiment è
  molto marcato ma il prezzo non si è ancora mosso (o si muove al
  contrario). È il tipo di segnale che l'app vuole validare nel tempo.
- [ ] **Expectation gap** — quanto il sentiment implicherebbe un
  movimento vs quanto si è mosso realmente il prezzo, in %.
- [ ] **Alpha vs beta del segnale** — un asset che sale del 5% è
  interessante solo se il mercato generale non è già salito del 5% da
  solo; serve un indice di riferimento come benchmark. Per il benchmark
  settoriale, meglio un ETF settoriale come proxy (es. SOXX/SMH per i
  semiconduttori, XLK per la tecnologia, XLE per l'energia — stesso
  principio delle mappe curate già in uso) che sommare a mano la market
  cap delle sole aziende del settore effettivamente menzionate nel
  digest: quella somma coprirebbe solo chi finisce in un articolo, non
  il settore reale, dando un benchmark distorto.
- [~] **Tasso di successo storico dei segnali trending** — **logica di
  calcolo preparata il 2026-09-16** in `lib/validazione.ts`
  (`validaSegnale`, `calcolaTassoSuccesso`), testata con dati finti
  multi-digest, **ma non ancora usata da nessuna parte**: non c'è
  storico reale sufficiente (serve un `CAMPIONE_MINIMO_AFFIDABILE` di
  30 segnali validabili, la funzione stessa si rifiuta di segnalarsi
  "affidabile" sotto quella soglia). Non è vero backtesting — i feed
  RSS non hanno un archivio storico, quindi non si può testare contro
  il passato, solo accumulare dati veri da oggi in avanti
  ("validazione prospettica"). L'orizzonte di confronto (prossimo
  digest? una settimana dopo?) è lasciato a chi chiamerà la funzione in
  futuro, non deciso qui: una nota nel vault (`Trading/`, sentiment
  globale) mostra che lo stesso segnale può avere direzione opposta a
  seconda dell'orizzonte scelto. **Prossimo passo, non ancora fatto**:
  uno script/pagina che raccoglie i dati reali da `Signal`+
  `PriceSnapshot` e chiama questa logica — da scrivere quando c'è
  abbastanza storico, non prima.
- [ ] **Corroborazione cross-fonte** — un'entità menzionata da più fonti
  editorialmente distinte è un segnale più solido di più menzioni dalla
  stessa fonte.
- [ ] **Deduplica eventi vs rimbalzo di wire** — capire se tante
  menzioni sono copertura indipendente o lo stesso comunicato riscritto
  da più fonti, che gonfia il conteggio senza aggiungere informazione.
- [ ] **Correlazione cross-asset** — l'attenzione su un asset trascina
  quella su un altro? Statisticamente pesante; il framework di
  backtesting già in `Trading/` del vault Brain Sync è pensato proprio
  per questo tipo di analisi.
- [ ] **Rottura di correlazione storica** — angolo diverso dalla
  correlazione cross-asset sopra: se due asset che di solito si muovono
  insieme in attenzione/prezzo smettono di farlo in un digest, è un
  evento specifico su un solo asset, non rumore — segnala l'eccezione
  al pattern invece di limitarsi a misurare il pattern stesso.
- [ ] **Lead-lag tra fonti** — quale fonte anticipa le altre su un tema,
  utile in futuro per pesare le fonti invece di trattarle come uguali.
- [ ] **Fonte più predittiva nel tempo** — estende il "tasso di successo
  storico dei segnali trending" sopra, ma per fonte invece che per
  segnale: quali fonti RSS hanno storicamente anticipato meglio i
  movimenti di prezzo reali. Utile come criterio per pesare le fonti se
  in futuro si allarga la lista feed oltre le 4 attuali.
- [ ] **Co-occorrenza/network tra entità** — quali entità compaiono
  spesso insieme negli stessi articoli (es. un'azienda + un paese + un
  tema che si muovono insieme rivelano una narrativa, non tre segnali
  scollegati).
- [ ] **Effetto giorno della settimana** — normalizzare per eventuali
  pattern sistematici (es. weekend più silenziosi) prima di trattare
  una variazione come significativa.
- [ ] **Divergenza geografica sullo stesso tema** — es. sentiment
  opposto tra due paesi sullo stesso tema macro, utile come contesto
  geopolitico una volta che esiste il rollup geografico (Livello 2).

## Ultimo aggiornamento

2026-09-16 (nona modifica) — implementata la dispersione/varianza del
sentiment (`Signal.sentimentVarianza`, `lib/dispersione-sentiment.ts`),
ultima voce di Livello 2 calcolabile su un solo digest. Nota tecnica
sulla migration: il primo tentativo la rendeva un campo obbligatorio,
scoperto — prima del push — che avrebbe rotto il DB reale sul portatile
al prossimo `git pull` (righe Signal esistenti senza valore per un campo
NOT NULL su SQLite). Corretto rendendolo opzionale, come già
`variazioneRispettoAlDigestPrecedente`. Anche il layout della dashboard è
stato rivisto in questa sessione (non un indicatore, ma cambia dove/come
si vedono): 3 zone (contesto a sinistra, segnali al centro, approfondimenti
a destra), sintesi con indicatori come chip invece di frasi impilate.

2026-09-16 (ottava modifica) — implementati 4 indicatori di Livello 2 in
forma ridotta a singolo digest (non vista aggregata settimanale/mensile
come pensato inizialmente, coerente con "misura prima di fidarti": non
c'è ancora storico sufficiente per una vista nel tempo): indice di
concentrazione (Herfindahl), rapporto crypto vs tradizionale, rapporto
attenzione/capitalizzazione, rollup per settore/area geografica (versione
ridotta — vedi nota su cosa manca ancora nella voce del backlog). Verifica
visiva con un digest finto che copre tutti e 4 insieme, poi rimosso.

2026-09-16 (settima modifica) — preparata (non usata) la logica di
"validazione prospettica" in `lib/validazione.ts`, seguito diretto
della discussione sull'incrocio prezzi/notizie rimandata nella modifica
precedente. Chiarito esplicitamente nel codice e qui che non è
backtesting in senso classico (nessun archivio storico di notizie
disponibile) — solo la logica di calcolo, testata con dati finti,
pronta per quando ci sarà storico reale sufficiente (soglia minima 30
segnali validabili, sotto la quale la funzione stessa si dichiara "non
affidabile").

2026-09-16 (sesta modifica) — prima code-review strutturata (skill
`/code-review high`) su tutto il lavoro da ieri sera a oggi: 4 problemi
reali trovati e risolti — il fix del crash su risposte troncate era
incompleto (validava solo l'array, non ogni elemento), un bug reale
sulla soglia "bassa attività" (confrontava il conteggio filtrato invece
del totale), duplicazione tra le due pagine digest (estratto
`components/DigestBody.tsx`), accessibilità della stella watchlist
(`aria-hidden` nascondeva l'unica spiegazione del suo significato).

2026-09-16 (quinta modifica) — implementata la sintesi narrativa
("digest come changelog"), l'idea di presentazione segnalata come
"alternativa architetturale". Deliberatamente NON implementato un
incrocio prezzi/notizie predittivo richiesto nella stessa
conversazione — manca lo storico per validarlo, vedi la voce sopra per
il ragionamento completo.

2026-09-16 (quarta modifica) — implementate le ultime 2 idee del
Livello 1: volume di scambio (campo in più sulla stessa chiamata prezzo
già esistente) e watchlist personale (lista curata in `lib/watchlist.ts`,
set iniziale gli 8 "principali asset"). **Livello 1 completo**: tutte le
idee di questa sezione sono ora implementate. Calendario esteso da
banner a sezione a sé (`/calendario`) su richiesta esplicita
dell'utente dopo aver visto la prima versione.

2026-09-16 (seconda modifica) — implementate altre 3 idee: badge
"nuovo" (con il raffinamento incluso da subito), etichetta "giornata a
bassa attività", e la parte macro del calendario eventi (come banner,
non come vista Livello 2 separata — earnings per azienda resta da
fare). Vedi le voci spuntate sopra per il dettaglio.

2026-09-16 — implementata "Share of voice invece di conteggio assoluto"
(prima idea di questo file a essere realizzata), vedi la voce spuntata
sopra per il dettaglio.

2026-09-15 (terza modifica) — aggiunte 4 idee: raffinamento del badge
"nuovo" (mai apparso vs ritorno dopo assenza), "rottura di correlazione
storica", "fonte più predittiva nel tempo", e "digest come changelog" —
quest'ultima è un'idea di formato/presentazione, non un indicatore, e
risponde direttamente al rischio di card confusionaria: messa in una
sezione a sé invece che nei 3 livelli. **Sessione di brainstorm chiusa
qui su richiesta dell'utente**, per passare a decidere cosa implementare
e come, non ancora fatto.

2026-09-15 (seconda modifica) — aggiunta "Rapporto
attenzione/capitalizzazione" (Livello 2), in risposta alla domanda
dell'utente se avesse senso una market cap grezza per settore: valutato
di no come numero isolato, ma sì come normalizzazione delle menzioni per
dimensione economica. Aggiornato anche "Alpha vs beta del segnale"
(Livello 3) per usare un ETF settoriale come proxy di benchmark invece
di sommare a mano la capitalizzazione delle sole aziende menzionate.

2026-09-15 (prima modifica) — file creato con le idee raccolte in
sessione (brainstorm seguito alla richiesta dell'utente di indicatori
aggiuntivi, dopo il completamento delle Fasi 4-7 e il restyling visivo).
Nessuna idea ancora implementata.
