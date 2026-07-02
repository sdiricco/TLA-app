const userSchema = {
  type: 'object',
  required: ['id', 'email', 'role'],
  properties: {
    id: { type: 'string' },
    email: { type: 'string' },
    name: { type: 'string', nullable: true },
    role: { type: 'string', enum: ['admin', 'player'] },
  },
}

const playerSchema = {
  type: 'object',
  required: ['id', 'name', 'ranking'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    ranking: { type: 'integer' },
    birth_date: { type: 'string', nullable: true },
    photo_url: { type: 'string', nullable: true },
    club: { type: 'string', nullable: true },
    phone: { type: 'string', nullable: true },
    user_id: { type: 'string', nullable: true },
    created_at: { type: 'string', nullable: true },
    updated_at: { type: 'string', nullable: true },
  },
}

const tournamentSchema = {
  type: 'object',
  required: ['id', 'name', 'format', 'category', 'status', 'published'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    location: { type: 'string', nullable: true },
    start_date: { type: 'string', nullable: true },
    end_date: { type: 'string', nullable: true },
    format: {
      type: 'string',
      enum: ['single_elimination', 'double_elimination', 'round_robin', 'round_robin_elimination'],
    },
    category: { type: 'string', enum: ['singles', 'doubles'] },
    status: { type: 'string', enum: ['upcoming', 'ongoing', 'completed'] },
    published: { type: 'boolean' },
    participant_limit: { type: 'integer', nullable: true },
    group_count: { type: 'integer', nullable: true },
    qualifiers_per_group: { type: 'integer', nullable: true },
    created_at: { type: 'string', nullable: true },
    updated_at: { type: 'string', nullable: true },
  },
}

const tournamentWithPlayersSchema = {
  allOf: [
    { $ref: '#/components/schemas/Tournament' },
    {
      type: 'object',
      properties: {
        players: {
          type: 'array',
          items: { $ref: '#/components/schemas/Player' },
        },
      },
    },
  ],
}

const matchSchema = {
  type: 'object',
  required: ['id', 'tournament_id', 'round', 'position', 'status'],
  properties: {
    id: { type: 'string' },
    tournament_id: { type: 'string' },
    round: { type: 'integer' },
    position: { type: 'integer' },
    player1_id: { type: 'string', nullable: true },
    player2_id: { type: 'string', nullable: true },
    result: { type: 'string', nullable: true },
    winner_id: { type: 'string', nullable: true },
    status: { type: 'string', enum: ['pending', 'completed'] },
    created_at: { type: 'string', nullable: true },
    updated_at: { type: 'string', nullable: true },
  },
}

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'TLA API',
    version: '1.0.0',
    description:
      'API per gestione tornei, giocatori, auth e match. Per provare le route protette apri "Authorize" e incolla il JWT restituito da `/auth/login` senza il prefisso `Bearer`.',
  },
  servers: [{ url: '/api' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'In Swagger UI incolla solo il token JWT, senza il prefisso `Bearer`.',
      },
    },
    schemas: {
      User: userSchema,
      Player: playerSchema,
      PlayerListResponse: {
        type: 'object',
        required: ['page', 'perPage', 'total', 'values'],
        properties: {
          page: { type: 'integer' },
          perPage: { type: 'integer' },
          total: { type: 'integer' },
          values: {
            type: 'array',
            items: { $ref: '#/components/schemas/Player' },
          },
        },
      },
      Tournament: tournamentSchema,
      TournamentWithPlayers: tournamentWithPlayersSchema,
      TournamentListResponse: {
        type: 'object',
        required: ['page', 'perPage', 'total', 'values'],
        properties: {
          page: { type: 'integer', minimum: 0 },
          perPage: { type: 'integer', minimum: 1 },
          total: { type: 'integer', minimum: 0 },
          values: {
            type: 'array',
            items: { $ref: '#/components/schemas/Tournament' },
          },
        },
      },
      Match: matchSchema,
      ApiError: {
        type: 'object',
        properties: {
          message: { type: 'string' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        responses: {
          200: { description: 'API online' },
        },
      },
    },
    '/health/db': {
      get: {
        summary: 'Database health check',
        responses: {
          200: { description: 'Database reachable' },
          503: { description: 'Database not configured' },
          500: { description: 'Database unreachable' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Login utente',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login riuscito',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: { type: 'string' },
                    user: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          400: {
            description: 'Campi mancanti',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
          401: {
            description: 'Credenziali non valide',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
        },
      },
    },
    '/auth/register': {
      post: {
        summary: 'Registrazione utente',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                  name: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Registrazione riuscita' },
          400: {
            description: 'Errore di validazione',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
          429: {
            description: 'Rate limit superato',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
        },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Utente autenticato corrente',
        responses: {
          200: {
            description: 'Dati utente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          401: { description: 'Non autenticato' },
        },
      },
    },
    '/auth/logout': {
      post: {
        summary: 'Logout',
        responses: {
          204: { description: 'Logout completato' },
        },
      },
    },
    '/players': {
      get: {
        summary: 'Lista giocatori',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'name', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'club', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', minimum: 0 } },
          { name: 'perPage', in: 'query', required: false, schema: { type: 'integer', minimum: 1 } },
        ],
        responses: {
          200: {
            description: 'Lista giocatori paginata',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PlayerListResponse' },
              },
            },
          },
        },
      },
      post: {
        summary: 'Crea giocatore',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                  ranking: { type: 'integer' },
                  birth_date: { type: 'string', nullable: true },
                  photo_url: { type: 'string', nullable: true },
                  club: { type: 'string', nullable: true },
                  phone: { type: 'string', nullable: true },
                  user_id: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Giocatore creato',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Player' },
              },
            },
          },
        },
      },
    },
    '/players/{id}': {
      get: {
        summary: 'Dettaglio giocatore',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Giocatore',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Player' } } },
          },
          404: { description: 'Giocatore non trovato' },
        },
      },
    },
    '/tournaments': {
      get: {
        summary: 'Lista tornei',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'name', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'category', in: 'query', required: false, schema: { type: 'string', enum: ['singles', 'doubles'] } },
          { name: 'status', in: 'query', required: false, schema: { type: 'string', enum: ['upcoming', 'ongoing', 'completed'] } },
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', minimum: 0, default: 0 } },
          { name: 'perPage', in: 'query', required: false, schema: { type: 'integer', minimum: 1, default: 12 } },
        ],
        responses: {
          200: {
            description: 'Lista tornei paginata',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TournamentListResponse' },
              },
            },
          },
        },
      },
      post: {
        summary: 'Crea torneo',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'format', 'category', 'status', 'published'],
                properties: {
                  name: { type: 'string' },
                  location: { type: 'string', nullable: true },
                  start_date: { type: 'string', nullable: true },
                  end_date: { type: 'string', nullable: true },
                  format: {
                    type: 'string',
                    enum: ['single_elimination', 'double_elimination', 'round_robin', 'round_robin_elimination'],
                  },
                  category: { type: 'string', enum: ['singles', 'doubles'] },
                  status: { type: 'string', enum: ['upcoming', 'ongoing', 'completed'] },
                  published: { type: 'boolean' },
                  participant_limit: { type: 'integer', nullable: true },
                  group_count: { type: 'integer', nullable: true },
                  qualifiers_per_group: { type: 'integer', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Torneo creato',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Tournament' },
              },
            },
          },
        },
      },
    },
    '/tournaments/{id}': {
      get: {
        summary: 'Dettaglio torneo',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Torneo con giocatori',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TournamentWithPlayers' },
              },
            },
          },
          404: { description: 'Torneo non trovato' },
        },
      },
      put: {
        summary: 'Aggiorna torneo o seed giocatori',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                oneOf: [
                  {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      location: { type: 'string', nullable: true },
                      start_date: { type: 'string', nullable: true },
                      end_date: { type: 'string', nullable: true },
                      format: {
                        type: 'string',
                        enum: ['single_elimination', 'double_elimination', 'round_robin', 'round_robin_elimination'],
                      },
                      category: { type: 'string', enum: ['singles', 'doubles'] },
                      status: { type: 'string', enum: ['upcoming', 'ongoing', 'completed'] },
                      published: { type: 'boolean' },
                      participant_limit: { type: 'integer', nullable: true },
                      group_count: { type: 'integer', nullable: true },
                      qualifiers_per_group: { type: 'integer', nullable: true },
                    },
                  },
                  {
                    type: 'object',
                    required: ['playerIds'],
                    properties: {
                      playerIds: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Torneo aggiornato',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Tournament' },
              },
            },
          },
          204: { description: 'Seed aggiornati' },
        },
      },
      delete: {
        summary: 'Elimina torneo',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          204: { description: 'Torneo eliminato' },
        },
      },
    },
    '/tournaments/{id}/players': {
      post: {
        summary: 'Aggiungi giocatore al torneo',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['playerId'],
                properties: {
                  playerId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          204: { description: 'Giocatore aggiunto' },
          400: {
            description: 'Torneo al completo o dati non validi',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
          404: {
            description: 'Torneo non trovato',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
        },
      },
    },
    '/tournaments/{id}/publish': {
      patch: {
        summary: 'Pubblica / annulla pubblicazione torneo',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Torneo aggiornato' },
        },
      },
    },
    '/matches/{id}': {
      put: {
        summary: 'Inserisci risultato match',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Match aggiornato',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Match' } } },
          },
        },
      },
    },
    '/matches/{id}/assign': {
      patch: {
        summary: 'Assegna un giocatore a un match',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Match aggiornato',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Match' } } },
          },
        },
      },
    },
    '/tournaments/{id}/matches': {
      get: {
        summary: 'Lista match di un torneo',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Lista match',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Match' },
                },
              },
            },
          },
        },
      },
    },
  },
} as const
