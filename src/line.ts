// F2: where in the file to open.

export const absolute = (path: string, cwd: string): string =>
  path.startsWith('/') ? path : `${cwd.replace(/\/$/, '')}/${path.replace(/^\.\//, '')}`

// 1-based line where `needle` first appears in `text`; 1 when it does not.
export const lineOf = (text: string, needle: string): number => {
  const at = needle === '' ? -1 : text.indexOf(needle)
  if (at < 0) return 1
  let line = 1
  for (let i = 0; i < at; i++) if (text.charCodeAt(i) === 10) line++
  return line
}

