export type BundleMessageIn = {
  type: 'bundle'
  id: number
  files: Record<string, string>
}

export type BundleMessageOut =
  | { type: 'ready' }
  | { type: 'result'; id: number; code: string }
  | { type: 'error'; id: number; message: string }
