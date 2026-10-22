import type { EngineInterface, Register } from 'claude-code'

import type { Touch } from '../types'
import { nthBack, record } from '../src/history'
import { absolute, lineOf } from '../src/line'
import { findServer, openArgv } from '../src/nvim'

const SETUP =
  'No Neovim found. Run Claude Code inside :terminal, or start `nvim --listen <path>` and set that path in /config.'

async function lineFor($: EngineInterface, touch: Touch) {
  if (touch.tool !== 'Edit' || touch.newString === undefined) return touch.line ?? 1
  try {
    return lineOf(await $.fs.read(touch.path), touch.newString)
  } catch {
    return 1
  }
}

export const register: Register = (on, options) => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'nv',
      description: 'Open the file Claude last touched in Neovim (/nv 2: the one before)',
    })

    return next(e)
  })

  on('tool.call', { tool: ['Edit', 'Write', 'Read'] }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny !== undefined || ran.isError) return ran

    const touch: Touch = { path: e.file_path, tool: e.tool, at: Date.now() }
    if (e.tool === 'Edit') touch.newString = e.new_string
    if (e.tool === 'Read' && e.offset) touch.line = e.offset
    void record($, touch)

    return ran
  })


  on('command.run', { command: 'nv' }, async ($, e) => {
    const n = e.args.trim() === '' ? 1 : Number(e.args.trim())
    if (!Number.isInteger(n) || n < 1) return { text: 'Usage: /nv [n]' }

    const touch = await nthBack($, n)
    if (!touch) return { text: `Nothing touched ${n > 1 ? `${n} back ` : ''}yet.` }

    const server = findServer(
      await $.env.get('NVIM'),
      typeof options.socket === 'string' ? options.socket : undefined,
    )
    if (!server) {
      $.ui.toast(`nvim-jump: ${SETUP}`)
      return { text: SETUP }
    }

    const path = absolute(touch.path, await $.session.cwd())
    const line = await lineFor($, { ...touch, path })
    const run = await $.process.run(openArgv(server, path, line), { timeoutMs: 5000 })
    if (run.exitCode !== 0) {
      return { text: `Neovim at ${server} refused: ${(run.stderr || run.stdout).trim()}` }
    }

    return { text: `Opened ${path}:${line} in Neovim.` }
  })
}
