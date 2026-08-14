export type ChangelogKind = 'feature' | 'improvement' | 'fix'

export interface ChangelogEntry {
  date: string
  version: string
  kind: ChangelogKind
  title: string
  description: string
  items: string[]
}

// Keep newest entries first. Every user-visible change must update this list in
// the same pull request; see the product changelog policy in AGENTS.md.
export const changelogEntries: ChangelogEntry[] = [
  {
    date: '2026-08-14',
    version: 'Accesso 1.1',
    kind: 'fix',
    title: 'Registrazione e conferma email più affidabili',
    description: 'Il link ricevuto via email completa ora correttamente l’attivazione e restituisce sempre un esito chiaro.',
    items: [
      'Nuova schermata di conferma con stato di successo o link non valido',
      'Avanzamento visibile mentre il server completa l’accesso dopo la conferma',
      'Aggiornamenti della PWA applicati automaticamente per evitare versioni obsolete',
      'Redirect delle email verso il frontend utilizzato per la registrazione',
      'Dati della registrazione precedente rimossi dopo login, logout o cambio pagina',
    ],
  },
  {
    date: '2026-08-13',
    version: 'Tornei 2.0',
    kind: 'improvement',
    title: 'Tornei a fasi più semplici da gestire',
    description: 'Il tabellone mostra solo il contesto necessario e rende esplicito quando una fase può avanzare.',
    items: [
      'Selettori compatti per fase e girone',
      'Percorso completo consultabile in un pannello dedicato',
      'Avanzamento basato sugli incontri completati',
      'Navigazione tra giornate con controlli precedente e successivo',
      'Accesso ai giocatori integrato nel riepilogo del torneo',
      'Nome e descrizione della fase visibili durante la gestione del tabellone',
      'Topbar compatta e condivisa tra desktop e mobile',
    ],
  },
  {
    date: '2026-08-12',
    version: 'UX 2.0',
    kind: 'improvement',
    title: 'Navigazione e gestione più immediate',
    description: 'Le aree principali dell’app condividono ora una gerarchia più chiara e controlli più adatti a desktop e mobile.',
    items: [
      'Ricerca globale e azioni principali integrate nella topbar',
      'Filtri di tornei e giocatori più compatti e leggibili',
      'Profilo giocatore ridisegnato e modulo di modifica semplificato',
      'Sidebar, richieste e impostazioni uniformate al nuovo design',
    ],
  },
  {
    date: '2026-07-13',
    version: 'Backlog 1.0',
    kind: 'feature',
    title: 'Richieste e attività dell’organizzazione',
    description: 'Suggerimenti, bug e idee possono essere raccolti e portati avanti con uno stato condiviso.',
    items: ['Priorità e tipologie di richiesta', 'Stati aperta, pianificata, in lavorazione e completata', 'Gestione dello stato riservata agli amministratori'],
  },
  {
    date: '2026-07-10',
    version: 'Organizzazioni 1.1',
    kind: 'feature',
    title: 'Organizzazioni pubbliche e private',
    description: 'Le community possono ora essere scoperte oppure condivise in modo riservato.',
    items: [
      'Ricerca pubblica per nome, città e sport',
      'Ingresso immediato nelle organizzazioni pubbliche',
      'Codici di accesso per le organizzazioni private',
      'Slug, visibilità e conteggio dei membri',
    ],
  },
  {
    date: '2026-07-09',
    version: 'Accesso 1.0',
    kind: 'improvement',
    title: 'Esperienza ospite in sola lettura',
    description: 'È possibile esplorare organizzazioni, tornei e giocatori senza accedere alle funzioni personali.',
    items: ['Navigazione ospite dedicata', 'Profilo personale nascosto agli ospiti', 'Contesto organizzativo selezionabile'],
  },
  {
    date: '2026-07-07',
    version: 'Organizations 1.0',
    kind: 'feature',
    title: 'Spazi separati per ogni organizzazione',
    description: 'Giocatori, tornei, ruoli e accessi sono ora isolati per organizzazione.',
    items: ['Membership multiple per utente', 'Ruoli proprietario, amministratore e membro', 'Codice di ingresso con accesso immediato'],
  },
  {
    date: '2026-07-03',
    version: 'Tornei 1.0',
    kind: 'improvement',
    title: 'Bracket e tornei più chiari',
    description: 'La visualizzazione dei tornei espone meglio turni, BYE e partite ancora da definire.',
    items: ['Round indicizzati', 'BYE espliciti', 'Supporto ai gironi e al round robin'],
  },
  {
    date: '2026-07-01',
    version: 'Mobile 1.0',
    kind: 'improvement',
    title: 'Nuova esperienza mobile',
    description: 'L’interfaccia è stata resa più densa, leggibile e adatta all’uso da smartphone.',
    items: ['Bottom navigation mobile', 'Sidebar responsive', 'Base PWA installabile'],
  },
]
