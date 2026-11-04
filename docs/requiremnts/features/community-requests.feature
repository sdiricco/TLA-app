# language: it
@richieste
Funzionalità: Backlog condiviso dell'organizzazione
  Come membro di un'organizzazione
  Voglio proporre, seguire e discutere richieste
  Affinché la community possa rendere visibili priorità e avanzamento

  Contesto:
    Dato il contesto del Club A selezionato

  @REQ-001 @positivo @smoke
  Scenario: Creazione di una richiesta valida
    Dato un membro registrato del Club A
    Quando crea una richiesta con titolo, tipo, priorità e descrizione validi
    Allora la richiesta viene salvata nel Club A
    E lo stato iniziale è aperto
    E l'autore corrisponde al profilo autenticato

  @REQ-001 @negativo
  Scenario: Titolo troppo corto
    Dato un membro registrato del Club A
    Quando crea una richiesta con un titolo di due caratteri
    Allora l'API rifiuta la richiesta
    E non salva contenuti parziali

  @REQ-001 @negativo @sicurezza
  Scenario: Un ospite prova a creare una richiesta
    Dato una sessione ospite nel contesto pubblico del Club A
    Quando invia direttamente una nuova richiesta
    Allora l'API risponde con stato 403
    E la richiesta non viene creata

  @REQ-002 @positivo
  Schema dello scenario: Aggiornamento dello stato da parte di un amministratore
    Dato una richiesta esistente
    E un amministratore del Club A
    Quando imposta lo stato "<stato>"
    Allora la richiesta mostra lo stato "<stato>"

    Esempi:
      | stato       |
      | open        |
      | planned     |
      | in_progress |
      | done        |
      | rejected    |

  @REQ-002 @negativo @sicurezza
  Scenario: Un membro ordinario prova a cambiare lo stato
    Dato una richiesta aperta
    E un membro ordinario del Club A
    Quando invia direttamente lo stato completato
    Allora l'API risponde con stato 403
    E la richiesta resta aperta

  @REQ-003 @positivo
  Scenario: Filtro per stato e tipo
    Dato richieste con stati e tipi differenti
    Quando l'utente filtra per stato aperto e tipo bug
    Allora vede soltanto i bug aperti del Club A
    E i risultati sono ordinati per stato, priorità e data secondo la regola applicativa

  @REQ-004 @DATA-004 @positivo
  Scenario: Segnalazione di una richiesta importante
    Dato un membro registrato e una richiesta esistente
    Quando il membro la segnala come importante
    Allora il conteggio aumenta di uno
    E la risposta indica che il membro l'ha già segnalata

  @REQ-004 @positivo
  Scenario: Segnalazione ripetuta della stessa richiesta
    Dato un membro che ha già segnalato una richiesta come importante
    Quando ripete l'azione
    Allora il conteggio non aumenta
    E resta un solo voto per il profilo

  @REQ-005 @positivo
  Scenario: Aggiunta di un commento
    Dato un membro registrato e una richiesta esistente
    Quando aggiunge un commento da 1 a 2000 caratteri
    Allora il commento appare in ordine cronologico
    E mostra l'autore corretto

  @REQ-005 @negativo
  Schema dello scenario: Commento con lunghezza non valida
    Dato un membro registrato e una richiesta esistente
    Quando invia un commento "<contenuto>"
    Allora l'API rifiuta il commento

    Esempi:
      | contenuto |
      |           |
      | [testo di oltre 2000 caratteri] |

  @REQ-006 @positivo
  Schema dello scenario: Caricamento di un'immagine supportata
    Dato un membro registrato
    Quando carica un'immagine "<formato>" più piccola di 5 MB
    Allora il file viene salvato nel percorso autorizzato del bucket `request-images`
    E l'API restituisce l'URL dell'immagine

    Esempi:
      | formato |
      | JPG     |
      | PNG     |
      | WEBP    |
      | GIF     |

  @REQ-006 @negativo
  Schema dello scenario: Immagine non accettata
    Dato un membro registrato
    Quando carica "<file>"
    Allora l'API rifiuta il caricamento
    E non restituisce un URL pubblico

    Esempi:
      | file                       |
      | un PDF                     |
      | un'immagine maggiore di 5 MB |

  @REQ-006 @NFR-002 @negativo @sicurezza
  Scenario: Upload diretto senza autenticazione
    Dato un client senza token autenticato
    Quando tenta di caricare un oggetto nel percorso delle richieste
    Allora API o policy Storage negano l'operazione

  @REQ-007 @sicurezza
  Scenario: Sanificazione della descrizione
    Dato un membro registrato
    Quando crea una richiesta con markup attivo o attributi pericolosi
    Allora il contenuto pericoloso viene rimosso
    E la descrizione restituita non può eseguire script

  @REQ-001 @ORG-007 @negativo @sicurezza
  Scenario: Accesso a una richiesta di un altro contesto
    Dato una richiesta appartenente al Club B
    Quando un membro del Club A ne richiede direttamente l'ID
    Allora l'API risponde come risorsa non trovata nel contesto corrente
    E non espone titolo, autore o commenti
