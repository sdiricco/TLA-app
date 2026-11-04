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
- I dati nominati negli scenari sono fixture logiche. Prima dell'automazione
  dovranno essere mappati su factory, seed o mock deterministici.
- Gli scenari non sono ancora collegati a un runner Cucumber: per renderli
  eseguibili servono step definitions e configurazione del test runner.

## Priorità suggerita per l'automazione

1. Scenari `@smoke` e `@sicurezza`.
2. Iscrizione ai tornei e registrazione dei risultati.
3. Isolamento dei contesti organizzativi.
4. Inviti, notifiche e operazioni transazionali.
5. Scenari responsive, accessibilità e PWA.
