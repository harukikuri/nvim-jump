# nvim-jump

A Claude Code mod: `/nv` opens the file Claude last touched (Edit, Write, Read) in your running Neovim, at the line it touched.

- `/nv` — the most recent file
- `/nv 2` — the one before, and so on (up to 50 per session)

## Which line

| Tool  | Line |
| ----- | ---- |
| Edit  | where `new_string` first appears in the file now, else 1 |
| Write | 1 |
| Read  | `offset`, else 1 |

## Which Neovim

1. `$NVIM` — set automatically when Claude Code runs inside Neovim's `:terminal`. No setup.
2. The `socket` option — start Neovim with `nvim --listen /tmp/nvim.sock` and set that path in `/config`.

The file opens in the previous normal window (never over the terminal), or in an existing window already showing it, or in a new vertical split. The cursor line is centered.

## Permissions

Reads files (`$.fs.read`) and runs `nvim` only (no shell). No network.

## License

MIT
