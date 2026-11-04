# language: it
@inviti @notifiche
Funzionalità: Inviti e notifiche di organizzazione
  Come amministratore o giocatore registrato
  Voglio inviare e gestire inviti a un club
  Affinché l'ingresso avvenga senza duplicare identità sportive

  @ORG-010 @positivo
  Scenario: Ricerca dei candidati invitabili
    Dato un amministratore nel contesto del Club A
    E profili globali con scheda giocatore
    Quando cerca un candidato per nome
    Allora riceve al massimo 30 risultati ordinati per nome
    E non vede membri del Club A
    E non vede profili con un invito pendente per il Club A

  @ORG-010 @DATA-004 @positivo
  Scenario: Invito di un giocatore TLA tramite scheda globale
    Dato un amministratore nel contesto del Club A
    E un giocatore globale con account che non appartiene al Club A
    Quando l'amministratore invia l'invito
    Allora viene creato un solo invito pendente
    E l'invito è associato al Club A, al destinatario e al mittente

  @ORG-010 @negativo
  Scenario: Invito di un profilo già membro
    Dato un giocatore già membro del Club A
    Quando un amministratore del Club A prova a invitarlo
    Allora l'API risponde con stato 409
    E non crea un nuovo invito

  @ORG-010 @negativo @sicurezza
  Scenario: Un membro ordinario tenta di inviare un invito
    Dato un membro ordinario nel contesto del Club A
    Quando invia direttamente una richiesta di invito
    Allora l'API risponde con stato 403
    E nessuna notifica viene creata

  @NOT-001 @positivo @ui
  Scenario: Elenco delle notifiche personali
    Dato un utente registrato con più inviti ricevuti
    Quando apre il centro notifiche
    Allora vede al massimo 50 inviti ordinati dal più recente
    E ogni invito mostra organizzazione, stato e mittente disponibile

  @NOT-001 @negativo @sicurezza
  Scenario: Un ospite apre il centro notifiche
    Dato una sessione ospite
    Quando prova ad aprire il centro notifiche
    Allora l'app lo reindirizza fuori dall'area personale
    E l'API non restituisce notifiche

  @NOT-002 @positivo
  Scenario: Conteggio degli inviti non letti
    Dato due inviti pendenti non letti
    E un invito accettato non letto
    E un invito pendente già letto
    Quando l'app richiede il conteggio non letto
    Allora il conteggio restituito è 2

  @NOT-003 @negativo @sicurezza
  Scenario: Un utente tenta di leggere la notifica altrui
    Dato una notifica destinata a un altro profilo
    Quando l'utente prova a segnarla come letta
    Allora l'API risponde con stato 404
    E la notifica resta invariata

  @NOT-004 @positivo
  Scenario: Rifiuto di un invito
    Dato un invito pendente destinato all'utente
    Quando l'utente lo rifiuta
    Allora l'invito assume stato rifiutato
    E vengono registrate lettura e data di risposta
    E non viene creata alcuna membership

  @NOT-004 @negativo
  Scenario: Risposta ripetuta a un invito già gestito
    Dato un invito già accettato o rifiutato
    Quando l'utente prova a rispondere nuovamente
    Allora l'API comunica che l'invito non è più disponibile
    E membership e schede non vengono duplicate

  @NOT-005 @NFR-006 @positivo @smoke
  Scenario: Accettazione di un invito con scheda globale
    Dato un invito pendente destinato all'utente
    E una scheda giocatore globale collegata all'utente
    Quando l'utente accetta l'invito
    Allora membership, scheda giocatore del club e stato dell'invito vengono aggiornati atomicamente
    E l'utente diventa membro dell'organizzazione

  @NOT-005 @negativo
  Scenario: Accettazione senza scheda giocatore globale
    Dato un invito pendente destinato a un esploratore senza scheda globale
    Quando l'utente accetta l'invito
    Allora l'API risponde con stato 409
    E chiede di completare prima la scheda giocatore
    E non crea membership o schede parziali
