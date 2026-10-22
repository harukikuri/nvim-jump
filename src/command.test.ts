import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

const start = { cwd: '/w', surface: 'terminal', isInteractive: true } as const

const nv = (args: string) =>
  ({ command: 'nv', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } }) as const

function engine(on: On, runs: string[][]) {
  on('command.register', () => ({ value: { command: 'nv' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: '/w' }))
  on('tool.call', () => ({ result: {} }))
  on('fs.read', () => ({ value: 'one\ntwo\nNEW\n' }))
  on('process.run', (_, e) => {
    runs.push([...e.argv])
    return { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
}

test('/nv opens the newest touch at its line through $NVIM', async ($, on) => {
  const runs: string[][] = []
  engine(on, runs)
  mock.env(on, { NVIM: '/run/nvim.1' })
  await $.session.start(start)

  await $.tool.call({ tool: 'Edit', file_path: '/w/x.ts', old_string: 'old', new_string: 'NEW' })
  await $.tool.call({ tool: 'Read', file_path: 'src/a.ts', offset: 12 })

  expect((await $.command.run(nv(''))).text).toBe('Opened /w/src/a.ts:12 in Neovim.')
  expect((await $.command.run(nv('2'))).text).toBe('Opened /w/x.ts:3 in Neovim.')
  expect((await $.command.run(nv('3'))).text).toBe('Nothing touched 3 back yet.')
  expect(runs[1]?.slice(0, 3)).toEqual(['nvim', '--server', '/run/nvim.1'])
})

test('/nv falls back to the socket option', { options: { socket: '/tmp/s' } }, async ($, on) => {
  const runs: string[][] = []
  engine(on, runs)
  mock.env(on, {})
  await $.session.start(start)
  await $.tool.call({ tool: 'Write', file_path: '/w/y.ts', content: 'z' })

  expect((await $.command.run(nv(''))).text).toBe('Opened /w/y.ts:1 in Neovim.')
  expect(runs[0]?.[2]).toBe('/tmp/s')
})

test('/nv with no Neovim says how to set one up and runs nothing', async ($, on) => {
  const runs: string[][] = []
  engine(on, runs)
  mock.env(on, {})
  await $.session.start(start)
  await $.tool.call({ tool: 'Read', file_path: '/w/y.ts' })

  expect((await $.command.run(nv(''))).text).toContain('No Neovim found')
  expect(runs.length).toBe(0)
})
