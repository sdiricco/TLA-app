# language: it
@autenticazione
Funzionalità: Identità, accesso e ciclo di vita dell'account
  Come visitatore o utente registrato
  Voglio accedere a TLA con il livello di autorizzazione corretto
  Affinché la mia identità e i miei dati personali siano protetti

  @AUTH-001 @positivo @smoke @ui
  Scenario: Registrazione con conferma email richiesta
    Dato un visitatore nella pagina di registrazione
    Quando inserisce nome, email non ancora registrata e password valida
    E invia il modulo
    Allora il sistema crea la richiesta di registrazione
    E mostra che l'email deve essere confermata
    E non apre una sessione autenticata prima della conferma

  @AUTH-001 @negativo @ui
  Schema dello scenario: Rifiuto di una registrazione incompleta
    Dato un visitatore nella pagina di registrazione
    Quando invia il modulo con email "<email>" e password "<password>"
    Allora la registrazione non viene completata
    E viene mostrato un errore utilizzabile dall'utente

    Esempi:
      | email              | password      |
      |                    | Password123!  |
      | utente@example.com |               |

  @AUTH-002 @positivo @smoke @ui
  Scenario: Conferma dell'email tramite link valido
    Dato un account registrato in attesa di conferma
    Quando l'utente apre un link di conferma valido
    Allora l'app mostra lo stato di avanzamento della conferma
    E completa la sessione autenticata
    E mostra un esito positivo prima di aprire l'applicazione

  @AUTH-002 @negativo @ui
  Scenario: Apertura di un link di conferma non valido
    Dato un visitatore con un link di conferma scaduto o alterato
    Quando apre il link
    Allora non viene creata alcuna sessione
    E l'app mostra un esito esplicito di link non valido
    E consente di tornare all'accesso

  @AUTH-002 @api @positivo
  Scenario: Nuovo invio dell'email di conferma
    Dato un account esistente non ancora confermato
    Quando l'utente richiede un nuovo invio per la propria email
    Allora l'API accetta la richiesta senza rivelare informazioni sensibili
    E viene inviato un nuovo link verso un'origine frontend consentita

  @AUTH-003 @positivo @smoke @ui
  Scenario: Accesso con credenziali valide
    Dato un account confermato
    Quando l'utente inserisce email e password corrette
    Allora viene aperta una sessione autenticata
    E la sessione resta disponibile durante la navigazione

  @AUTH-003 @negativo @ui
  Scenario: Accesso con credenziali errate
    Dato un account confermato
    Quando l'utente inserisce una password errata
    Allora non viene aperta alcuna sessione
    E viene mostrato un errore di autenticazione

  @AUTH-003 @positivo @smoke
  Scenario: Disconnessione dell'utente
    Dato un utente autenticato
    Quando esegue il logout
    Allora le credenziali locali vengono rimosse
    E una rotta protetta lo riporta alla pagina di accesso

  @AUTH-004 @positivo @smoke @ui
  Scenario: Ingresso come ospite
    Dato un visitatore nella pagina di accesso
    Quando sceglie di continuare come ospite
    Allora entra nell'app senza credenziali Supabase
    E può consultare i contenuti pubblici consentiti
    Ma non vede azioni personali o amministrative

  @AUTH-004 @AUTH-009 @negativo @sicurezza
  Scenario: Un ospite tenta di aprire una funzione personale
    Dato una sessione ospite
    Quando l'ospite apre il profilo personale, le notifiche o la creazione di una richiesta
    Allora l'app lo reindirizza a un'area consultabile
    E l'API rifiuta comunque un'eventuale mutazione diretta

  @AUTH-005 @AUTH-006 @positivo @ui
  Scenario: Onboarding come giocatore
    Dato un account autenticato con onboarding incompleto
    Quando l'utente sceglie il percorso giocatore
    E inserisce un nome valido e dati sportivi facoltativi
    Allora viene creata una scheda giocatore globale con ranking zero
    E l'onboarding viene marcato come completato

  @AUTH-005 @positivo @ui
  Scenario: Onboarding come esploratore
    Dato un account autenticato con onboarding incompleto
    Quando l'utente sceglie di esplorare senza creare una scheda giocatore
    Allora l'onboarding viene completato con intento esploratore
    E l'utente entra nella dashboard senza scheda sportiva

  @AUTH-005 @ORG-001 @positivo @ui
  Scenario: Onboarding come organizzatore
    Dato un account autenticato con onboarding incompleto
    Quando l'utente sceglie di creare un'organizzazione
    E completa i dati obbligatori dell'organizzazione
    Allora diventa proprietario della nuova organizzazione
    E l'onboarding viene completato con intento organizzatore

  @AUTH-006 @negativo @api
  Schema dello scenario: Validazione della scheda giocatore in onboarding
    Dato un account autenticato con onboarding incompleto
    Quando invia una scheda giocatore con nome "<nome>" e data "<data>"
    Allora l'API rifiuta la configurazione
    E non crea una scheda giocatore parziale

    Esempi:
      | nome | data       |
      | A    | 2000-01-01 |
      | Mario| non-valida |

  @AUTH-007 @PLY-007 @positivo
  Scenario: Aggiornamento del nome personale
    Dato un utente con profilo e più schede giocatore collegate
    Quando modifica il proprio nome con un valore da 2 a 80 caratteri
    Allora il profilo usa il nuovo nome
    E tutte le schede collegate usano il nuovo nome

  @AUTH-008 @positivo @sicurezza
  Scenario: Cancellazione di un account senza organizzazioni attive
    Dato un utente che possiede solo tornei globali e un'organizzazione vuota
    Quando conferma la cancellazione con la propria email
    Allora l'identità di autenticazione viene eliminata
    E i tornei globali personali e l'organizzazione vuota vengono rimossi
    E le schede necessarie allo storico vengono anonimizzate

  @AUTH-008 @negativo @sicurezza
  Scenario: Cancellazione bloccata per evitare un'organizzazione senza proprietario
    Dato un utente unico proprietario di un'organizzazione con altri membri
    Quando richiede la cancellazione dell'account
    Allora l'API risponde con un conflitto
    E indica l'organizzazione che richiede un altro proprietario
    E l'identità dell'utente non viene eliminata

  @AUTH-009 @NFR-002 @negativo @api @sicurezza
  Scenario: Richiesta a una rotta protetta senza token
    Dato un client senza sessione autenticata
    Quando invia una richiesta a una rotta protetta
    Allora l'API risponde con stato 401
    E non restituisce dati protetti

  @DATA-001 @negativo @database
  Scenario: Unicità dell'email del profilo
    Dato un profilo applicativo con email "utente@example.com"
    Quando il sistema tenta di creare un altro profilo con la stessa email
    Allora il database rifiuta il duplicato
    E resta un solo profilo con quell'email
