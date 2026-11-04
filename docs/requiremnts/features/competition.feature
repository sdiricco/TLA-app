# language: it
@competizione
Funzionalità: Fasi, tabelloni e risultati
  Come amministratore di un torneo
  Voglio configurare e far avanzare la competizione
  Affinché incontri e qualificazioni siano deterministici e coerenti

  @CMP-001 @CMP-002 @positivo
  Scenario: Configurazione di una pipeline valida
    Dato un torneo con 16 partecipanti previsti
    Quando l'amministratore configura una fase a gironi con 8 qualificati
    E una fase a eliminazione con 1 vincitore
    Allora le fasi vengono salvate nell'ordine indicato
    E l'output della prima fase diventa l'input della seconda

  @CMP-002 @negativo
  Scenario: Output superiore all'input
    Dato una fase che riceve 8 giocatori
    Quando l'amministratore imposta 9 giocatori in uscita
    Allora la configurazione viene rifiutata
    E la pipeline precedente resta invariata

  @CMP-003 @CMP-004 @positivo
  Scenario: Generazione degli incontri round robin
    Dato una fase round robin attiva con giocatori assegnati ai gruppi
    Quando l'amministratore genera gli incontri
    Allora ogni coppia prevista nel gruppo ha un incontro
    E ogni incontro appartiene alla fase e al gruppo corretti

  @CMP-003 @CMP-005 @positivo
  Scenario: Generazione del tabellone a eliminazione diretta
    Dato una fase a eliminazione attiva con giocatori e seed
    Quando l'amministratore genera gli incontri
    Allora i seed più forti sono separati secondo il tabellone
    E BYE e slot non ancora definiti sono rappresentati esplicitamente

  @CMP-005 @positivo
  Scenario: Evitare una rivincita immediata quando possibile
    Dato qualificati provenienti da gruppi differenti
    E una disposizione alternativa valida
    Quando viene generata la fase a eliminazione
    Allora il sistema evita un incontro immediato tra giocatori dello stesso gruppo

  @CMP-006 @positivo
  Scenario: Assegnazione manuale di un giocatore a uno slot
    Dato un amministratore autorizzato
    E un giocatore appartenente al contesto del torneo
    Quando assegna il giocatore a uno slot libero
    Allora lo slot mostra il giocatore selezionato

  @CMP-006 @negativo @sicurezza
  Scenario: Assegnazione di un giocatore estraneo al contesto
    Dato un torneo del Club A
    E un giocatore appartenente soltanto al Club B
    Quando l'amministratore prova ad assegnarlo a un incontro del Club A
    Allora l'API rifiuta la richiesta
    E l'incontro resta invariato

  @CMP-006 @positivo
  Scenario: Svuotamento di uno slot già completato
    Dato un incontro con risultato e vincitore registrati
    Quando l'amministratore svuota uno degli slot
    Allora risultato e vincitore vengono annullati
    E lo stato dell'incontro torna in attesa

  @CMP-007 @positivo @smoke
  Scenario: Registrazione di un risultato valido
    Dato un incontro pronto tra Mario e Luca
    Quando l'amministratore registra "6-4 6-3" con Mario vincitore
    Allora l'incontro assume stato completato
    E risultato e vincitore vengono salvati

  @CMP-007 @negativo
  Scenario: Vincitore non partecipante
    Dato un incontro tra Mario e Luca
    Quando l'amministratore indica Paolo come vincitore
    Allora l'API risponde con un errore di validazione
    E l'incontro non viene completato

  @CMP-005 @CMP-007 @positivo
  Scenario: Propagazione del vincitore nel turno successivo
    Dato una semifinale a eliminazione diretta pronta
    Quando viene registrato un vincitore valido
    Allora il vincitore compare una sola volta nello slot previsto della finale

  @CMP-004 @CMP-008 @positivo
  Scenario: Classifica e qualificazione da un girone
    Dato un girone con tutti gli incontri completati
    Quando l'amministratore completa la fase
    Allora la classifica considera vittorie, differenza set, differenza game, scontro diretto e ranking
    E viene selezionato esattamente il numero configurato di qualificati

  @CMP-008 @negativo
  Scenario: Completamento di una fase con incontri mancanti
    Dato una fase con almeno un incontro senza risultato
    Quando l'amministratore prova a completarla
    Allora l'API risponde con stato 409
    E la fase successiva non viene attivata

  @CMP-008 @NFR-006 @positivo
  Scenario: Attivazione atomica della fase successiva
    Dato una fase completabile e una fase successiva pendente
    Quando l'amministratore completa la fase corrente
    Allora qualificati, seed, stato delle fasi e nuovi incontri vengono aggiornati atomicamente

  @CMP-009 @positivo
  Scenario: Rigenerazione degli incontri di una fase
    Dato una fase con incontri generati
    E un amministratore autorizzato
    Quando elimina e rigenera gli incontri della fase
    Allora restano soltanto gli incontri della nuova generazione
    E le altre fasi non vengono modificate

  @CMP-009 @negativo @sicurezza
  Scenario: Un utente non autorizzato prova a rigenerare il tabellone
    Dato un utente che non amministra il torneo
    Quando invia una richiesta di rigenerazione
    Allora l'API risponde con stato 403
    E gli incontri esistenti restano invariati

  @CMP-010 @positivo
  Scenario: Esportazione PDF della fase selezionata
    Dato un torneo visibile con una fase e incontri generati
    Quando l'utente richiede il PDF della fase
    Allora riceve un file con tipo `application/pdf`
    E il file include dati torneo, partecipanti e struttura della fase

  @DATA-006 @negativo @database
  Scenario: Unicità delle posizioni nella competizione
    Dato un torneo con una fase in posizione 1 e un gruppo in posizione 1
    Quando il sistema tenta di inserire una seconda fase o un secondo gruppo nella stessa posizione del rispettivo contenitore
    Allora il database rifiuta il duplicato

  @DATA-007 @database
  Scenario: Integrità delle relazioni di un incontro
    Dato un torneo e una fase persistiti
    Quando viene creato un incontro valido senza gruppo
    Allora l'incontro appartiene al torneo e alla fase
    E il gruppo può restare nullo
    Ma un incontro senza torneo o senza fase viene rifiutato
