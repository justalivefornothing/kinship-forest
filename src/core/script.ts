/**
 * Tiny operation script: statements separated by `;` or newlines.
 *
 *   u 1 2      union(1, 2)
 *   f 5        find(5)
 *   c 1 5      connected(1, 5)
 *
 * Verbs may be spelled out (`union`, `find`, `connected`). `#` starts a comment.
 */
export type ScriptOp =
  | { kind: 'union'; a: number; b: number }
  | { kind: 'find'; a: number }
  | { kind: 'connected'; a: number; b: number }

export interface ParsedScript {
  ops: ScriptOp[]
  errors: string[]
}

const VERBS: Record<string, ScriptOp['kind']> = {
  u: 'union',
  union: 'union',
  f: 'find',
  find: 'find',
  c: 'connected',
  connected: 'connected',
}

export function parseScript(source: string, n: number): ParsedScript {
  const ops: ScriptOp[] = []
  const errors: string[] = []
  const statements = source
    .split(/[;\n]/)
    .map((s) => s.replace(/#.*$/, '').trim())
    .filter(Boolean)

  const node = (tok: string | undefined, stmt: string): number | null => {
    if (tok === undefined || !/^\d+$/.test(tok)) {
      errors.push(`"${stmt}": expected a node number`)
      return null
    }
    const v = Number(tok)
    if (v >= n) {
      errors.push(`"${stmt}": node ${v} does not exist (max ${n - 1})`)
      return null
    }
    return v
  }

  for (const stmt of statements) {
    const [verb, ...args] = stmt.split(/[\s,()]+/).filter(Boolean)
    const kind = VERBS[verb.toLowerCase()]
    if (!kind) {
      errors.push(`"${stmt}": unknown operation "${verb}" (use u, f or c)`)
      continue
    }
    const a = node(args[0], stmt)
    if (a === null) continue
    if (kind === 'find') {
      ops.push({ kind, a })
      continue
    }
    const b = node(args[1], stmt)
    if (b === null) continue
    ops.push({ kind, a, b })
  }
  return { ops, errors }
}

export function formatOp(op: ScriptOp): string {
  switch (op.kind) {
    case 'union':
      return `union(${op.a}, ${op.b})`
    case 'find':
      return `find(${op.a})`
    case 'connected':
      return `connected(${op.a}, ${op.b})`
  }
}
