import type { EngineInterface, Register } from 'claude-code'

import type { Touch } from '../types'
import { nthBack, record } from '../src/history'
import { absolute, lineOf } from '../src/line'
import { findServer, openArgv } from '../src/nvim'

const TOOLS = ['Edit', 'Write', 'Read'] as const

const SETUP =
  'No Neovim found. Run Claude Code inside :terminal, or start `nvim --listen <path>` and set that path in /config.'

// A tool call's input as a Touch, from tool.call or from a transcript row.
function touchOf(tool: string, input: unknown): Touch | undefined {
  const i = (input ?? {}) as { file_path?: unknown; new_string?: unknown; offset?: unknown }
  if (!TOOLS.includes(tool as Touch['tool']) || typeof i.file_path !== 'string') return undefined

  const touch: Touch = { path: i.file_path, tool: tool as Touch['tool'], at: Date.now() }
  if (tool === 'Edit' && typeof i.new_string === 'string') touch.newString = i.new_string
  if (tool === 'Read' && typeof i.offset === 'number' && i.offset > 0) touch.line = i.offset
  return touch
}

async function lineFor($: EngineInterface, touch: Touch) {
  if (touch.tool !== 'Edit' || touch.newString === undefined) return touch.line ?? 1
  try {
    return lineOf(await $.fs.read(touch.path), touch.newString)
  } catch {
    return 1
  }
}

// Opens the touch in Neovim; resolves the line to show the person.
async function open($: EngineInterface, touch: Touch, socket: string | undefined) {
  const server = findServer(await $.env.get('NVIM'), socket)
  if (!server) {
    $.ui.toast(`nvim-jump: ${SETUP}`)
    return SETUP
  }

  const path = absolute(touch.path, await $.session.cwd())
  const line = await lineFor($, { ...touch, path })
  const run = await $.process.run(openArgv(server, path, line), { timeoutMs: 5000 })
  if (run.exitCode !== 0) {
    const why = (run.stderr || run.stdout).trim()
    return why.includes('E247')
      ? `No Neovim is listening at ${server}. Start one with \`nvim --listen ${server}\`.`
      : `Neovim at ${server} refused: ${why}`
  }

  return `Opened ${path}:${line} in Neovim.`
}

export const register: Register = (on, options) => {
  const socket = typeof options.socket === 'string' ? options.socket : undefined

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

    const touch = touchOf(e.tool, e)
    if (touch) void record($, touch)

    return ran
  })

  on('command.run', { command: 'nv' }, async ($, e) => {
    const n = e.args.trim() === '' ? 1 : Number(e.args.trim())
    if (!Number.isInteger(n) || n < 1) return { text: 'Usage: /nv [n]' }

    const touch = await nthBack($, n)
    if (!touch) return { text: `Nothing touched ${n > 1 ? `${n} back ` : ''}yet.` }

    return { text: await open($, touch, socket) }
  })

  // An "nvim" button after each finished Read / Edit / Write row.
  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    const row = await next(e)
    const touch = touchOf(e.props.tool, e.props.input)
    if (!touch || e.props.isRunning || e.props.isErrored) return row

    const { Box, Button } = $.ui.resolve(e)

    return (
      <Box flexDirection="row" gap={1}>
        {row}
        <Button
          key="nvim"
          label="nvim"
          plain
          dimColor
          onPress={() => void open($, touch, socket).then(text => $.ui.toast(text))}
        />
      </Box>
    )
  })
}
