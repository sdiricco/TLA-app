import { http, HttpResponse } from 'msw'
import { mockMatches } from '../data/matches'
import { mockPlayers } from '../data/players'
import { mockTournaments } from '../data/tournaments'
import type { Match, MatchAssignInput, MatchResultInput } from '../../types'
import { buildBracketMatches, buildRoundRobinMatches, buildTournamentMatchesResponse, sortMatches } from '../../utils/matches'

let matches: Match[] = [...mockMatches]
const rankingByPlayerId = new Map(mockPlayers.map((player) => [player.id, player.ranking]))

function getImplicitWinnerId(match: Match): string | null {
  if (match.winner_id) return match.winner_id
  if (match.player1_id && !match.player2_id) return match.player1_id
  if (match.player2_id && !match.player1_id) return match.player2_id
  return null
}

function propagateWinner(matchId: string, winnerId: string): void {
  const currentMatch = matches.find((entry) => entry.id === matchId)
  if (!currentMatch) return

  const nextRound = currentMatch.round_index + 1
  const nextPosition = Math.floor(currentMatch.position / 2)
  const nextMatch = matches.find(
    (entry) =>
      entry.tournament_id === currentMatch.tournament_id &&
      entry.phase_id === currentMatch.phase_id &&
      entry.round_index === nextRound &&
      entry.position === nextPosition,
  )

  if (!nextMatch) return

  if (currentMatch.position % 2 === 0) nextMatch.player1_id = winnerId
  else nextMatch.player2_id = winnerId
  nextMatch.status = nextMatch.player1_id && nextMatch.player2_id ? 'ready' : 'waiting'
}

function autoAdvanceByeMatches(tournamentId: string, phaseId?: string): void {
  const tournamentMatches = sortMatches(
    matches.filter(
      (entry) =>
        entry.tournament_id === tournamentId
        && (!phaseId || entry.phase_id === phaseId)
        && entry.round_index === 0,
    ),
  )
  for (const match of tournamentMatches) {
    const implicitWinnerId = getImplicitWinnerId(match)
    if (!implicitWinnerId || match.winner_id) continue
    match.winner_id = implicitWinnerId
    match.result = 'BYE'
    match.status = 'completed'
    propagateWinner(match.id, implicitWinnerId)
  }
}

export const matchHandlers = [
  http.get('/api/tournaments/:id/matches', ({ params, request }) => {
    const tournament = mockTournaments.find((entry) => entry.id === params['id'])
    if (!tournament) return HttpResponse.json({ message: 'Torneo non trovato' }, { status: 404 })
    const requestedPhaseId = new URL(request.url).searchParams.get('phaseId')
    const phase = tournament.phases?.find((entry) => entry.id === requestedPhaseId)
      ?? tournament.phases?.find((entry) => entry.status === 'active')
      ?? tournament.phases?.[0]
    const tournamentMatches = sortMatches(
      matches
        .filter((match) =>
          match.tournament_id === params['id']
          && (!phase || !match.phase_id || match.phase_id === phase.id),
        )
        .map((match) => ({
          ...match,
          phase_id: match.phase_id ?? phase?.id,
          group_id: match.group_id ?? (phase?.format === 'round_robin' ? phase.groups[0]?.id ?? null : null),
        })),
    )
    return HttpResponse.json({
      ...buildTournamentMatchesResponse({
      id: tournament.id,
      name: tournament.name,
      format: phase?.format ?? tournament.format,
      category: tournament.category,
      status: tournament.status,
      }, phase?.players.length ?? tournament.playerIds.length, tournamentMatches),
      phase,
    })
  }),

  http.post('/api/tournaments/:id/bracket', async ({ params, request }) => {
    const { numPlayers, phaseId } = (await request.json()) as { numPlayers: number; phaseId?: string }
    const tournamentId = params['id'] as string
    const tournament = mockTournaments.find((entry) => entry.id === tournamentId)
    const phase = tournament?.phases?.find((entry) => entry.id === phaseId)
      ?? tournament?.phases?.find((entry) => entry.status === 'active')
      ?? tournament?.phases?.[0]
    matches = matches.filter(
      (match) =>
        match.tournament_id !== tournamentId
        || (phase ? match.phase_id && match.phase_id !== phase.id : false),
    )
    const playerIds = (phase?.players.map((entry) => entry.player_id) ?? tournament?.playerIds ?? [])
      .sort(
        (a, b) =>
          (rankingByPlayerId.get(a) ?? Number.MAX_SAFE_INTEGER) -
          (rankingByPlayerId.get(b) ?? Number.MAX_SAFE_INTEGER),
      )
      .slice(0, numPlayers)
    let newMatches: Match[]
    if (phase?.format === 'round_robin') {
      phase.players.forEach((entry, index) => {
        entry.group_id = phase.groups[index % phase.groups.length]?.id ?? null
      })
      newMatches = phase.groups.flatMap((group) =>
        buildRoundRobinMatches(
          tournamentId,
          phase.players.filter((entry) => entry.group_id === group.id).map((entry) => entry.player_id),
          () => crypto.randomUUID(),
        ).map((match) => ({ ...match, phase_id: phase.id, group_id: group.id })),
      )
    } else {
      newMatches = buildBracketMatches(tournamentId, playerIds, () => crypto.randomUUID())
        .map((match) => ({ ...match, phase_id: phase?.id, group_id: null }))
    }
    matches = sortMatches([...matches, ...newMatches])
    if (phase?.format !== 'round_robin') autoAdvanceByeMatches(tournamentId, phase?.id)
    return HttpResponse.json(sortMatches(
      matches.filter(
        (entry) =>
          entry.tournament_id === tournamentId
          && (!phase || entry.phase_id === phase.id),
      ),
    ))
  }),

  http.patch('/api/matches/:id/assign', async ({ params, request }) => {
    const body = (await request.json()) as MatchAssignInput
    const index = matches.findIndex((m) => m.id === params['id'])
    if (index === -1) return HttpResponse.json({ message: 'Non trovato' }, { status: 404 })
    const match = { ...matches[index]! }
    if (body.slot === 'player1_id') match.player1_id = body.player_id
    else match.player2_id = body.player_id
    // If clearing a player, also clear winner/result
    if (body.player_id === null) {
      match.winner_id = null
      match.result = null
    }
    match.status = match.player1_id && match.player2_id ? 'ready' : 'waiting'
    matches[index] = match
    return HttpResponse.json(match)
  }),

  http.put('/api/matches/:id', async ({ params, request }) => {
    const body = (await request.json()) as MatchResultInput
    const index = matches.findIndex((m) => m.id === params['id'])
    if (index === -1) return HttpResponse.json({ message: 'Non trovato' }, { status: 404 })
    matches[index] = { ...matches[index]!, result: body.result, winner_id: body.winner_id, status: 'completed' }
    const tournament = mockTournaments.find((entry) => entry.id === matches[index]!.tournament_id)
    const phase = tournament?.phases?.find((entry) => entry.id === matches[index]!.phase_id)
    if ((phase?.format ?? tournament?.format) !== 'round_robin') {
      propagateWinner(matches[index]!.id, body.winner_id)
    }
    return HttpResponse.json(matches[index])
  }),

  http.post('/api/tournaments/:id/phases/:phaseId/complete', ({ params }) => {
    const tournament = mockTournaments.find((entry) => entry.id === params['id'])
    const phase = tournament?.phases?.find((entry) => entry.id === params['phaseId'])
    const nextPhase = tournament?.phases?.find(
      (entry) => entry.position === (phase?.position ?? 0) + 1,
    )
    if (!tournament || !phase || !nextPhase) {
      return HttpResponse.json({ message: 'Fase non trovata' }, { status: 404 })
    }
    const phaseMatches = matches.filter((match) => match.phase_id === phase.id)
    if (phaseMatches.length === 0 || phaseMatches.some((match) => match.status !== 'completed')) {
      return HttpResponse.json(
        { message: 'Completa tutti gli incontri prima di concludere la fase' },
        { status: 409 },
      )
    }
    const finalRound = Math.max(-1, ...phaseMatches.map((match) => match.round_index))
    const finalWinnerId = phaseMatches.find((match) => match.round_index === finalRound)?.winner_id
    const ranked = phase.players
      .map((entry) => ({
        entry,
        wins: phaseMatches.filter((match) => match.winner_id === entry.player_id).length,
        lostRound: Math.max(
          -1,
          ...phaseMatches
            .filter(
              (match) =>
                (match.player1_id === entry.player_id || match.player2_id === entry.player_id)
                && match.winner_id !== entry.player_id,
            )
            .map((match) => match.round_index),
        ),
        wonTournament: entry.player_id === finalWinnerId,
        ranking: rankingByPlayerId.get(entry.player_id) ?? Number.MAX_SAFE_INTEGER,
      }))
      .sort((left, right) =>
        phase.format === 'round_robin'
          ? right.wins - left.wins || left.ranking - right.ranking
          : Number(right.wonTournament) - Number(left.wonTournament)
            || right.lostRound - left.lostRound
            || left.ranking - right.ranking,
      )
    const selectedIds = new Set<string>()
    if (phase.format === 'round_robin') {
      const guaranteedPerGroup = Math.floor(
        phase.output_count / Math.max(1, phase.groups.length),
      )
      phase.groups.forEach((group) => {
        ranked
          .filter((row) => row.entry.group_id === group.id)
          .slice(0, guaranteedPerGroup)
          .forEach((row) => selectedIds.add(row.entry.player_id))
      })
    }
    ranked
      .filter((row) => !selectedIds.has(row.entry.player_id))
      .slice(0, phase.output_count - selectedIds.size)
      .forEach((row) => selectedIds.add(row.entry.player_id))
    const qualified = ranked
      .filter((row) => selectedIds.has(row.entry.player_id))
      .slice(0, phase.output_count)
    phase.players.forEach((entry) => {
      entry.qualified = qualified.some((row) => row.entry.player_id === entry.player_id)
    })
    nextPhase.players = qualified.map((row, index) => ({
      player_id: row.entry.player_id,
      seed: index + 1,
      qualified: false,
    }))
    phase.status = 'completed'
    nextPhase.status = 'active'
    const nextMatches = nextPhase.format === 'round_robin'
      ? nextPhase.groups.flatMap((group, groupIndex) => {
          const groupPlayers = nextPhase.players.filter(
            (_, playerIndex) => playerIndex % nextPhase.groups.length === groupIndex,
          )
          groupPlayers.forEach((entry) => { entry.group_id = group.id })
          return buildRoundRobinMatches(
            tournament.id,
            groupPlayers.map((entry) => entry.player_id),
            () => crypto.randomUUID(),
          ).map((match) => ({ ...match, phase_id: nextPhase.id, group_id: group.id }))
        })
      : buildBracketMatches(
          tournament.id,
          nextPhase.players.map((entry) => entry.player_id),
          () => crypto.randomUUID(),
        ).map((match) => ({ ...match, phase_id: nextPhase.id, group_id: null }))
    matches = sortMatches([
      ...matches.filter((match) => match.phase_id !== nextPhase.id),
      ...nextMatches,
    ])
    autoAdvanceByeMatches(tournament.id, nextPhase.id)
    return HttpResponse.json(tournament)
  }),

  http.delete('/api/tournaments/:id/matches', ({ params, request }) => {
    const phaseId = new URL(request.url).searchParams.get('phaseId')
    matches = matches.filter(
      (match) =>
        match.tournament_id !== params['id']
        || (phaseId ? match.phase_id !== phaseId : false),
    )
    return new HttpResponse(null, { status: 204 })
  }),
]
