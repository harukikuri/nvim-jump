import { expect, test } from 'claude-code/testing'

import { absolute, lineOf } from './line'
import { findServer, openArgv } from './nvim'

test('lineOf finds the first line of new_string, else 1', () => {
  expect(lineOf('a\nb\nc\nb\n', 'b')).toBe(2)
  expect(lineOf('a\nb\nc\n', 'c\n')).toBe(3)
  expect(lineOf('a\nb\n', 'zzz')).toBe(1)
  expect(lineOf('a\nb\n', '')).toBe(1)
})

test('absolute resolves against cwd', () => {
  expect(absolute('/x/y.ts', '/w')).toBe('/x/y.ts')
  expect(absolute('src/y.ts', '/w/')).toBe('/w/src/y.ts')
  expect(absolute('./y.ts', '/w')).toBe('/w/y.ts')
})

test('findServer prefers $NVIM, then the socket option', () => {
  expect(findServer('/run/nvim.1', '/tmp/s')).toBe('/run/nvim.1')
  expect(findServer(undefined, '/tmp/s')).toBe('/tmp/s')
  expect(findServer('', '')).toBe(undefined)
})

test('openArgv runs nvim without a shell and quotes the path for Vim', () => {
  const argv = openArgv('/tmp/s', "/w/it's.ts", 7)
  expect(argv.slice(0, 4)).toEqual(['nvim', '--server', '/tmp/s', '--remote-expr'])
  expect(argv[4]).toContain("['/w/it''s.ts', 7]")
})
