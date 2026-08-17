import { authHandlers } from './auth'
import { matchHandlers } from './matches'
import { playerHandlers } from './players'
import { tournamentHandlers } from './tournaments'
import { organizerHandlers } from './organizers'

export const handlers = [...authHandlers, ...playerHandlers, ...organizerHandlers, ...tournamentHandlers, ...matchHandlers]
