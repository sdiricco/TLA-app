import PDFDocument from 'pdfkit'
import type { Match, MatchRound, TournamentMatchesResponse } from '../../../src/types'
import { getSeededPlayersCount } from '../../../src/utils/matches'

type DrawPlayer = {
  id: string
  name: string
  ranking: number
  club: string | null
}

export type DrawPdfData = {
  tournament: TournamentMatchesResponse['tournament'] & {
    location?: string | null
    start_date?: string | null
    end_date?: string | null
  }
  draw: TournamentMatchesResponse['draw']
  rounds: MatchRound[]
  matches: Match[]
  players: DrawPlayer[]
  generated_at?: Date
}

const COLORS = {
  ink: '#334155',
  muted: '#64748b',
  primary: '#10b981',
  primaryStrong: '#047857',
  line: '#6ee7b7',
  stripe: '#f1f5f9',
  winner: '#047857',
}

function formatDate(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

function safeFilenamePart(value: string): string {
  return value.normalize('NFKD').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()
}

export function getDrawPdfFilename(tournamentName: string): string {
  return `${safeFilenamePart(tournamentName) || 'torneo'}-tabellone.pdf`
}

function truncate(doc: PDFKit.PDFDocument, value: string, width: number): string {
  if (doc.widthOfString(value) <= width) return value
  let shortened = value
  while (shortened.length > 1 && doc.widthOfString(`${shortened}...`) > width) shortened = shortened.slice(0, -1)
  return `${shortened}...`
}

function drawHeader(doc: PDFKit.PDFDocument, data: DrawPdfData, pageNumber: number, pageCount: number): void {
  const { tournament, draw } = data
  doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(17).text(tournament.name.toUpperCase(), 30, 20)
  doc.fillColor(COLORS.primaryStrong).font('Helvetica-Bold').fontSize(12).text('TABELLONE SINGOLARE', 30, 41)

  const details = [tournament.location, formatDate(tournament.start_date), `${draw.participants_count} partecipanti`]
    .filter(Boolean)
    .join('  |  ')
  doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8).text(details, 30, 58)
  doc.fillColor(COLORS.muted).fontSize(8).text(`Pagina ${pageNumber} / ${pageCount}`, 730, 24, {
    width: 80,
    align: 'right',
  })
}

function drawFooter(doc: PDFKit.PDFDocument, generatedAt: Date): void {
  const updated = new Intl.DateTimeFormat('it-IT', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(generatedAt)
  doc.fillColor(COLORS.muted).font('Helvetica').fontSize(7).text(`Aggiornato: ${updated}`, 30, 574)
  doc.text('TLA', 780, 574, { width: 30, align: 'right' })
}

function getSlotLabel(match: Match, slot: 'player1_id' | 'player2_id', players: Map<string, DrawPlayer>): string {
  const playerId = match[slot]
  if (playerId) return players.get(playerId)?.name ?? 'Giocatore sconosciuto'
  return match.status === 'completed' && match.result === 'BYE' ? 'BYE' : ''
}

function createSeedMap(players: DrawPlayer[]): Map<string, number> {
  const count = getSeededPlayersCount(players.length)
  return new Map(
    [...players]
      .sort((left, right) => left.ranking - right.ranking)
      .slice(0, count)
      .map((player, index) => [player.id, index + 1]),
  )
}

function drawPlayerLine(
  doc: PDFKit.PDFDocument,
  match: Match,
  slot: 'player1_id' | 'player2_id',
  x: number,
  y: number,
  width: number,
  players: Map<string, DrawPlayer>,
  seeds: Map<string, number>,
): void {
  const playerId = match[slot]
  const seed = playerId ? seeds.get(playerId) : undefined
  const isWinner = Boolean(playerId && match.winner_id === playerId)
  const label = getSlotLabel(match, slot, players)
  const seedLabel = seed ? `[${seed}]` : ''
  const availableWidth = width - (seedLabel ? 25 : 4)

  if (!label) return
  doc.fillColor(isWinner ? COLORS.winner : COLORS.ink)
    .font(isWinner ? 'Helvetica-Bold' : 'Helvetica')
    .fontSize(7.3)
    .text(truncate(doc, label, availableWidth), x, y, { width: availableWidth, lineBreak: false })
  if (seedLabel) {
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(6.8).text(seedLabel, x + width - 24, y, {
      width: 22,
      align: 'right',
      lineBreak: false,
    })
  }
}

function renderPage(
  doc: PDFKit.PDFDocument,
  data: DrawPdfData,
  pageIndex: number,
  pageCount: number,
  firstMatchStart: number,
  firstMatchEnd: number,
): void {
  drawHeader(doc, data, pageIndex + 1, pageCount)
  const players = new Map(data.players.map((player) => [player.id, player]))
  const seeds = createSeedMap(data.players)
  const contentTop = 88
  const contentBottom = 560
  const visibleFirstMatches = Math.max(1, firstMatchEnd - firstMatchStart)
  const baseStep = (contentBottom - contentTop) / visibleFirstMatches
  const left = 30
  const right = 812
  const gap = 11
  const columnWidth = (right - left - gap * Math.max(0, data.rounds.length - 1)) / Math.max(1, data.rounds.length)

  const visibleMatchesByRound = new Map<number, Match[]>()
  for (const round of data.rounds) {
    const divisor = 2 ** round.index
    if (pageIndex > 0 && divisor > visibleFirstMatches) {
      visibleMatchesByRound.set(round.index, [])
      continue
    }
    const start = Math.floor(firstMatchStart / divisor)
    const end = Math.ceil(firstMatchEnd / divisor)
    visibleMatchesByRound.set(
      round.index,
      data.matches.filter((match) => match.round_index === round.index && match.position >= start && match.position < end),
    )
  }

  for (const round of data.rounds) {
    if ((visibleMatchesByRound.get(round.index) ?? []).length === 0) continue
    const x = left + round.index * (columnWidth + gap)
    doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(8.5).text(round.name, x, 73, {
      width: columnWidth,
      align: 'center',
    })
  }

  const centerY = (roundIndex: number, position: number): number => {
    const span = 2 ** roundIndex
    return contentTop + ((position * span + span / 2 - firstMatchStart) * baseStep)
  }

  for (const round of data.rounds) {
    const roundMatches = visibleMatchesByRound.get(round.index) ?? []
    const x = left + round.index * (columnWidth + gap)
    for (const match of roundMatches) {
      const y = centerY(round.index, match.position)
      if (y < contentTop - 2 || y > contentBottom + 2) continue
      const lineGap = Math.min(8, Math.max(5, baseStep * 0.22))
      const boxTop = y - lineGap - 2
      const boxHeight = lineGap * 2 + 10

      if ((match.position + round.index) % 2 === 0) {
        doc.rect(x - 3, boxTop, columnWidth + 6, boxHeight).fill(COLORS.stripe)
      }
      drawPlayerLine(doc, match, 'player1_id', x, y - lineGap, columnWidth, players, seeds)
      drawPlayerLine(doc, match, 'player2_id', x, y + 1, columnWidth, players, seeds)
      if (match.result) {
        doc.fillColor(COLORS.muted).font('Helvetica').fontSize(6.2).text(match.result, x, y + lineGap + 2, {
          width: columnWidth,
          align: 'right',
          lineBreak: false,
        })
      }

      if (
        round.index < data.rounds.length - 1 &&
        (visibleMatchesByRound.get(round.index + 1) ?? []).length > 0
      ) {
        const nextX = x + columnWidth + gap
        const joinX = nextX - gap / 2
        const nextPosition = Math.floor(match.position / 2)
        const nextY = centerY(round.index + 1, nextPosition)
        doc.strokeColor(COLORS.line).lineWidth(0.65)
          .moveTo(x + columnWidth, y)
          .lineTo(joinX, y)
          .lineTo(joinX, nextY)
          .lineTo(nextX, nextY)
          .stroke()
      }
    }
  }

  const finalMatch = data.matches.find((match) => match.round_index === data.rounds.length - 1)
  if (pageIndex === 0 && finalMatch?.winner_id) {
    const champion = players.get(finalMatch.winner_id)?.name
    if (champion) {
      doc.fillColor(COLORS.primaryStrong).font('Helvetica-Bold').fontSize(9).text(`Campione: ${champion}`, 650, 548, {
        width: 160,
        align: 'right',
      })
    }
  }
  drawFooter(doc, data.generated_at ?? new Date())
}

export function generateDrawPdf(data: DrawPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0, compress: true })
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const firstRoundMatches = data.matches.filter((match) => match.round_index === 0).length
    const pageCount = Math.max(1, Math.ceil(firstRoundMatches / 32))
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      if (pageIndex > 0) doc.addPage({ size: 'A4', layout: 'landscape', margin: 0 })
      const start = pageIndex * 32
      renderPage(doc, data, pageIndex, pageCount, start, Math.min(firstRoundMatches, start + 32))
    }
    doc.end()
  })
}
