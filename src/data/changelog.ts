export type ChangelogKind = 'feature' | 'improvement' | 'fix'

export interface ChangelogEntry {
  date: string
  version: string
  kind: ChangelogKind
  title: string
  description: string
  items: string[]
}

export const changelogEntries: ChangelogEntry[] = [
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
