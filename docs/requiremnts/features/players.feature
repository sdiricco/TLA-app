# language: it
@giocatori
Funzionalità: Anagrafica e profilo sportivo dei giocatori
  Come giocatore o amministratore
  Voglio gestire e consultare le schede sportive autorizzate
  Affinché identità, ranking e storico siano coerenti

  @PLY-001 @positivo
  Scenario: Consultazione di una scheda senza account
    Dato una scheda giocatore gestita dal club e non collegata a un profilo
    Quando un utente autorizzato apre il dettaglio
    Allora vede i dati sportivi disponibili
    E vede che la scheda non è collegata a un account

  @PLY-001 @ORG-007 @sicurezza
  Scenario: Visibilità dei giocatori limitata al contesto
    Dato un giocatore globale, un giocatore del Club A e un giocatore del Club B
    Quando un membro del Club A consulta i giocatori nel contesto Club A
    Allora vede il giocatore del Club A
    Ma non vede il giocatore del Club B

  @PLY-002 @positivo
  Scenario: Creazione di un giocatore da parte di un amministratore
    Dato un amministratore nel contesto del Club A
    Quando crea una scheda con nome, ranking e dati facoltativi validi
    Allora la scheda viene salvata nel Club A
    E compare nella lista dei giocatori del Club A

  @PLY-002 @negativo @sicurezza
  Scenario: Un membro ordinario prova a creare un giocatore
    Dato un membro ordinario nel contesto del Club A
    Quando invia direttamente i dati di un nuovo giocatore
    Allora l'API risponde con stato 403
    E non crea alcuna scheda

  @PLY-002 @DATA-008 @positivo
  Scenario: Eliminazione di un giocatore da parte di un amministratore
    Dato un amministratore autorizzato
    E un giocatore eliminabile nel contesto selezionato
    Quando elimina la scheda
    Allora la scheda non compare più nella lista
    E il database non conserva riferimenti orfani contrari ai vincoli del modello

  @PLY-003 @positivo
  Schema dello scenario: Ordinamento della lista giocatori
    Dato più giocatori visibili con nomi, ranking, club e date differenti
    Quando l'utente ordina per "<campo>" in direzione "<direzione>"
    Allora la lista rispetta l'ordinamento richiesto
    E usa il nome come criterio secondario quando previsto

    Esempi:
      | campo      | direzione |
      | ranking    | asc       |
      | ranking    | desc      |
      | name       | asc       |
      | club       | asc       |
      | created_at | desc      |

  @PLY-003 @NFR-007 @positivo
  Scenario: Paginazione della lista giocatori
    Dato più giocatori del numero richiesto per pagina
    Quando l'utente richiede la seconda pagina
    Allora riceve soltanto gli elementi della seconda pagina
    E la risposta contiene pagina, dimensione e totale coerenti

  @PLY-004 @positivo @smoke
  Scenario: Modifica self-service del profilo sportivo
    Dato un utente con scheda giocatore collegata
    Quando aggiorna nome, data di nascita, foto, club e telefono con valori validi
    Allora la propria scheda viene aggiornata
    E il ranking resta invariato

  @PLY-004 @negativo
  Scenario: Data di nascita futura
    Dato un utente con scheda giocatore collegata
    Quando imposta una data di nascita futura
    Allora l'API rifiuta la modifica
    E conserva la data precedente

  @PLY-004 @negativo @sicurezza
  Scenario: Modifica della scheda di un altro giocatore
    Dato due utenti con schede collegate distinte
    Quando il primo tenta di modificare la scheda del secondo senza privilegi
    Allora l'API rifiuta la richiesta
    E la scheda del secondo resta invariata

  @PLY-005 @NFR-003 @privacy
  Scenario: Distinzione tra identità collegata e non collegata
    Dato una scheda collegata e una scheda senza account
    Quando un utente autenticato apre i rispettivi dettagli
    Allora l'interfaccia mostra correttamente lo stato di collegamento
    E non espone credenziali o token dell'account

  @PLY-006 @positivo
  Scenario: Calcolo dello storico del giocatore
    Dato un giocatore con incontri completati visibili e incontri non completati
    Quando apre il proprio dettaglio
    Allora le statistiche contano soltanto gli incontri completati
    E mostrano vittorie, sconfitte, percentuale e forma recente coerenti

  @PLY-007 @AUTH-007 @positivo
  Scenario: Propagazione del nome alle schede collegate
    Dato un profilo con una scheda globale e una scheda nel Club A
    Quando l'utente aggiorna il proprio nome
    Allora entrambe le schede mostrano il nuovo nome
    E ranking e appartenenze restano invariati
