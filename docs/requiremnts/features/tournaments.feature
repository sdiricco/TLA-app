# language: it
@tornei
Funzionalità: Gestione e partecipazione ai tornei
  Come organizzatore, amministratore o giocatore
  Voglio creare, trovare e gestire tornei nel contesto corretto
  Affinché ogni competizione abbia responsabilità e partecipanti chiari

  @TRN-001 @TRN-008 @TRN-009 @positivo @smoke
  Scenario: Creazione di un torneo globale
    Dato un account registrato nel contesto globale
    Quando crea un torneo con dati validi
    Allora il torneo non appartiene a un'organizzazione
    E il creatore è salvato come organizzatore
    E il creatore può amministrare il torneo

  @TRN-002 @positivo
  Scenario: Creazione di un torneo di club da parte di un admin
    Dato un amministratore nel contesto del Club A
    Quando crea un torneo con dati validi
    Allora il torneo appartiene al Club A
    E il creatore è attribuito come organizzatore

  @TRN-002 @negativo @sicurezza
  Schema dello scenario: Creazione di un torneo di club senza capacità
    Dato un "<attore>" nel contesto del Club A
    Quando prova a creare un torneo per il Club A
    Allora l'API risponde con stato 403
    E il torneo non viene creato

    Esempi:
      | attore          |
      | ospite          |
      | membro ordinario|

  @TRN-003 @TRN-004 @positivo
  Schema dello scenario: Creazione per categoria supportata
    Dato un organizzatore autorizzato
    Quando crea un torneo di categoria "<categoria>" con date e formula valide
    Allora il torneo viene salvato con categoria "<categoria>"

    Esempi:
      | categoria |
      | maschile  |
      | femminile |

  @TRN-003 @negativo
  Scenario: Periodo di iscrizione non coerente
    Dato un organizzatore autorizzato
    Quando inserisce una fine iscrizioni precedente all'inizio iscrizioni
    Allora il torneo non viene salvato
    E viene mostrato il vincolo violato

  @TRN-005 @positivo
  Schema dello scenario: Selezione di un formato disponibile
    Dato la configurazione standard delle feature flag
    Quando l'organizzatore seleziona "<formato>"
    Allora può completare la configurazione del torneo

    Esempi:
      | formato                 |
      | single_elimination      |
      | round_robin             |
      | round_robin_elimination |

  @TRN-005 @negativo
  Scenario: Doppia eliminazione disabilitata
    Dato la feature flag standard per la doppia eliminazione
    Quando l'organizzatore apre il selettore dei formati
    Allora la doppia eliminazione risulta non selezionabile

  @TRN-006 @ORG-007 @sicurezza
  Scenario: Un filtro esplicito non amplia la visibilità
    Dato un utente membro del Club A ma non del Club B
    Quando richiede i tornei usando l'ID del Club B come filtro
    Allora non riceve i tornei privati del Club B

  @TRN-006 @positivo
  Scenario: Il partecipante vede un torneo rilevante
    Dato un utente iscritto a un torneo visibile
    Quando consulta i propri tornei
    Allora il torneo è incluso anche se la visibilità deriva dalla partecipazione

  @TRN-007 @positivo
  Scenario: Filtri combinati della lista tornei
    Dato tornei visibili con stati, categorie, formati e organizzatori differenti
    Quando l'utente applica più filtri compatibili
    Allora riceve soltanto i tornei che soddisfano tutti i filtri
    E totale e paginazione restano coerenti

  @TRN-008 @NFR-003 @privacy
  Scenario: Apertura del profilo organizzatore
    Dato un torneo visibile attribuito a un organizzatore
    Quando l'utente apre il profilo dell'organizzatore
    Allora vede nome, eventuale foto e tornei attribuiti visibili
    Ma non vede l'email dell'organizzatore

  @TRN-009 @negativo @sicurezza
  Scenario: Admin di un altro club tenta di modificare il torneo
    Dato un amministratore del Club B
    E un torneo del Club A organizzato da un altro profilo
    Quando l'amministratore del Club B invia una modifica al torneo
    Allora l'API risponde con stato 403
    E il torneo resta invariato

  @TRN-010 @DATA-005 @positivo
  Scenario: Aggiunta di un partecipante da parte dell'amministratore
    Dato un torneo con posti disponibili
    E un amministratore autorizzato
    Quando aggiunge un giocatore ammesso
    Allora l'iscrizione compare una sola volta nel roster

  @TRN-010 @DATA-005 @negativo
  Scenario: Aggiunta duplicata dello stesso giocatore
    Dato un giocatore già presente nel roster
    Quando l'amministratore prova ad aggiungerlo nuovamente
    Allora l'API rifiuta o rende innocua l'operazione
    E il roster conserva una sola iscrizione

  @TRN-010 @negativo
  Scenario: Superamento del limite partecipanti
    Dato un torneo che ha raggiunto il limite partecipanti
    Quando viene richiesta una nuova iscrizione
    Allora l'API rifiuta l'iscrizione
    E il numero dei partecipanti non cambia

  @TRN-011 @positivo @smoke
  Scenario: Iscrizione self-service
    Dato un utente registrato con scheda giocatore idonea
    E un torneo aperto con posti disponibili
    Quando l'utente si iscrive
    Allora risulta iscritto al torneo
    E la disponibilità aggiornata riflette il nuovo partecipante

  @TRN-011 @positivo
  Scenario: Ritiro self-service
    Dato un utente iscritto a un torneo dal quale può ritirarsi
    Quando annulla la propria iscrizione
    Allora non compare più nel roster
    E il posto torna disponibile

  @TRN-011 @negativo
  Scenario: Iscrizione senza scheda giocatore
    Dato un esploratore registrato senza scheda giocatore
    Quando prova a iscriversi a un torneo
    Allora l'iscrizione viene negata con una motivazione esplicita

  @TRN-012 @positivo
  Scenario: Pubblicazione del torneo
    Dato un amministratore autorizzato e un torneo non pubblicato
    Quando pubblica il torneo
    Allora il campo di pubblicazione diventa vero
    E il torneo è consultabile secondo le regole di visibilità

  @TRN-013 @positivo
  Scenario: Caricamento e download del regolamento
    Dato un amministratore autorizzato
    Quando allega un regolamento supportato
    Allora il sistema salva percorso, nome, tipo e dimensione
    E un utente autorizzato può scaricare lo stesso contenuto

  @TRN-013 @NFR-002 @negativo @sicurezza
  Scenario: Accesso non autorizzato al regolamento
    Dato un torneo non visibile all'utente
    Quando l'utente prova a scaricarne direttamente il regolamento
    Allora l'API non restituisce il file

  @TRN-014 @DATA-008 @positivo
  Scenario: Eliminazione di un torneo
    Dato un amministratore autorizzato
    E un torneo con partecipanti, fasi, gruppi e incontri
    Quando elimina il torneo
    Allora il torneo non è più disponibile
    E i dati dipendenti vengono rimossi secondo le cascade
