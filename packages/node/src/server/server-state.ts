import type { ServerOptions } from './ServerOptions'
import type { BreakPoint, ProxyState, UUID } from 'lopr-shared'
import { useCache } from './cache'
import type { ProxyRequest } from './ProxyRequest'

/**
 * State related to breakpoints
 */
interface InternalBreakPointState {
  breakpoints: BreakPoint[]
  pausedRequests: Map<UUID, ProxyRequest>
  pausedResponses: Map<UUID, () => unknown>
}

/**
 * The Internal state for the server, overlaps with the shared ProxyState which is synced with the client
 */
export interface InternalProxyState extends ProxyState, InternalBreakPointState {
  config: ServerOptions
}

/**
 * Prepare initial internal server state
 */
export const createInternalProxyState = (options: ServerOptions): InternalProxyState => ({
  config: options,
  recording: true,
  cache: useCache(),

  // break points
  breakpoints: [],
  pausedRequests: new Map(),
  pausedResponses: new Map(),
})

// keys only available in the internal proxy state
// they shouldn't be sent to the client
const exclude = {
  options: undefined,
  cache: undefined,
  pausedRequests: undefined,
  pausedResponses: undefined,
}

export const toProxyState = (state: InternalProxyState) => ({ ...state, ...exclude })
