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
- [ ] **Badge "nuovo"** per un Signal mai visto in nessun digest
  precedente — economico da calcolare (già disponibile via il confronto
  col digest precedente usato per `variazioneRispettoAlDigestPrecedente`),
  comunica un'informazione diversa dal solo conteggio menzioni.
  Raffinamento possibile: distinguere "mai apparso prima" (IPO,
  tecnologia nuova) da "torna dopo un'assenza" (es. una vecchia crypto
  che torna di moda dopo settimane di silenzio) — richiede cercare
  l'ultima apparizione nello storico, non solo il confronto col digest
  immediatamente precedente.
- [ ] **Etichetta "giornata a bassa attività"** quando un digest ha
  pochi segnali — evita che una dashboard quasi vuota sembri un
  malfunzionamento invece di un giorno editorialmente silenzioso.
- [ ] **Watchlist personale** — asset/aziende marcati per restare
  sempre in cima indipendentemente dal trending. Personalizzazione su
  cosa conta per l'utente, invece di più indicatori uguali per tutti.
- [ ] **Volume di scambio reale accanto al prezzo** — CoinGecko e Yahoo
  Finance lo restituiscono già nelle stesse chiamate usate per il
  prezzo (`include_24hr_vol` / `regularMarketVolume`): non è un nuovo
  widget, è un campo in più sulla riga prezzo già esistente.

## Livello 2 — vista aggregata separata (settimanale/mensile)

- [ ] **Rollup per settore** — aggregare i Signal di tipo
  `azienda`/`asset` sotto il loro settore (serve una mappa di
  classificazione curata, stesso principio delle mappe già usate per
  ticker/CoinGecko ID) e tracciarne il volume di attenzione aggregato
  nel tempo. Idea di partenza dell'utente. Da valutare se pesare
  l'aggregazione per capitalizzazione delle aziende coinvolte invece di
  contare le menzioni a peso uguale — vedi "Rapporto
  attenzione/capitalizzazione" sotto.
- [ ] **Rapporto attenzione/capitalizzazione** — le mega-cap dominano il
  conteggio grezzo di menzioni quasi sempre per inerzia (sono "sempre
  nelle notizie"); normalizzare le menzioni di un'azienda/asset per la
  sua market cap fa emergere le sorprese vere — un'azienda piccola con
  attenzione sproporzionata alla sua dimensione economica è un segnale
  più interessante di una mega-cap con lo stesso conteggio assoluto.
  Nota tecnica: la market cap è già inclusa gratis nelle stesse chiamate
  che si fanno per il prezzo (`include_market_cap` su CoinGecko,
  `marketCap` su Yahoo Finance) — non serve una fonte nuova.
- [ ] **Rollup per paese/area geografica**.
- [ ] **Rapporto crypto vs tradizionale** — dove si sposta l'attenzione
  generale tra i due mondi; bucket-abile subito, la distinzione esiste
  già in `news-rss.ts` (`categoria: "crypto" | "tradizionale"`).
- [ ] **Market mood index nel tempo** — media pesata di tutti i
  sentiment di un digest, come termometro generale; interessante come
  grafico storico su più digest, non come numero isolato.
- [ ] **Durata media dell'attenzione** — quanti digest consecutivi
  un'entità resta rilevante prima di sparire, per capire se un picco è
  un lampo isolato o un trend che dura.
- [ ] **Dispersione/varianza del sentiment**, non solo la media — un
  Signal con metà articoli molto positivi e metà molto negativi è
  diverso da uno uniformemente neutro, anche a sentiment medio uguale.
- [ ] **Indice di concentrazione del digest** (tipo Herfindahl) — quanto
  poche entità dominano l'attenzione totale vs quanto è distribuita;
  contesto per interpretare i singoli segnali, non un dato su ogni card.

### Calendario di eventi noti — segnalato di interesse dall'utente

Arricchire il digest con un contesto calendario: un picco di attenzione
che coincide con un evento macro programmato (riunione FOMC, rilascio
dati CPI/occupazione, earnings season) è meno "sorprendente" di uno che
spunta dal nulla — utile per distinguere rumore da segnale prima ancora
di guardare i numeri.

Note pratiche da considerare quando si passa all'implementazione (non
ancora decise):
- Un calendario **macro generale** (FOMC, CPI, NFP) ha date pubbliche e
  note in anticipo, tracciabile con una lista curata aggiornata
  periodicamente — stesso principio "piccola lista verificata" già in
  uso per feed RSS e mappe ticker.
- Un calendario **earnings per singola azienda** è più granulare ma
  richiederebbe una fonte esterna dedicata (le API earnings-calendar
  gratuite sono limitate): da valutare solo se il rollup per
  settore/azienda mostra che serve davvero, non da aggiungere di
  default.
- L'halving di Bitcoin è noto e fisso, ma a cadenza pluriennale — poco
  utile come "evento ricorrente" su base giornaliera/mensile.

## Idea di presentazione, non un indicatore

- [ ] **Digest come "changelog" invece che come lista di card** — invece
  di continuare ad aggiungere campi a ogni card, una sezione narrativa
  in cima al digest tipo "cosa è cambiato da ieri" (nuovi entranti,
  segnali usciti dal radar, il mover più grande) potrebbe assorbire
  diversi degli indicatori di questo file senza aggiungere altre righe
  alla card — l'informazione in più vive in un testo di sintesi, non in
  un campo numerico ripetuto ovunque. Risponde direttamente al rischio
  di card confusionaria: non è un'idea da mettere in coda alle altre, è
  un'alternativa architetturale a come vengono presentate.

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
- [ ] **Tasso di successo storico dei segnali trending** — % di segnali
  marcati trending seguiti da un movimento di prezzo nella direzione
  del sentiment. Rende esplicita una metrica che è già l'obiettivo di
  fondo del reliability scoring previsto come step futuro.
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
