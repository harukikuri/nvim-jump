// F1: what Claude touched this session, newest first.
import { atom, read, update } from 'claude-code'
import type { EngineInterface } from 'claude-code'

import type { Touch } from '../types'

const MAX = 50

const history = atom({ plugin: 'nvim-jump', key: 'history' } as const, [] as Touch[])

export function record($: EngineInterface, touch: Touch) {
  return update($, history, list => [touch, ...list].slice(0, MAX))
}

// The n-th most recent touch, 1 the newest.
export async function nthBack($: EngineInterface, n: number) {
  return (await read($, history))[n - 1]
}
