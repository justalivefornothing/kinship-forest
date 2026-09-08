import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { UnionFind, chainOf, type Compression, type Reparent } from '../core/unionFind'
import { formatOp, type ScriptOp } from '../core/script'

export type Strategy = 'naive' | 'rank' | 'size'

export interface Snapshot {
  parent: Int32Array
  rank: Int32Array
  size: Int32Array
  count: number
  hops: number
  height: number
}

export type Anim =
  | { kind: 'idle' }
  | { kind: 'walk'; before: Int32Array; path: number[]; step: number }
  | { kind: 'collapse'; before: Int32Array; arcs: Reparent[]; root: number }

export interface LogEntry {
  id: number
  kind: ScriptOp['kind'] | 'info'
  text: string
}

const WALK_STEP = 170
const COLLAPSE = 760
const UNION = 720
const DEFAULT_N = 10

function snapshotOf(uf: UnionFind): Snapshot {
  return {
    parent: Int32Array.from(uf.parent),
    rank: Int32Array.from(uf.rank),
    size: Int32Array.from(uf.size),
    count: uf.count,
    hops: uf.hops,
    height: uf.maxHeight(),
  }
}

/** Starting forest: one small tree with some depth, plus a few singletons. */
function demoForest(): UnionFind {
  const uf = new UnionFind(DEFAULT_N, { compression: 'none' })
  for (const [a, b] of [[1, 2], [3, 4], [2, 4], [5, 6], [4, 6]]) uf.union(a, b)
  uf.opts.compression = 'full'
  uf.hops = 0
  return uf
}

function applyStrategy(uf: UnionFind, strategy: Strategy, compression: Compression) {
  uf.opts.byRank = strategy === 'rank'
  uf.opts.bySize = strategy === 'size'
  uf.opts.compression = compression
}

export function useForest() {
  const [n, setNState] = useState(DEFAULT_N)
  const [strategy, setStrategyState] = useState<Strategy>('naive')
  const [compression, setCompressionState] = useState<Compression>('full')
  const [initial] = useState(demoForest)
  const ufRef = useRef<UnionFind>(initial)
  const [snap, setSnap] = useState<Snapshot>(() => snapshotOf(initial))
  const [anim, setAnim] = useState<Anim>({ kind: 'idle' })
  const [recent, setRecent] = useState<number[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [log, setLog] = useState<LogEntry[]>([])
  const [busy, setBusy] = useState(false)
  const queue = useRef<ScriptOp[]>([])
  const busyRef = useRef(false)
  const timers = useRef<number[]>([])
  const logId = useRef(0)

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms)
    timers.current.push(id)
  }, [])

  const clearTimers = useCallback(() => {
    for (const t of timers.current) window.clearTimeout(t)
    timers.current = []
  }, [])
  useEffect(() => clearTimers, [clearTimers])

  const pushLog = useCallback((kind: LogEntry['kind'], text: string) => {
    setLog((l) => [{ id: ++logId.current, kind, text }, ...l].slice(0, 8))
  }, [])

  const refresh = useCallback(() => setSnap(snapshotOf(ufRef.current)), [])

  /** Run one op with its animation; calls `done` when the visual settles. */
  const perform = useCallback(
    (op: ScriptOp, done: () => void) => {
      const uf = ufRef.current
      const before = Int32Array.from(uf.parent)
      if (op.kind === 'find') {
        const t = uf.findTrace(op.a)
        const walkMs = WALK_STEP * t.path.length
        for (let i = 0; i < t.path.length; i++) {
          later(() => setAnim({ kind: 'walk', before, path: t.path, step: i + 1 }), i * WALK_STEP)
        }
        later(() => {
          refresh()
          setAnim(t.reparented.length ? { kind: 'collapse', before, arcs: t.reparented, root: t.root } : { kind: 'idle' })
          setRecent([t.root])
          const walked = t.path.join(' → ')
          const flat = t.reparented.length
            ? `reparented ${t.reparented.map((r) => r.node).join(', ')} → ${t.root}`
            : 'nothing to compress'
          pushLog('find', `${formatOp(op)} = ${t.root} · walked ${walked} · ${flat}`)
        }, walkMs)
        later(() => {
          setAnim({ kind: 'idle' })
          done()
        }, walkMs + (t.reparented.length ? COLLAPSE : 200))
        return
      }
      if (op.kind === 'connected') {
        const same = uf.connected(op.a, op.b)
        refresh()
        setRecent([op.a, op.b])
        pushLog('connected', `${formatOp(op)} = ${same ? 'true' : 'false'}`)
        later(done, UNION)
        return
      }
      const t = uf.unionTrace(op.a, op.b)
      refresh()
      setRecent(t.merged ? [t.child, t.parent] : [op.a, op.b])
      pushLog(
        'union',
        t.merged
          ? `${formatOp(op)} · root ${t.child} hangs under root ${t.parent}`
          : `${formatOp(op)} · already in the same set (root ${t.findA.root})`,
      )
      later(done, UNION)
    },
    [later, pushLog, refresh],
  )

  const drain = useCallback(
    function drainQueue() {
      const next = queue.current.shift()
      if (!next) {
        busyRef.current = false
        setBusy(false)
        setRecent([])
        return
      }
      perform(next, drainQueue)
    },
    [perform],
  )

  const run = useCallback(
    (ops: ScriptOp[]) => {
      if (ops.length === 0) return
      queue.current.push(...ops)
      setSelected([])
      if (!busyRef.current) {
        busyRef.current = true
        setBusy(true)
        drain()
      }
    },
    [drain],
  )

  const replace = useCallback(
    (uf: UnionFind, note: string) => {
      clearTimers()
      queue.current = []
      applyStrategy(uf, strategy, compression)
      ufRef.current = uf
      setNState(uf.n)
      setAnim({ kind: 'idle' })
      setRecent([])
      setSelected([])
      busyRef.current = false
      setBusy(false)
      setSnap(snapshotOf(uf))
      pushLog('info', note)
    },
    [clearTimers, compression, pushLog, strategy],
  )

  const reset = useCallback((size = n) => replace(new UnionFind(size), `reset to ${size} singleton sets`), [n, replace])
  const buildChain = useCallback(
    () => replace(chainOf(n), `built a chain ${n - 1} → … → 0 — now find(${n - 1})`),
    [n, replace],
  )
  const randomize = useCallback(() => {
    reset()
    const ops: ScriptOp[] = []
    for (let i = 0; i < Math.max(2, n - 3); i++) {
      ops.push({ kind: 'union', a: Math.floor(Math.random() * n), b: Math.floor(Math.random() * n) })
    }
    run(ops)
  }, [n, reset, run])

  const setStrategy = useCallback((s: Strategy) => {
    setStrategyState(s)
    ufRef.current.opts.byRank = s === 'rank'
    ufRef.current.opts.bySize = s === 'size'
  }, [])
  const setCompression = useCallback((c: Compression) => {
    setCompressionState(c)
    ufRef.current.opts.compression = c
  }, [])

  const toggleSelect = useCallback((i: number) => {
    setSelected((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i].slice(-2)))
  }, [])

  const viewParent = useMemo(() => (anim.kind === 'walk' ? anim.before : snap.parent), [anim, snap])

  return {
    n,
    strategy,
    compression,
    snap,
    viewParent,
    anim,
    recent,
    selected,
    log,
    busy,
    setStrategy,
    setCompression,
    toggleSelect,
    run,
    reset,
    buildChain,
    randomize,
  }
}

export type Forest = ReturnType<typeof useForest>
