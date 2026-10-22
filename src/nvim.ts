// F3, F4: which Neovim to talk to, and what to send it.

export const findServer = (nvimEnv: string | undefined, socket: string | undefined) =>
  nvimEnv || socket || undefined

// Runs inside Neovim with _A = { path, line }. luaeval takes an expression,
// hence the function called in place. Single quotes are not allowed here: the
// chunk sits inside a Vim single-quoted string.
const LUA = `(function()
local path, line = _A[1], _A[2]
local function normal(w)
  return vim.api.nvim_win_get_config(w).relative == ""
    and vim.bo[vim.api.nvim_win_get_buf(w)].buftype == ""
end
local full = vim.fn.fnamemodify(path, ":p")
local target
for _, w in ipairs(vim.api.nvim_tabpage_list_wins(0)) do
  if vim.api.nvim_buf_get_name(vim.api.nvim_win_get_buf(w)) == full then target = w break end
end
if not target then
  local cur = vim.api.nvim_get_current_win()
  local prev = vim.fn.win_getid(vim.fn.winnr("#"))
  if normal(cur) then target = cur
  elseif prev ~= 0 and normal(prev) then target = prev
  else
    for _, w in ipairs(vim.api.nvim_tabpage_list_wins(0)) do
      if normal(w) then target = w break end
    end
  end
end
vim.cmd("stopinsert")
if target then vim.api.nvim_set_current_win(target) else vim.cmd("vsplit") end
if vim.api.nvim_buf_get_name(0) ~= full then
  vim.cmd.edit(vim.fn.fnameescape(path))
end
local last = vim.api.nvim_buf_line_count(0)
vim.api.nvim_win_set_cursor(0, { math.max(1, math.min(line, last)), 0 })
vim.cmd("normal! zz")
return ""
end)()`

const vimString = (s: string) => `'${s.replaceAll("'", "''")}'`

// argv for $.process.run: no shell, the path quoted for Vim itself.
export const openArgv = (server: string, path: string, line: number): string[] => [
  'nvim',
  '--server',
  server,
  '--remote-expr',
  `luaeval(${vimString(LUA)}, [${vimString(path)}, ${Math.floor(line)}])`,
]
