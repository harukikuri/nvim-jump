export type Touch = {
  path: string
  tool: 'Edit' | 'Write' | 'Read'
  // Read: offset. Edit: computed at jump time from newString.
  line?: number
  newString?: string
  at: number
}

declare module 'claude-code' {
  interface PluginState {
    'nvim-jump': { history: Touch[] }
  }
}
