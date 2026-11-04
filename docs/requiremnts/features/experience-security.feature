# language: it
@esperienza @nonfunzionali
Funzionalità: Esperienza applicativa e confini di sicurezza
  Come utente o responsabile della piattaforma
  Voglio un'app accessibile, installabile e sicura
  Affinché i flussi principali restino affidabili sui dispositivi supportati

  @UX-001 @positivo @ui
  Scenario: Dashboard di un amministratore
    Dato un amministratore con un'organizzazione attiva
    Quando apre la dashboard
    Allora vede priorità operative, indicatori e tornei rilevanti
    E vede azioni rapide coerenti con i propri permessi

  @UX-001 @positivo @ui
  Scenario: Dashboard di un giocatore
    Dato un giocatore autenticato senza capacità amministrative
    Quando apre la dashboard
    Allora vede statistiche e attività pertinenti al giocatore
    Ma non vede azioni amministrative riservate

  @UX-002 @NFR-005 @mobile @ui
  Scenario: Navigazione su viewport di 360 pixel
    Dato l'app aperta con larghezza viewport di 360 pixel
    Quando l'utente naviga tra dashboard, tornei, giocatori e organizzazioni
    Allora non compare overflow orizzontale
    E navigazione primaria e azioni principali restano raggiungibili

  @UX-003 @positivo @ui
  Scenario: Indicazione del contesto attivo
    Dato un utente con contenuti globali e membership multiple
    Quando passa dal contesto globale al Club A
    Allora l'header mostra chiaramente il Club A come contesto attivo
    E i contenuti visibili vengono ricaricati per il nuovo contesto

  @UX-004 @positivo @ui
  Schema dello scenario: Persistenza della preferenza tema
    Dato un utente nelle preferenze
    Quando seleziona il tema "<tema>"
    E ricarica l'app
    Allora il tema "<tema>" resta attivo

    Esempi:
      | tema   |
      | chiaro |
      | scuro  |
      | sistema|

  @UX-004 @positivo @ui
  Scenario: Aggiornamento del tema di sistema
    Dato la preferenza tema impostata su sistema
    Quando il dispositivo passa da chiaro a scuro
    Allora l'app aggiorna il tema senza richiedere un ricaricamento

  @UX-005 @positivo @ui
  Scenario: Consultazione del changelog
    Dato più voci di changelog
    Quando l'utente apre la pagina delle novità
    Allora le voci sono in italiano e dalla più recente
    E ogni voce è classificata come funzionalità, miglioramento o correzione

  @UX-006 @NFR-010 @pwa
  Scenario: Installabilità della PWA
    Dato un browser compatibile
    Quando carica il manifest dell'app
    Allora trova nome, icone standard e maskable, lingua italiana e modalità standalone
    E l'app può essere installata

  @UX-006 @NFR-010 @pwa
  Scenario: Disponibilità offline degli asset statici
    Dato l'app caricata almeno una volta con connessione
    Quando il dispositivo perde la connessione
    Allora gli asset statici già memorizzati possono essere caricati
    Ma l'app non promette di completare mutazioni offline

  @NFR-001 @sicurezza @build
  Scenario: Assenza di chiavi privilegiate nel frontend
    Dato un bundle frontend di produzione
    Quando viene ispezionato per credenziali Supabase
    Allora può contenere soltanto credenziali pubblicabili
    E non contiene `SUPABASE_SECRET_KEY`, `service_role` o segreti equivalenti

  @NFR-002 @sicurezza @api
  Scenario: Autorizzazione verificata anche senza controlli UI
    Dato un utente autenticato privo della capacità richiesta
    Quando invia direttamente una mutazione amministrativa
    Allora l'API rifiuta l'operazione
    E il database non registra modifiche

  @NFR-002 @sicurezza @database
  Scenario: RLS impedisce accesso a righe non autorizzate
    Dato una tabella esposta con RLS abilitata
    E un token autenticato senza proprietà o membership sulla riga
    Quando il client interroga o modifica direttamente la riga
    Allora la policy non restituisce né modifica la riga

  @NFR-002 @sicurezza @database
  Scenario: Una policy di aggiornamento preserva la proprietà
    Dato una riga posseduta dall'utente autenticato
    Quando l'utente prova ad assegnarla a un altro profilo durante l'aggiornamento
    Allora il controllo `WITH CHECK` nega la modifica

  @NFR-003 @privacy @api
  Scenario: Le API pubbliche minimizzano i dati personali
    Dato una risorsa consultabile pubblicamente
    Quando un ospite la richiede
    Allora la risposta non include email, telefono o altri dati privati non necessari

  @NFR-004 @accessibilita @ui
  Scenario: Uso da tastiera del flusso principale
    Dato un utente che usa soltanto la tastiera
    Quando percorre accesso, selezione contesto e apertura di un torneo
    Allora ogni controllo interattivo riceve un focus visibile
    E ogni campo e azione ha un nome accessibile

  @NFR-006 @affidabilita
  Scenario: Rollback di un'operazione multi-record fallita
    Dato un'operazione che deve creare più record correlati
    E un errore prima del completamento
    Quando la transazione viene annullata
    Allora nessun sottoinsieme incoerente dei record resta persistito

  @NFR-007 @prestazioni @api
  Scenario: Limite massimo della pagina di ricerca organizzazioni
    Dato un client autenticato
    Quando richiede più di 30 organizzazioni per pagina
    Allora l'API restituisce al massimo 30 elementi
    E conserva un totale coerente

  @NFR-008 @api
  Scenario: Health check applicativo
    Dato il server Express avviato
    Quando un client richiede `/api/health`
    Allora riceve una risposta di servizio disponibile senza dati sensibili

  @NFR-008 @api
  Scenario: Health check del database non configurato
    Dato il server senza `DATABASE_URL`
    Quando un client richiede `/api/health/db`
    Allora riceve stato 503
    E la risposta indica che il database non è configurato

  @NFR-012 @api
  Scenario: Consultazione della documentazione API
    Dato il server Express avviato
    Quando un utente apre `/api/docs`
    Allora vede l'interfaccia Swagger della API TLA
    E può configurare un bearer token per provare le rotte protette

  @DATA-009 @api
  Scenario: Serializzazione delle date
    Dato una risorsa API con date persistite
    Quando il client richiede la risorsa
    Allora le date sono restituite in formato ISO
    E l'interfaccia le presenta usando un formato e un locale espliciti

  @DATA-010 @manutenibilita
  Scenario: Immutabilità delle migrazioni distribuite
    Dato la cronologia delle migrazioni versionate
    Quando viene introdotta una modifica allo schema
    Allora viene aggiunto un nuovo file di migrazione ordinato
    E nessuna migrazione precedente viene riscritta

  @NFR-009 @compatibilita
  Scenario: Esecuzione della suite baseline su Chromium
    Dato l'ambiente E2E configurato
    Quando la suite Playwright viene eseguita su Chromium supportato
    Allora i flussi smoke completano senza errori di compatibilità

  @NFR-011 @manutenibilita @build
  Scenario: Compilazione TypeScript strict
    Dato il codice applicativo e server corrente
    Quando vengono eseguite le build TypeScript pertinenti
    Allora la compilazione termina senza errori strict
    E non segnala variabili o parametri inutilizzati
