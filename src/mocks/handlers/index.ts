import { authHandlers } from './auth'
import { matchHandlers } from './matches'
import { playerHandlers } from './players'
import { tournamentHandlers } from './tournaments'

export const handlers = [...authHandlers, ...playerHandlers, ...tournamentHandlers, ...matchHandlers]
