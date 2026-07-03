import type { Prisma } from '@prisma/client'

type MatchProgressionRecord = {
  id: string
  tournamentId: string
  round: number
  position: number
  player1Id: string | null
  player2Id: string | null
  winnerId: string | null
  result: string | null
  status: string
}

function getImplicitWinnerId(match: MatchProgressionRecord): string | null {
  if (match.winnerId) return match.winnerId
  if (match.player1Id && !match.player2Id) return match.player1Id
  if (match.player2Id && !match.player1Id) return match.player2Id
  return null
}

async function advanceWinner(
  tx: Prisma.TransactionClient,
  match: MatchProgressionRecord,
  winnerId: string,
): Promise<void> {
  const nextRound = match.round + 1
  const nextPosition = Math.floor(match.position / 2)
  const nextSlot = match.position % 2 === 0 ? 'player1Id' : 'player2Id'

  const nextMatch = await tx.match.findFirst({
    where: {
      tournamentId: match.tournamentId,
      round: nextRound,
      position: nextPosition,
    },
  })

  if (!nextMatch) return

  await tx.match.update({
    where: { id: nextMatch.id },
    data: {
      [nextSlot]: winnerId,
    },
  })
}

export async function propagateMatchWinner(
  tx: Prisma.TransactionClient,
  matchId: string,
  winnerId: string,
): Promise<void> {
  const currentMatch = await tx.match.findUnique({
    where: { id: matchId },
  })

  if (!currentMatch) return
  await advanceWinner(tx, currentMatch, winnerId)
}

export async function autoAdvanceByeMatches(tx: Prisma.TransactionClient, tournamentId: string): Promise<void> {
  const matches = await tx.match.findMany({
    where: { tournamentId, round: 1 },
    orderBy: [{ round: 'asc' }, { position: 'asc' }],
  })

  for (const match of matches) {
    const implicitWinnerId = getImplicitWinnerId(match)
    if (!implicitWinnerId || match.winnerId) continue

    await tx.match.update({
      where: { id: match.id },
      data: {
        winnerId: implicitWinnerId,
        result: 'BYE',
        status: 'completed',
      },
    })

    await advanceWinner(tx, match, implicitWinnerId)
  }
}

export async function reconcileMatchProgression(
  tx: Prisma.TransactionClient,
  tournamentId: string,
): Promise<void> {
  const matches = await tx.match.findMany({
    where: { tournamentId },
    orderBy: [{ round: 'asc' }, { position: 'asc' }],
  })
  const byRoundAndPosition = new Map(matches.map((match) => [`${match.round}:${match.position}`, match]))

  for (const match of matches) {
    if (match.round === 1) continue

    const previousRound = match.round - 1
    const left = byRoundAndPosition.get(`${previousRound}:${match.position * 2}`)
    const right = byRoundAndPosition.get(`${previousRound}:${match.position * 2 + 1}`)
    const player1Id = left?.status === 'completed' ? left.winnerId : null
    const player2Id = right?.status === 'completed' ? right.winnerId : null
    const validPlayers = player1Id && player2Id
    const completionIsValid = Boolean(
      match.status === 'completed' &&
      match.result !== 'BYE' &&
      validPlayers &&
      match.winnerId &&
      (match.winnerId === player1Id || match.winnerId === player2Id),
    )

    const winnerId = completionIsValid ? match.winnerId : null
    const result = completionIsValid ? match.result : null
    const status = completionIsValid ? 'completed' : 'pending'

    if (
      match.player1Id !== player1Id ||
      match.player2Id !== player2Id ||
      match.winnerId !== winnerId ||
      match.result !== result ||
      match.status !== status
    ) {
      const updated = await tx.match.update({
        where: { id: match.id },
        data: { player1Id, player2Id, winnerId, result, status },
      })
      byRoundAndPosition.set(`${updated.round}:${updated.position}`, updated)
    }
  }
}
