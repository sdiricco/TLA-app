# Tournament phases

Tournaments may contain one or more ordered phases.

## Supported structures

- Single elimination: one `single_elimination` phase.
- Round robin: one `round_robin` phase with one group.
- Phased tournament: an ordered list containing any number of `round_robin`
  and `single_elimination` phases.

Each phase receives the qualified players produced by the previous phase. Its
`output_count` must be less than or equal to its input count. The first input
count is the tournament participant limit; subsequent input counts are derived
from the preceding phase, so inconsistent pipelines cannot be persisted.

The legacy `tournaments.format` field remains available for list filtering and
backwards compatibility. Runtime match behavior is determined by the format of
the phase that owns the match.

## Data model

- `tournament_phases` stores ordered phases, their lifecycle status and the
  total number of players produced by each phase (`output_count`). Each phase
  also has a concise name and a description shown in the tournament context.
- `tournament_groups` stores the groups belonging to a round-robin phase.
- `tournament_phase_players` snapshots players, group allocation, seed,
  qualification status and source rank for each phase.
- `matches.phase_id` and `matches.group_id` scope results and bracket
  progression to the correct phase.

Existing tournaments are migrated to a first phase. Existing
`round_robin_elimination` tournaments receive a pending final phase.

## Qualification

An administrator explicitly concludes a phase after every match has a result.
The server then:

1. ranks the phase players according to its format;
2. selects exactly `output_count` players;
3. for round robins, guarantees the same base number of places to each group
   and assigns any remaining places by the overall ranking based on wins, set
   difference, game difference, head-to-head and initial ranking;
4. for elimination phases, ranks players by the round reached, seed and initial
   ranking;
5. snapshots the qualifiers and their seeds in the next phase;
6. activates and generates the next phase.

The next phase may itself be a round robin or an elimination phase. Generated
elimination rounds keep stronger seeds separated and avoid an immediate rematch
between players from the same group when a valid swap is available.

Phase completion is exposed through:

```text
POST /api/tournaments/:tournamentId/phases/:phaseId/complete
```

Match and PDF endpoints accept an optional `phaseId` query parameter.
