import { randomUUID } from 'node:crypto'
import { Prisma } from '@prisma/client'
import type { Match, TournamentPhaseInput } from '../../../src/types'
import { buildRoundRobinMatches } from './bracket'
import { autoAdvanceByeMatches } from './matchProgression'

export const tournamentPhaseInclude = {
  groups: { orderBy: { position: 'asc' as const } },
  players: { orderBy: [{ seed: 'asc' as const }, { createdAt: 'asc' as const }] },
} satisfies Prisma.TournamentPhaseInclude

type PhaseTransaction = Prisma.TransactionClient

type StandingRow = {
  playerId: string
  groupId: string
  ranking: number
  played: number
  wins: number
  losses: number
  setDifference: number
  gameDifference: number
}

export function normalizeTournamentPhases(
  format: string,
  phases: TournamentPhaseInput[] | undefined,
  groupCount: number | null | undefined,
  qualifiersPerGroup: number | null | undefined,
): TournamentPhaseInput[] {
  if (phases?.length) {
    return phases.map((phase, index) => ({
      ...phase,
      output_count:
        phase.output_count
        ?? (
          phase.qualifiers_per_group
            ? phase.group_count * phase.qualifiers_per_group
            : index === phases.length - 1 ? 1 : 2
        ),
    }))
  }
  if (format === 'round_robin_elimination') {
    return [
      {
        name: 'Fase a gironi',
        format: 'round_robin',
        group_count: groupCount ?? 1,
        output_count: (groupCount ?? 1) * (qualifiersPerGroup ?? 1),
        qualifiers_per_group: qualifiersPerGroup ?? 1,
      },
      {
        name: 'Fase finale',
        format: 'single_elimination',
        group_count: 1,
        output_count: 1,
        qualifiers_per_group: null,
      },
    ]
  }
  return [{
    name: format === 'round_robin' ? 'Girone unico' : 'Tabellone',
    format: format === 'round_robin' ? 'round_robin' : 'single_elimination',
    group_count: 1,
    output_count: 1,
    qualifiers_per_group: null,
  }]
}

export function validateTournamentPhases(
  phases: TournamentPhaseInput[],
  participantLimit: number | null | undefined,
): void {
  if (phases.length === 0) throw new Error('Il torneo deve contenere almeno una fase')
  let inputCount = participantLimit ?? null
  phases.forEach((phase, index) => {
    if (!phase.name.trim()) throw new Error(`Il nome della fase ${index + 1} è obbligatorio`)
    if (!['round_robin', 'single_elimination'].includes(phase.format)) {
      throw new Error(`Formato non valido per la fase ${index + 1}`)
    }
    if (!Number.isInteger(phase.group_count) || phase.group_count < 1) {
      throw new Error(`Il numero di gironi della fase ${index + 1} non è valido`)
    }
    if (!Number.isInteger(phase.output_count) || phase.output_count < 1) {
      throw new Error(`Il numero di giocatori in uscita dalla fase ${index + 1} non è valido`)
    }
    if (inputCount != null && phase.output_count > inputCount) {
      throw new Error(
        `La fase ${index + 1} non può produrre più di ${inputCount} giocatori`,
      )
    }
    if (index < phases.length - 1 && phase.output_count < 2) {
      throw new Error(`La fase ${index + 1} deve lasciare almeno due giocatori alla fase successiva`)
    }
    if (phase.format === 'round_robin' && inputCount != null && phase.group_count > inputCount) {
      throw new Error(`La fase ${index + 1} non può avere più gironi che giocatori`)
    }
    inputCount = phase.output_count
  })
}

export async function createTournamentPhases(
  tx: PhaseTransaction,
  tournamentId: string,
  phaseInputs: TournamentPhaseInput[],
): Promise<void> {
  for (const [index, input] of phaseInputs.entries()) {
    const phase = await tx.tournamentPhase.create({
      data: {
        tournamentId,
        position: index + 1,
        name: input.name.trim(),
        format: input.format,
        status: index === 0 ? 'active' : 'pending',
        groupCount: input.format === 'round_robin' ? input.group_count : 1,
        outputCount: input.output_count,
        qualifiersPerGroup:
          input.format === 'round_robin' ? input.qualifiers_per_group ?? null : null,
      },
    })
    if (input.format === 'round_robin') {
      await tx.tournamentGroup.createMany({
        data: Array.from({ length: input.group_count }, (_, groupIndex) => ({
          phaseId: phase.id,
          position: groupIndex + 1,
          name: input.group_count === 1
            ? 'Girone unico'
            : `Girone ${String.fromCharCode(65 + groupIndex)}`,
        })),
      })
    }
  }
}

export async function syncPlayerWithFirstPhase(
  tx: PhaseTransaction,
  tournamentId: string,
  playerId: string,
  seed: number,
): Promise<void> {
  const firstPhase = await tx.tournamentPhase.findFirst({
    where: { tournamentId },
    orderBy: { position: 'asc' },
    select: { id: true },
  })
  if (!firstPhase) return
  await tx.tournamentPhasePlayer.upsert({
    where: { phaseId_playerId: { phaseId: firstPhase.id, playerId } },
    create: { phaseId: firstPhase.id, playerId, seed },
    update: { seed },
  })
}

export async function removePlayerFromFirstPhase(
  tx: PhaseTransaction,
  tournamentId: string,
  playerId: string,
): Promise<void> {
  const firstPhase = await tx.tournamentPhase.findFirst({
    where: { tournamentId },
    orderBy: { position: 'asc' },
    select: { id: true },
  })
  if (!firstPhase) return
  await tx.tournamentPhasePlayer.deleteMany({
    where: { phaseId: firstPhase.id, playerId },
  })
}

async function assignPlayersToGroups(tx: PhaseTransaction, phaseId: string): Promise<void> {
  const phase = await tx.tournamentPhase.findUnique({
    where: { id: phaseId },
    include: {
      groups: { orderBy: { position: 'asc' } },
      players: {
        include: { player: { select: { ranking: true } } },
        orderBy: [{ seed: 'asc' }, { createdAt: 'asc' }],
      },
    },
  })
  if (!phase || phase.format !== 'round_robin' || phase.groups.length === 0) return

  const orderedPlayers = [...phase.players].sort(
    (left, right) =>
      (left.seed ?? Number.MAX_SAFE_INTEGER) - (right.seed ?? Number.MAX_SAFE_INTEGER)
      || left.player.ranking - right.player.ranking,
  )
  await Promise.all(orderedPlayers.map((entry, index) => {
    const pass = Math.floor(index / phase.groups.length)
    const offset = index % phase.groups.length
    const groupIndex = pass % 2 === 0 ? offset : phase.groups.length - 1 - offset
    return tx.tournamentPhasePlayer.update({
      where: { phaseId_playerId: { phaseId, playerId: entry.playerId } },
      data: { groupId: phase.groups[groupIndex]!.id },
    })
  }))
}

function standardSeedOrder(size: number): number[] {
  let order = [1, 2]
  while (order.length < size) {
    const nextSize = order.length * 2
    order = order.flatMap((seed) => [seed, nextSize + 1 - seed])
  }
  return order
}

function buildRankedBracketMatches(
  tournamentId: string,
  phaseId: string,
  rankedPlayers: Array<{ playerId: string; groupId: string | null }>,
): Match[] {
  if (rankedPlayers.length < 2) return []
  const bracketSize = 2 ** Math.ceil(Math.log2(Math.max(2, rankedPlayers.length)))
  const slots = standardSeedOrder(bracketSize).map(
    (seed) => rankedPlayers[seed - 1] ?? null,
  )

  // Keep the stronger seed fixed and exchange lower seeds when this avoids an
  // immediate rematch between players coming from the same group.
  for (let matchIndex = 0; matchIndex < slots.length / 2; matchIndex += 1) {
    const strong = slots[matchIndex * 2]
    const opponentIndex = matchIndex * 2 + 1
    const opponent = slots[opponentIndex]
    if (!strong?.groupId || strong.groupId !== opponent?.groupId) continue
    for (let candidateIndex = 1; candidateIndex < slots.length; candidateIndex += 2) {
      if (candidateIndex === opponentIndex) continue
      const candidate = slots[candidateIndex]
      const candidateStrong = slots[candidateIndex - 1]
      if (
        candidate &&
        candidate.groupId !== strong.groupId &&
        (!candidateStrong?.groupId || opponent.groupId !== candidateStrong.groupId)
      ) {
        slots[opponentIndex] = candidate
        slots[candidateIndex] = opponent
        break
      }
    }
  }

  const matches: Match[] = []
  for (let position = 0; position < bracketSize / 2; position += 1) {
    const player1 = slots[position * 2]?.playerId ?? null
    const player2 = slots[position * 2 + 1]?.playerId ?? null
    matches.push({
      id: randomUUID(),
      tournament_id: tournamentId,
      phase_id: phaseId,
      group_id: null,
      round_index: 0,
      position,
      player1_id: player1,
      player2_id: player2,
      result: null,
      winner_id: null,
      status: player1 && player2 ? 'ready' : 'waiting',
    })
  }
  const roundsCount = Math.log2(bracketSize)
  for (let roundIndex = 1; roundIndex < roundsCount; roundIndex += 1) {
    const matchesCount = 2 ** (roundsCount - roundIndex - 1)
    for (let position = 0; position < matchesCount; position += 1) {
      matches.push({
        id: randomUUID(),
        tournament_id: tournamentId,
        phase_id: phaseId,
        group_id: null,
        round_index: roundIndex,
        position,
        player1_id: null,
        player2_id: null,
        result: null,
        winner_id: null,
        status: 'waiting',
      })
    }
  }
  return matches
}

export async function generatePhaseMatches(
  tx: PhaseTransaction,
  tournamentId: string,
  phaseId: string,
): Promise<void> {
  const phase = await tx.tournamentPhase.findFirst({
    where: { id: phaseId, tournamentId },
    include: {
      groups: { orderBy: { position: 'asc' } },
      players: {
        include: { player: { select: { ranking: true } } },
        orderBy: [{ seed: 'asc' }, { createdAt: 'asc' }],
      },
    },
  })
  if (!phase) throw new Error('Fase non trovata')
  if (phase.status === 'completed') throw new Error('La fase è già conclusa')
  if (phase.players.length < 2) {
    throw new Error('Servono almeno due giocatori per generare gli incontri')
  }
  if (phase.outputCount > phase.players.length) {
    throw new Error(
      `La fase riceve ${phase.players.length} giocatori e non può produrne ${phase.outputCount}`,
    )
  }

  await tx.match.deleteMany({ where: { phaseId } })
  if (phase.format === 'round_robin') {
    await assignPlayersToGroups(tx, phaseId)
    const groupedPlayers = await tx.tournamentPhasePlayer.findMany({
      where: { phaseId },
      orderBy: [{ groupId: 'asc' }, { seed: 'asc' }],
    })
    for (const group of phase.groups) {
      const playerIds = groupedPlayers
        .filter((entry) => entry.groupId === group.id)
        .map((entry) => entry.playerId)
      const matches = buildRoundRobinMatches(tournamentId, playerIds, randomUUID)
      if (matches.length > 0) {
        await tx.match.createMany({
          data: matches.map((match) => ({
            id: match.id,
            tournamentId,
            phaseId,
            groupId: group.id,
            round: match.round_index + 1,
            position: match.position,
            player1Id: match.player1_id,
            player2Id: match.player2_id,
            result: null,
            winnerId: null,
            status: 'pending',
          })),
        })
      }
    }
    return
  }

  const rankedPlayers = phase.players.map((entry) => ({
    playerId: entry.playerId,
    groupId: entry.groupId,
  }))
  const matches = buildRankedBracketMatches(tournamentId, phaseId, rankedPlayers)
  if (matches.length > 0) {
    await tx.match.createMany({
      data: matches.map((match) => ({
        id: match.id,
        tournamentId,
        phaseId,
        groupId: null,
        round: match.round_index + 1,
        position: match.position,
        player1Id: match.player1_id,
        player2Id: match.player2_id,
        result: null,
        winnerId: null,
        status: match.status === 'completed' ? 'completed' : 'pending',
      })),
    })
    await autoAdvanceByeMatches(tx, tournamentId, phaseId)
  }
}

function resultMetrics(result: string | null): Array<[number, number]> {
  if (!result) return []
  return Array.from(result.matchAll(/(\d+)\s*[-–]\s*(\d+)/g), (match) => [
    Number(match[1]),
    Number(match[2]),
  ])
}

function buildStandings(
  players: Array<{ playerId: string; groupId: string | null; player: { ranking: number } }>,
  matches: Array<{
    groupId: string | null
    player1Id: string | null
    player2Id: string | null
    winnerId: string | null
    result: string | null
    status: string
  }>,
): StandingRow[] {
  const rows = new Map<string, StandingRow>()
  players.forEach((entry) => {
    if (!entry.groupId) return
    rows.set(entry.playerId, {
      playerId: entry.playerId,
      groupId: entry.groupId,
      ranking: entry.player.ranking,
      played: 0,
      wins: 0,
      losses: 0,
      setDifference: 0,
      gameDifference: 0,
    })
  })

  const completed = matches.filter(
    (match) =>
      match.status === 'completed' &&
      match.player1Id &&
      match.player2Id &&
      match.winnerId,
  )
  completed.forEach((match) => {
    const first = rows.get(match.player1Id!)
    const second = rows.get(match.player2Id!)
    if (!first || !second) return
    first.played += 1
    second.played += 1
    if (match.winnerId === match.player1Id) {
      first.wins += 1
      second.losses += 1
    } else {
      second.wins += 1
      first.losses += 1
    }
    resultMetrics(match.result).forEach(([firstGames, secondGames]) => {
      first.gameDifference += firstGames - secondGames
      second.gameDifference += secondGames - firstGames
      if (firstGames > secondGames) {
        first.setDifference += 1
        second.setDifference -= 1
      } else if (secondGames > firstGames) {
        second.setDifference += 1
        first.setDifference -= 1
      }
    })
  })

  return [...rows.values()].sort((left, right) => {
    const performance =
      right.wins - left.wins
      || right.setDifference - left.setDifference
      || right.gameDifference - left.gameDifference
    if (performance !== 0) return performance
    const headToHead = completed.find(
      (match) =>
        (match.player1Id === left.playerId && match.player2Id === right.playerId)
        || (match.player1Id === right.playerId && match.player2Id === left.playerId),
    )
    if (headToHead?.winnerId === left.playerId) return -1
    if (headToHead?.winnerId === right.playerId) return 1
    return left.ranking - right.ranking
  })
}

function selectRoundRobinQualifiers(
  standings: StandingRow[],
  groupIds: string[],
  outputCount: number,
): Array<{ playerId: string; sourceRank: number }> {
  const guaranteedPerGroup = Math.floor(outputCount / Math.max(1, groupIds.length))
  const selectedIds = new Set<string>()

  groupIds.forEach((groupId) => {
    standings
      .filter((row) => row.groupId === groupId)
      .slice(0, guaranteedPerGroup)
      .forEach((row) => selectedIds.add(row.playerId))
  })

  standings
    .filter((row) => !selectedIds.has(row.playerId))
    .slice(0, outputCount - selectedIds.size)
    .forEach((row) => selectedIds.add(row.playerId))

  return standings
    .filter((row) => selectedIds.has(row.playerId))
    .slice(0, outputCount)
    .map((row, index) => ({ playerId: row.playerId, sourceRank: index + 1 }))
}

function selectEliminationQualifiers(
  players: Array<{
    playerId: string
    seed: number | null
    player: { ranking: number }
  }>,
  matches: Array<{
    round: number
    player1Id: string | null
    player2Id: string | null
    winnerId: string | null
  }>,
  outputCount: number,
): Array<{ playerId: string; sourceRank: number }> {
  const finalRound = Math.max(...matches.map((match) => match.round))
  const finalWinnerId = matches.find((match) => match.round === finalRound)?.winnerId

  return players
    .map((entry) => {
      const lostRound = Math.max(
        0,
        ...matches
          .filter(
            (match) =>
              (match.player1Id === entry.playerId || match.player2Id === entry.playerId)
              && match.winnerId !== entry.playerId,
          )
          .map((match) => match.round),
      )
      return {
        ...entry,
        finishRank: entry.playerId === finalWinnerId ? finalRound + 1 : lostRound,
      }
    })
    .sort(
      (left, right) =>
        right.finishRank - left.finishRank
        || (left.seed ?? Number.MAX_SAFE_INTEGER) - (right.seed ?? Number.MAX_SAFE_INTEGER)
        || left.player.ranking - right.player.ranking,
    )
    .slice(0, outputCount)
    .map((entry, index) => ({ playerId: entry.playerId, sourceRank: index + 1 }))
}

export async function completeTournamentPhase(
  tx: PhaseTransaction,
  tournamentId: string,
  phaseId: string,
): Promise<void> {
  const phase = await tx.tournamentPhase.findFirst({
    where: { id: phaseId, tournamentId },
    include: {
      groups: { orderBy: { position: 'asc' } },
      players: { include: { player: { select: { ranking: true } } } },
      matches: true,
    },
  })
  if (!phase) throw new Error('Fase non trovata')
  if (phase.status !== 'active') throw new Error('La fase non è attiva')
  if (phase.matches.length === 0) throw new Error('Genera gli incontri prima di concludere la fase')
  if (phase.matches.some((match) => match.status !== 'completed')) {
    throw new Error('Completa tutti gli incontri prima di concludere la fase')
  }

  const nextPhase = await tx.tournamentPhase.findFirst({
    where: { tournamentId, position: phase.position + 1 },
  })
  if (!nextPhase) {
    await tx.tournamentPhase.update({ where: { id: phaseId }, data: { status: 'completed' } })
    return
  }
  if (phase.outputCount > phase.players.length) {
    throw new Error('La fase non può qualificare più giocatori di quelli in ingresso')
  }

  const qualified =
    phase.format === 'round_robin'
      ? selectRoundRobinQualifiers(
          buildStandings(phase.players, phase.matches),
          phase.groups.map((group) => group.id),
          phase.outputCount,
        )
      : selectEliminationQualifiers(phase.players, phase.matches, phase.outputCount)

  if (qualified.length < 2) throw new Error('La fase deve qualificare almeno due giocatori')
  await tx.tournamentPhasePlayer.updateMany({
    where: { phaseId },
    data: { qualified: false },
  })
  await Promise.all(qualified.map((entry) =>
    tx.tournamentPhasePlayer.update({
      where: { phaseId_playerId: { phaseId, playerId: entry.playerId } },
      data: { qualified: true, sourceRank: entry.sourceRank },
    }),
  ))
  await tx.tournamentPhasePlayer.deleteMany({ where: { phaseId: nextPhase.id } })
  await tx.tournamentPhasePlayer.createMany({
    data: qualified.map((entry, index) => ({
      phaseId: nextPhase.id,
      playerId: entry.playerId,
      groupId: null,
      seed: index + 1,
      sourceRank: entry.sourceRank,
    })),
  })
  await tx.tournamentPhase.update({ where: { id: phaseId }, data: { status: 'completed' } })
  await tx.tournamentPhase.update({ where: { id: nextPhase.id }, data: { status: 'active' } })
  await generatePhaseMatches(tx, tournamentId, nextPhase.id)
}
