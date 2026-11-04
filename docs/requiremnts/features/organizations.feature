# language: it
@organizzazioni
Funzionalità: Organizzazioni e isolamento del contesto
  Come utente di TLA
  Voglio creare, trovare o selezionare un'organizzazione
  Affinché possa operare soltanto sui dati che mi sono consentiti

  @ORG-001 @DATA-002 @DATA-003 @positivo @smoke
  Scenario: Creazione di un'organizzazione privata
    Dato un utente registrato senza organizzazioni
    Quando crea un'organizzazione privata con un nome valido
    Allora il sistema genera uno slug univoco
    E genera un codice di ingresso univoco
    E assegna all'utente il ruolo di proprietario

  @ORG-001 @negativo
  Scenario: Creazione con nome troppo corto
    Dato un utente registrato
    Quando prova a creare un'organizzazione con un nome di un carattere
    Allora l'API rifiuta la richiesta
    E non crea membership o organizzazioni parziali

  @ORG-002 @positivo
  Scenario: Creazione di un'organizzazione pubblica con posizione
    Dato un utente registrato
    Quando crea un'organizzazione pubblica con coordinate valide
    Allora l'organizzazione è pubblica e reperibile
    E può essere trovata nella ricerca organizzazioni

  @ORG-002 @negativo
  Scenario: Organizzazione reperibile senza posizione
    Dato un utente registrato
    Quando crea o rende reperibile un'organizzazione senza coordinate
    Allora l'API rifiuta la modifica
    E chiede di selezionare una posizione valida

  @ORG-003 @positivo
  Schema dello scenario: Ricerca di un'organizzazione reperibile
    Dato organizzazioni reperibili con nome, slug, città e sport noti
    Quando l'utente cerca "<termine>"
    Allora i risultati includono "Tennis Roma"
    E non includono organizzazioni non reperibili

    Esempi:
      | termine |
      | Tennis Roma |
      | tennis-roma |
      | Roma |
      | Tennis |

  @ORG-003 @NFR-007 @negativo @api
  Scenario: Superamento del limite di ricerca
    Dato un client che ha già eseguito 60 ricerche nell'ultimo minuto
    Quando esegue un'altra ricerca organizzazioni
    Allora l'API risponde con stato 429
    E comunica un tempo di attesa di 60 secondi

  @ORG-004 @DATA-003 @positivo
  Scenario: Ingresso in un'organizzazione pubblica
    Dato un utente registrato che non appartiene a un'organizzazione pubblica
    Quando sceglie di entrarvi
    Allora viene creata una membership con ruolo membro
    E viene creata una sola scheda giocatore nel club

  @ORG-005 @positivo @smoke
  Scenario: Ingresso tramite codice corrente
    Dato un'organizzazione privata con codice "A1B2C"
    E un utente registrato non membro
    Quando l'utente invia il codice "a1b2c"
    Allora il codice viene normalizzato
    E l'utente entra come membro

  @ORG-005 @negativo
  Scenario: Codice di ingresso non valido
    Dato un utente registrato
    Quando invia un codice con formato non valido
    Allora l'API risponde con un errore di validazione
    E non crea alcuna membership

  @ORG-005 @NFR-007 @negativo @api
  Scenario: Superamento del limite dei tentativi di ingresso
    Dato un client che ha già eseguito 10 tentativi nell'ultimo minuto
    Quando prova un altro codice
    Allora l'API risponde con stato 429
    E nessun codice viene verificato

  @ORG-006 @DATA-004 @positivo
  Scenario: Richiesta di accesso a un'organizzazione reperibile
    Dato un utente registrato non membro
    E un'organizzazione privata reperibile
    Quando l'utente richiede l'accesso
    Allora viene registrata una sola richiesta con stato pendente

  @ORG-006 @positivo
  Scenario: Richiesta di accesso da parte di un membro esistente
    Dato un utente già membro dell'organizzazione
    Quando richiede nuovamente l'accesso
    Allora il sistema restituisce lo stato approvato
    E non crea una richiesta duplicata

  @ORG-007 @UX-003 @positivo @smoke
  Scenario: Persistenza del contesto organizzazione
    Dato un utente membro di due organizzazioni
    Quando seleziona la prima organizzazione
    E ricarica l'applicazione
    Allora la prima organizzazione resta il contesto attivo
    E liste e dashboard mostrano dati coerenti con quel contesto

  @ORG-007 @sicurezza
  Scenario: Isolamento tra contesto globale e organizzazione
    Dato giocatori e tornei globali
    E giocatori e tornei appartenenti al Club A
    Quando l'utente seleziona il Club A
    Allora vede soltanto giocatori e tornei del Club A
    Quando seleziona il contesto globale
    Allora vede soltanto giocatori e tornei senza organizzazione

  @ORG-008 @negativo @sicurezza
  Scenario: Ospite tenta di selezionare un'organizzazione privata
    Dato una sessione ospite
    E un'organizzazione privata
    Quando il client invia l'ID dell'organizzazione come contesto
    Allora l'API non espone l'esistenza o i dati privati dell'organizzazione

  @ORG-009 @positivo
  Scenario: Un amministratore aggiorna l'organizzazione attiva
    Dato un amministratore nel contesto del Club A
    Quando modifica descrizione, città, sport e posizione del Club A
    Allora i nuovi dati vengono salvati
    E il ruolo e il codice riservato restano disponibili all'amministratore

  @ORG-009 @negativo @sicurezza
  Scenario: Un amministratore tenta di modificare un'altra organizzazione
    Dato un amministratore nel contesto del Club A
    Quando invia una modifica per il Club B
    Allora l'API risponde con stato 403
    E i dati del Club B restano invariati

  @ORG-009 @DATA-002 @positivo
  Scenario: Rigenerazione del codice di ingresso
    Dato un proprietario nel contesto della propria organizzazione
    Quando richiede la rigenerazione del codice
    Allora viene generato un nuovo codice univoco di cinque caratteri
    E il vecchio codice non consente più l'ingresso
