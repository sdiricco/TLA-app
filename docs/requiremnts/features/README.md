# Scenari di accettazione Gherkin

Questa cartella traduce i requisiti di
[`project-requirements.md`](../project-requirements.md) in scenari di
accettazione leggibili da prodotto, sviluppo e QA.

## Struttura

| File | Ambito |
|---|---|
| `authentication.feature` | Registrazione, accesso, onboarding, profilo e cancellazione account. |
| `organizations.feature` | Creazione, scoperta, ingresso, contesto e autorizzazioni delle organizzazioni. |
| `invitations-notifications.feature` | Inviti ai club, notifiche e risposta dell'invitato. |
| `players.feature` | Anagrafica, profilo sportivo, filtri, statistiche e privacy. |
| `tournaments.feature` | Creazione, visibilità, iscrizioni, organizzatore, pubblicazione e regolamenti. |
| `competition.feature` | Fasi, gironi, tabelloni, risultati, avanzamento e PDF. |
| `community-requests.feature` | Backlog della community, voti, commenti, immagini e sanificazione. |
| `experience-security.feature` | Dashboard, tema, responsive, PWA, API e confini di sicurezza. |

## Convenzioni

- Ogni scenario usa il dialetto Gherkin italiano.
- I tag come `@AUTH-001` collegano lo scenario al requisito corrispondente.
- `@positivo`, `@negativo`, `@sicurezza`, `@api`, `@ui` e `@mobile`
  consentono di comporre suite mirate.
- Gli scenari descrivono risultati osservabili e non dettagli di
  implementazione, salvo quando un requisito impone uno specifico confine API
  o di sicurezza.
- I dati nominati negli scenari sono fixture logiche e vengono mappati su
  factory, seed o mock deterministici nei test eseguibili.
- I test dichiarano la tracciabilità con `@req-covered` quando verificano tutti
  i criteri osservabili del requisito e con `@req-partial` quando ne verificano
  soltanto una parte.
- `npm run test:requirements` confronta i 90 ID della baseline con i tag
  Gherkin e con le annotazioni presenti nei test. Il comando fallisce in caso
  di ID mancanti o sconosciuti, oppure se la copertura scende sotto la baseline
  registrata nello script npm; riporta separatamente copertura completa,
  parziale e assente. Quando si aggiungono test, la baseline va aumentata nella
  stessa modifica.
- I file `.feature` restano la specifica leggibile; Playwright e i test Node
  costituiscono il livello eseguibile. Gli scenari non ancora automatizzati
  rimangono visibili nel rapporto di tracciabilità.

## Priorità suggerita per l'automazione

1. Scenari `@smoke` e `@sicurezza`.
2. Iscrizione ai tornei e registrazione dei risultati.
3. Isolamento dei contesti organizzativi.
4. Inviti, notifiche e operazioni transazionali.
5. Scenari responsive, accessibilità e PWA.

## Comandi

```bash
npm run test:requirements
npm run test:server
npm run test:e2e
```

La CI esegue tutti e tre i livelli. I test Playwright verificano i flussi UI;
i test Node coprono regole di dominio e confini HTTP. I requisiti RLS e Storage
richiedono inoltre test contro un progetto Supabase locale o isolato e non
devono essere considerati coperti da risposte HTTP simulate.
