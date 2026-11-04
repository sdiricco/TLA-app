# Requisiti di progetto — TLA

**Stato del documento:** baseline ricavata dall'implementazione corrente

**Ultima revisione:** 2026-11-04

**Ambito osservato:** frontend Vue, API Express, schema Prisma, migrazioni Supabase e test E2E

**Lingua dell'interfaccia:** italiano

## 1. Scopo

TLA (Tennis League Administration) è un'applicazione web responsive per la
gestione di community tennistiche, giocatori e tornei. Copre il percorso dalla
registrazione dell'utente e dalla scelta di un'organizzazione fino alle
iscrizioni, alla generazione degli incontri, alla registrazione dei risultati e
alla consultazione delle classifiche o dei tabelloni.

Il sistema deve consentire l'uso della stessa identità personale con capacità
diverse e cumulabili: un utente può essere giocatore, organizzatore di uno o più
tornei, membro o amministratore di più organizzazioni. I privilegi globali di
piattaforma restano separati dai ruoli interni alle organizzazioni.

## 2. Fonti e criteri di derivazione

Questa baseline descrive il comportamento rilevabile nel repository al momento
della revisione. Le fonti principali sono:

- rotte e guardie di navigazione in `src/router/index.ts`;
- viste, componenti, store Pinia e servizi sotto `src/`;
- API e middleware sotto `server/src/`;
- modello dati in `server/prisma/schema.prisma`;
- migrazioni e policy RLS sotto `supabase/migrations/`;
- scenari Playwright sotto `e2e/`;
- documentazione esistente sotto `docs/`.

Le etichette di stato hanno il seguente significato:

| Stato | Significato |
|---|---|
| Implementato | Il comportamento è presente nel codice corrente. |
| Parziale | Esiste un flusso utilizzabile, ma la copertura o una parte del requisito è incompleta. |
| Da verificare | Il requisito è dichiarato o suggerito dal progetto, ma non è dimostrato in modo sufficiente dal codice o dai test osservati. |

## 3. Attori e autorizzazioni

| Attore/capacità | Descrizione | Capacità principali |
|---|---|---|
| Ospite | Sessione locale senza account Supabase. | Consultazione in sola lettura dei contenuti globali e delle organizzazioni pubbliche. |
| Utente registrato | Account autenticato con profilo applicativo. | Gestione del proprio profilo, creazione di tornei globali, iscrizione ai tornei, ingresso nelle organizzazioni. |
| Giocatore | Utente con scheda sportiva collegata oppure scheda gestita da un club senza account. | Profilo sportivo, ranking, iscrizioni, storico incontri e statistiche. |
| Membro | Utente appartenente a un'organizzazione. | Consultazione dei dati dell'organizzazione e partecipazione ai flussi comunitari consentiti. |
| Amministratore organizzazione | Membership con ruolo `admin`. | Gestione dell'organizzazione, dei giocatori, dei tornei e delle richieste nel proprio contesto. |
| Proprietario organizzazione | Membership con ruolo `owner`. | Stesse capacità amministrative, con responsabilità di proprietà dell'organizzazione. |
| Organizzatore torneo | Profilo attribuito a uno specifico torneo. | Amministrazione del solo torneo attribuito, anche senza ruolo amministrativo globale o di club. |
| Amministratore piattaforma | Profilo con ruolo globale `admin`. | Operazioni amministrative trasversali alla piattaforma. |

Regola generale: i controlli nell'interfaccia migliorano l'esperienza utente ma
non costituiscono un confine di sicurezza. Ogni mutazione protetta deve essere
autorizzata nuovamente dall'API e, per le tabelle esposte, dalle policy del
database.

## 4. Requisiti funzionali

### 4.1 Identità, accesso e onboarding

| ID | Requisito | Criteri di accettazione | Stato |
|---|---|---|---|
| AUTH-001 | Il visitatore deve potersi registrare con email, password e nome. | Il sistema valida i campi obbligatori, crea l'identità tramite Supabase Auth e restituisce una sessione oppure richiede la conferma email. | Implementato |
| AUTH-002 | Il sistema deve gestire la conferma dell'email. | Il link di conferma riporta all'origine frontend consentita; l'interfaccia mostra avanzamento, successo o link non valido; è possibile richiedere un nuovo invio. | Implementato |
| AUTH-003 | L'utente deve potersi autenticare e disconnettere. | Credenziali errate producono un errore; una sessione valida sopravvive alla navigazione; il logout elimina le credenziali locali. | Implementato |
| AUTH-004 | Il visitatore deve poter entrare come ospite. | L'ospite non fornisce credenziali, può consultare i dati consentiti e non può usare profilo personale, notifiche o mutazioni riservate. | Implementato |
| AUTH-005 | Il primo accesso deve guidare la scelta del percorso iniziale. | L'utente può iniziare come giocatore, organizzatore o esploratore; la scelta non assegna privilegi impropri e non impedisce di aggiungere altre capacità in seguito. | Implementato |
| AUTH-006 | Il percorso giocatore deve creare una scheda sportiva globale. | Nome di 2–80 caratteri e data di nascita valida; club e telefono sono facoltativi; ranking iniziale pari a zero. | Implementato |
| AUTH-007 | L'utente deve poter modificare il proprio nome account. | La modifica è riservata al titolare e sincronizza il nome sulle schede giocatore collegate. | Implementato |
| AUTH-008 | L'utente deve poter eliminare definitivamente il proprio account. | È richiesta una conferma esplicita nell'interfaccia; i tornei globali personali e le organizzazioni vuote sono rimossi; lo storico sportivo necessario è anonimizzato; l'eliminazione è bloccata se lascia un'organizzazione attiva senza proprietario. | Implementato |
| AUTH-009 | Le rotte protette devono applicare guardie coerenti. | Utenti non autenticati, ospiti o privi di autorizzazione sono reindirizzati o ricevono rispettivamente errori 401/403 dall'API. | Parziale |

### 4.2 Organizzazioni e contesto dati

| ID | Requisito | Criteri di accettazione | Stato |
|---|---|---|---|
| ORG-001 | Un utente registrato deve poter creare un'organizzazione. | Sono generati ID, slug univoco e codice di ingresso; il creatore diventa `owner`; la creazione può completare l'onboarding organizzatore. | Implementato |
| ORG-002 | Un'organizzazione deve poter essere pubblica o privata e opzionalmente reperibile. | Le organizzazioni pubbliche sono sempre reperibili; una realtà reperibile deve avere coordinate geografiche valide. | Implementato |
| ORG-003 | L'utente deve poter cercare organizzazioni reperibili. | Ricerca per nome, slug, città o sport, paginazione da 1 a 30 risultati e limite di 60 ricerche al minuto per indirizzo. | Implementato |
| ORG-004 | Un utente registrato deve poter entrare in un'organizzazione pubblica. | L'ingresso crea una membership `member` e una scheda giocatore nel contesto dell'organizzazione senza duplicare record già collegati. | Implementato |
| ORG-005 | Un utente registrato deve poter entrare tramite codice. | Il codice è normalizzato e validato; sono ammessi codici correnti di cinque caratteri e codici legacy; massimo 10 tentativi al minuto per indirizzo. | Implementato |
| ORG-006 | Un utente deve poter richiedere accesso a un'organizzazione reperibile. | La richiesta è unica per coppia organizzazione/profilo e assume stato `pending`; un membro esistente riceve esito `approved`. | Implementato |
| ORG-007 | Il sistema deve isolare i dati per contesto. | Il contesto globale mostra solo record senza organizzazione; un contesto specifico mostra i record di quell'organizzazione; la selezione persiste al ricaricamento. | Implementato |
| ORG-008 | Un ospite deve poter selezionare solo organizzazioni pubbliche. | Un contesto privato non appartenente all'utente non viene esposto; l'API restituisce 404 o 403. | Implementato |
| ORG-009 | Owner e admin devono poter modificare l'organizzazione selezionata. | Possono aggiornare visibilità, reperibilità, descrizione, città, sport, coordinate e rigenerare il codice di ingresso; l'ID deve coincidere con il contesto richiesto. | Implementato |
| ORG-010 | Un amministratore deve poter invitare giocatori TLA. | La ricerca restituisce al massimo 30 profili globali con account, non già membri o invitati; l'invito può essere inviato per giocatore o email e non deve creare duplicati. | Implementato |

### 4.3 Notifiche e inviti

| ID | Requisito | Criteri di accettazione | Stato |
|---|---|---|---|
| NOT-001 | Un utente registrato deve disporre di un centro notifiche. | Sono mostrate fino a 50 notifiche di invito, ordinate dalla più recente; l'ospite non può accedervi. | Implementato |
| NOT-002 | Il sistema deve mostrare il conteggio degli inviti pendenti non letti. | Il conteggio include solo inviti `pending` con `read_at` nullo. | Implementato |
| NOT-003 | L'utente deve poter segnare una notifica come letta. | È modificabile soltanto una notifica destinata al profilo corrente. | Implementato |
| NOT-004 | L'utente deve poter accettare o rifiutare un invito pendente. | La risposta è idempotente rispetto agli inviti già gestiti e registra stato, lettura e data di risposta. | Implementato |
| NOT-005 | Accettare un invito deve completare l'ingresso nel club. | L'utente deve avere una scheda giocatore globale; il sistema crea o aggiorna membership e scheda giocatore del club in un'unica transazione. | Implementato |

### 4.4 Giocatori e profili sportivi

| ID | Requisito | Criteri di accettazione | Stato |
|---|---|---|---|
| PLY-001 | Il sistema deve gestire giocatori globali e giocatori appartenenti a un'organizzazione. | Una scheda può essere collegata a un profilo oppure esistere senza account; il contesto organizzativo ne limita la visibilità. | Implementato |
| PLY-002 | Gli amministratori devono poter creare, aggiornare ed eliminare giocatori nel contesto autorizzato. | I dati comprendono nome, ranking, nascita, foto, club e telefono; le operazioni sono protette lato server. | Implementato |
| PLY-003 | Gli utenti devono poter sfogliare e filtrare i giocatori visibili. | Ricerca per nome e club, paginazione, ordinamento per ranking, nome, club o creazione. | Implementato |
| PLY-004 | Un utente con scheda collegata deve poter modificare i propri dati sportivi. | Può modificare nome, nascita non futura, foto, club e telefono; non può modificare il ranking né schede altrui. | Implementato |
| PLY-005 | Il dettaglio giocatore deve mostrare identità e informazioni sportive. | La pagina distingue una scheda collegata a un account da una scheda non collegata; l'email collegata è attualmente esposta nel dettaglio autenticato come supporto temporaneo alla verifica identità. | Implementato |
| PLY-006 | Il dettaglio giocatore deve mostrare statistiche e storico. | Incontri giocati, vittorie, sconfitte, percentuale vittorie, forma recente e ultimi incontri derivano dai match completati visibili. | Implementato |
| PLY-007 | Il nome personale deve restare coerente tra profilo e schede collegate. | Una modifica self-service aggiorna il profilo e tutte le schede collegate allo stesso account. | Implementato |

### 4.5 Tornei, iscrizioni e regolamenti

| ID | Requisito | Criteri di accettazione | Stato |
|---|---|---|---|
| TRN-001 | Ogni account registrato deve poter creare un torneo globale. | Il creatore è salvato come organizzatore e ottiene i privilegi amministrativi su quel torneo. | Implementato |
| TRN-002 | Solo owner, admin del club o admin piattaforma devono poter creare tornei per un'organizzazione. | Un membro ordinario o un ospite riceve un diniego lato API. | Implementato |
| TRN-003 | Un torneo deve contenere i dati descrittivi e operativi essenziali. | Nome, luogo, periodo iscrizioni, periodo evento, formula di gioco, quota, formato, categoria, stato, limite partecipanti, pubblicazione e regolamento sono persistiti e validati. | Implementato |
| TRN-004 | Il sistema deve supportare categorie maschile e femminile. | Valori diversi sono rifiutati o non selezionabili. | Implementato |
| TRN-005 | Il sistema deve supportare eliminazione diretta, round robin e tornei a fasi. | `single_elimination`, `round_robin` e `round_robin_elimination` sono configurabili; la doppia eliminazione è dichiarata ma disabilitata da feature flag. | Parziale |
| TRN-006 | Gli utenti devono poter consultare solo tornei visibili nel contesto. | Ospiti: tornei globali o del contesto pubblico; registrati: globali, delle proprie organizzazioni e tornei ai quali partecipano; filtri espliciti non possono ampliare i privilegi. | Implementato |
| TRN-007 | Le liste torneo devono essere ricercabili e filtrabili. | Sono disponibili paginazione e filtri coerenti con stato, categoria, formato, organizzazione e organizzatore. | Implementato |
| TRN-008 | Ogni torneo deve esporre l'organizzatore. | Il profilo pubblico dell'organizzatore mostra nome, eventuale foto giocatore e tornei visibili attribuiti, senza esporre l'email. | Implementato |
| TRN-009 | L'amministrazione di un torneo deve essere circoscritta. | Possono gestirlo l'organizzatore attribuito, gli owner/admin dell'organizzazione proprietaria e l'admin piattaforma; essere admin in un altro club non è sufficiente. | Implementato |
| TRN-010 | Gli amministratori devono poter aggiungere o rimuovere partecipanti. | La stessa coppia torneo/giocatore è unica; il limite partecipanti e la coerenza con il contesto sono rispettati. | Implementato |
| TRN-011 | Un utente registrato con scheda giocatore deve potersi iscrivere e ritirare autonomamente. | L'API comunica disponibilità, stato di iscrizione e motivo di eventuale blocco; non crea duplicati. | Implementato |
| TRN-012 | L'amministratore deve poter pubblicare o ritirare un torneo. | Lo stato `published` viene aggiornato solo da un soggetto autorizzato. | Implementato |
| TRN-013 | Il torneo deve poter allegare un regolamento. | Il file è archiviato in Supabase Storage con metadati di nome, tipo e dimensione; il download rispetta la visibilità del torneo. | Implementato |
| TRN-014 | L'amministratore deve poter eliminare il torneo. | La cancellazione è autorizzata e rimuove per cascata partecipazioni, fasi, gruppi e incontri correlati. | Implementato |

### 4.6 Fasi, sorteggi, incontri e risultati

| ID | Requisito | Criteri di accettazione | Stato |
|---|---|---|---|
| CMP-001 | Un torneo deve contenere una o più fasi ordinate. | Ogni fase ha nome, descrizione, posizione, formato, stato, numero gruppi, qualificati per gruppo e numero totale in uscita. | Implementato |
| CMP-002 | La pipeline delle fasi deve essere valida. | L'output di una fase non supera il suo input e determina l'input della successiva; l'ordine è deterministico. | Implementato |
| CMP-003 | Il sistema deve generare incontri per round robin ed eliminazione diretta. | La generazione usa partecipanti, seed e vincoli della fase; i match sono ordinati per turno e posizione. | Implementato |
| CMP-004 | Il sistema deve gestire gironi all'italiana. | Le partite sono associate al gruppo; la classifica considera vittorie, differenza set, differenza game, scontro diretto e ranking iniziale. | Implementato |
| CMP-005 | Il sistema deve gestire tabelloni a eliminazione diretta. | Seed più forti sono separati; sono rappresentati BYE e slot da definire; i vincitori avanzano nel tabellone. | Implementato |
| CMP-006 | Un amministratore deve poter assegnare manualmente i giocatori agli slot. | Il giocatore deve appartenere al contesto corretto; svuotare uno slot annulla risultato, vincitore e stato dell'incontro. | Implementato |
| CMP-007 | Un amministratore deve poter registrare il risultato di un incontro. | Il vincitore deve essere uno dei due partecipanti; risultato e stato `completed` sono persistiti; per l'eliminazione diretta l'avanzamento è propagato. | Implementato |
| CMP-008 | Una fase deve poter essere completata solo a risultati disponibili. | Il sistema calcola esattamente gli `output_count` qualificati, ne salva posizione e seed e attiva/genera la fase successiva. | Implementato |
| CMP-009 | L'amministratore deve poter rigenerare gli incontri. | Gli incontri di una fase o dell'intero torneo possono essere cancellati e ricreati nel contesto autorizzato. | Implementato |
| CMP-010 | Il tabellone deve essere esportabile in PDF. | Il PDF include dati torneo, partecipanti e struttura della fase selezionata; il nome file è derivato dal torneo. | Implementato |

### 4.7 Richieste della community

| ID | Requisito | Criteri di accettazione | Stato |
|---|---|---|---|
| REQ-001 | I membri registrati devono poter creare richieste nel contesto selezionato. | Titolo di almeno tre caratteri, tipo `feature`/`improvement`/`bug`, priorità `low`/`medium`/`high` e descrizione sanificata. | Implementato |
| REQ-002 | Le richieste devono avere un ciclo di vita condiviso. | Stati ammessi: `open`, `planned`, `in_progress`, `done`, `rejected`; solo un amministratore può aggiornarli. | Implementato |
| REQ-003 | Gli utenti devono poter filtrare le richieste. | Filtri per stato e tipo; ordinamento coerente per stato, priorità e data. | Implementato |
| REQ-004 | Un utente registrato deve poter segnalare una richiesta come importante. | È ammesso un solo voto per coppia richiesta/profilo e il conteggio è visibile. | Implementato |
| REQ-005 | Gli utenti registrati devono poter commentare. | Commenti da 1 a 2.000 caratteri, ordinati cronologicamente e attribuiti all'autore. | Implementato |
| REQ-006 | Una richiesta può includere immagini. | Sono accettati JPG, PNG, WEBP o GIF fino a 5 MB; il caricamento richiede autenticazione e usa il bucket dedicato. | Implementato |
| REQ-007 | I contenuti descrittivi devono essere sanificati. | HTML non consentito è rimosso prima di persistenza o restituzione, evitando l'esecuzione di contenuti attivi. | Implementato |

### 4.8 Dashboard, navigazione e preferenze

| ID | Requisito | Criteri di accettazione | Stato |
|---|---|---|---|
| UX-001 | La dashboard deve adattarsi alle capacità dell'utente. | Mostra priorità, indicatori, tornei rilevanti e azioni rapide coerenti con ruolo e contesto. | Implementato |
| UX-002 | La navigazione deve essere responsive. | Sidebar desktop, topbar e navigazione mobile mantengono raggiungibili le aree principali senza overflow a 360 px. | Implementato |
| UX-003 | Il contesto organizzazione deve essere sempre riconoscibile. | Il selettore è disponibile nell'header e distingue chiaramente contenuti globali e organizzazione attiva. | Implementato |
| UX-004 | L'utente deve poter scegliere il tema. | Opzioni chiaro, scuro e sistema; la preferenza persiste e la modalità sistema segue i cambiamenti del dispositivo. | Implementato |
| UX-005 | L'app deve mostrare un changelog leggibile dagli utenti. | Le modifiche visibili sono presentate in italiano, ordinate dalla più recente e classificate come funzionalità, miglioramento o correzione. | Implementato |
| UX-006 | L'app deve essere installabile come PWA. | Manifest in italiano, icone standard e maskable, modalità standalone, orientamento verticale e aggiornamento automatico del service worker. | Implementato |

## 5. Regole di business principali

1. Identità account, scheda giocatore e ruoli organizzativi sono entità
   separate; nessuna delle tre deve essere usata come sostituto implicito delle
   altre.
2. Il ruolo globale `admin` è eccezionale; i permessi ordinari devono essere
   limitati alla membership dell'organizzazione o al torneo attribuito.
3. Il contesto senza `x-organization-id` rappresenta i dati globali; un header
   presente deve essere verificato prima di accedere ai dati del club.
4. Un torneo globale appartiene al suo organizzatore; un torneo di club
   appartiene all'organizzazione e conserva anche l'attribuzione personale.
5. Un giocatore può esistere senza account, ma le azioni self-service richiedono
   un collegamento a un profilo autenticato.
6. L'ingresso in un'organizzazione crea o aggiorna una sola scheda giocatore per
   la coppia account/organizzazione.
7. Una fase successiva non può ricevere più giocatori di quanti ne produca la
   precedente.
8. Solo un partecipante dell'incontro può esserne dichiarato vincitore.
9. La cancellazione di un account deve preservare l'integrità dello storico
   competitivo e impedire organizzazioni attive senza proprietario.

## 6. Requisiti dei dati

| ID | Requisito |
|---|---|
| DATA-001 | Le email dei profili devono essere uniche. |
| DATA-002 | Slug e codice di ingresso delle organizzazioni devono essere unici. |
| DATA-003 | Una membership è unica per coppia organizzazione/profilo. |
| DATA-004 | Un invito e una richiesta di accesso sono unici per coppia organizzazione/profilo. |
| DATA-005 | L'iscrizione è unica per coppia torneo/giocatore. |
| DATA-006 | Posizione della fase e posizione del gruppo sono uniche nel rispettivo contenitore. |
| DATA-007 | Ogni match deve appartenere a un torneo e a una fase; il gruppo è facoltativo. |
| DATA-008 | Le cancellazioni delle entità contenitore devono applicare le cascade definite dal modello senza lasciare record orfani. |
| DATA-009 | Le date API devono essere serializzate in formato ISO; la UI deve esplicitare formato e locale nella presentazione. |
| DATA-010 | Le migrazioni già distribuite sono immutabili; ogni evoluzione dello schema richiede una nuova migrazione ordinata. |

## 7. Requisiti non funzionali

| ID | Area | Requisito/obiettivo | Stato |
|---|---|---|---|
| NFR-001 | Sicurezza | Autenticazione tramite token Supabase; segreti e chiavi privilegiate esclusivamente nel backend; nessuna `service_role` nel bundle frontend. | Implementato |
| NFR-002 | Autorizzazione | Ogni mutazione protetta deve verificare identità, contesto e capacità sul server; le tabelle esposte devono avere RLS coerente con il modello di accesso. | Parziale: policy presenti, audit completo da mantenere. |
| NFR-003 | Privacy | Le API pubbliche non devono esporre email o dati di contatto non necessari; l'esposizione temporanea dell'email nel dettaglio giocatore autenticato va rivalutata. | Parziale |
| NFR-004 | Accessibilità | I flussi principali devono essere usabili da tastiera e avere nomi accessibili, label e focus visibili. Obiettivo: WCAG 2.2 AA per UI nuova o modificata. | Da verificare |
| NFR-005 | Responsive | I flussi principali devono funzionare su mobile, tablet e desktop, senza overflow orizzontale a 360 px e con azioni primarie raggiungibili. | Parziale |
| NFR-006 | Affidabilità | Operazioni multi-record critiche, come ingresso, inviti, avanzamento fasi e cancellazione account, devono usare transazioni o compensazioni esplicite. | Implementato |
| NFR-007 | Prestazioni | Liste di organizzazioni, giocatori e tornei devono essere paginate; ricerche frequenti devono essere limitate e supportate da indici coerenti. | Implementato |
| NFR-008 | Osservabilità | API e database devono offrire health check distinti; gli errori operativi rilevanti devono essere registrati senza esporre segreti al client. | Implementato |
| NFR-009 | Compatibilità | La SPA deve funzionare sui browser moderni supportati da Vite; la suite E2E usa Chromium come baseline. | Parziale |
| NFR-010 | Offline/PWA | Gli asset statici devono poter essere memorizzati per uso offline; mutazioni offline e risoluzione conflitti non sono garantite. | Implementato per asset statici |
| NFR-011 | Manutenibilità | TypeScript deve restare strict, senza simboli inutilizzati; frontend, API, dominio e accesso dati devono conservare responsabilità separate. | Implementato come vincolo di progetto |
| NFR-012 | Documentazione API | Le API devono esporre una specifica OpenAPI consultabile e un'interfaccia Swagger con autenticazione bearer persistente. | Implementato |

## 8. Integrazioni e dipendenze esterne

- **Supabase Auth:** registrazione, conferma email, sessioni e cancellazione
  dell'identità.
- **PostgreSQL/Supabase:** persistenza dei dati, vincoli e Row Level Security.
- **Supabase Storage:** immagini delle richieste e regolamenti dei tornei.
- **Express API:** confine applicativo per autorizzazione e logica di dominio.
- **MSW:** API simulata per sviluppo frontend quando `VITE_API_URL` non è
  configurato.
- **Prisma:** metadata e accesso tipizzato al database dal backend.
- **Vite PWA/Capacitor:** installazione web e packaging mobile.

## 9. Vincoli e configurazione

1. Lo stack applicativo è Vue 3 + TypeScript sul frontend ed Express 5 +
   TypeScript sul backend.
2. Il package manager di riferimento è npm.
3. Sono obbligatorie lato server almeno `SUPABASE_URL`,
   `SUPABASE_ANON_KEY`/publishable key e, per le funzioni che lo richiedono,
   `DATABASE_URL` e `SUPABASE_SECRET_KEY`.
4. Il frontend può ricevere soltanto URL e credenziali Supabase pubblicabili.
5. I file JSON inviati all'API sono limitati a 8 MB; le immagini delle richieste
   sono limitate a 5 MB.
6. Date e testi mostrati all'utente devono seguire il locale italiano; i dati
   scambiati con l'API usano formati espliciti.

## 10. Esclusioni attuali

- pagamenti e incasso delle quote di iscrizione;
- sincronizzazione automatica con classifiche o federazioni esterne;
- scoring live da giudice di sedia;
- mutazioni offline con sincronizzazione e risoluzione dei conflitti;
- doppia eliminazione operativa, pur essendo presente nel modello dei formati;
- workflow completo di approvazione/rifiuto delle richieste di accesso alle
  organizzazioni, non rilevato nelle API correnti;
- trasferimento self-service della proprietà di un'organizzazione.

## 11. Verifica e tracciabilità

Gli scenari di accettazione derivati da questa baseline sono raccolti in
[`features/`](features/README.md). I tag Gherkin con formato `@<ID>` collegano
ogni scenario ai requisiti di questa pagina.

Copertura automatica osservata:

| Area | Evidenza principale |
|---|---|
| Accesso, registrazione, conferma email e ospite | `e2e/auth.spec.ts` |
| Onboarding | `e2e/onboarding.spec.ts` |
| Dashboard | `e2e/dashboard.spec.ts` |
| Capacità profilo/giocatore e cancellazione account | `e2e/profile-capabilities.spec.ts` |
| Persistenza tema | `e2e/settings-theme.spec.ts` |
| Iscrizione al torneo | `e2e/tournament-enrollment.spec.ts` |
| Organizzatore e filtro tornei | `e2e/tournament-organizer.spec.ts` |
| Isolamento del contesto organizzazione | `e2e/organization-context.spec.ts` |
| Email collegata al giocatore | `e2e/player-profile-email.spec.ts` |
| Autenticazione backend, visibilità e permessi torneo | test Node sotto `server/src/` |

Lacune di verifica prioritarie:

1. matrice completa dei permessi per organizzazioni, inviti e notifiche;
2. CRUD giocatori e tornei con casi limite di validazione;
3. generazione deterministica di gironi e tabelloni;
4. avanzamento dei vincitori e completamento delle fasi;
5. upload e autorizzazione di immagini e regolamenti;
6. audit RLS su tutte le tabelle esposte;
7. accessibilità WCAG e browser diversi da Chromium;
8. workflow delle richieste community e delle richieste di accesso.

## 12. Punti aperti

- Definire se l'email collegata debba restare visibile nel dettaglio giocatore o
  essere sostituita da un indicatore di verifica meno invasivo.
- Definire il workflow amministrativo delle richieste di accesso pendenti.
- Decidere se e quando abilitare la doppia eliminazione.
- Stabilire budget misurabili per prestazioni, disponibilità, backup e tempi di
  ripristino dopo l'introduzione di telemetria di produzione.
- Ampliare la documentazione OpenAPI alle rotte che oggi risultano presenti nel
  codice ma non completamente descritte nella specifica.
