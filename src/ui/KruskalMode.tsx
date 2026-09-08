import { useEffect, useMemo, useState } from 'react'
import { kruskal, randomGraph, type RandomGraph } from '../core/kruskal'
import { UnionFind } from '../core/unionFind'
import { Button, Panel, Stat } from './primitives'

const W = 640
const H = 400
const NODE = 30
const TICK = 900
const SET_COLORS = ['fill-terracotta', 'fill-ochre', 'fill-slate', 'fill-moss'] as const

type Status = 'pending' | 'next' | 'accepted' | 'rejected'

export function KruskalMode() {
  const [graph, setGraph] = useState<RandomGraph>(() => randomGraph(9, 6))
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const result = useMemo(() => kruskal(graph.n, graph.edges), [graph])
  const done = step >= result.steps.length
  const running = playing && !done

  useEffect(() => {
    if (!running) return
    const id = window.setTimeout(() => setStep((s) => s + 1), TICK)
    return () => window.clearTimeout(id)
  }, [running, step])

  // Replay the accepted edges so node colours show the components merging.
  const roots = useMemo(() => {
    const uf = new UnionFind(graph.n, { byRank: true })
    for (const s of result.steps.slice(0, step)) {
      const [u, v] = graph.edges[s.edge]
      uf.union(u, v)
    }
    return { sets: uf.count, root: Array.from({ length: graph.n }, (_, i) => uf.find(i)) }
  }, [graph, result, step])

  const status = useMemo(() => {
    const m = new Map<number, Status>()
    result.steps.forEach((s, i) => {
      if (i < step) m.set(s.edge, s.accepted ? 'accepted' : 'rejected')
      else if (i === step) m.set(s.edge, 'next')
    })
    return m
  }, [result, step])

  const applied = result.steps.slice(0, step)
  const accepted = applied.filter((s) => s.accepted)
  const weight = accepted.reduce((sum, s) => sum + graph.edges[s.edge][2], 0)
  const latest = step > 0 ? result.steps[step - 1] : null

  const edgeName = (idx: number) => `${graph.edges[idx][0]}–${graph.edges[idx][1]}`
  const message = done
    ? `Spanning tree complete: ${accepted.length} edges, total weight ${weight}.`
    : latest === null
      ? 'Edges are sorted lightest first. Each one is accepted if its endpoints are in different sets.'
      : latest.accepted
        ? `Accepted edge ${edgeName(latest.edge)}: it joined two sets.`
        : `Rejected edge ${edgeName(latest.edge)}: both ends already share a root, so it would close a cycle.`

  const px = (x: number) => 40 + x * (W - 80)
  const py = (y: number) => 30 + y * (H - 60)

  const reset = (g = graph) => {
    setGraph(g)
    setStep(0)
    setPlaying(false)
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex min-w-0 flex-col gap-4">
        <Panel className="overflow-hidden !p-2 sm:!p-3">
          <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Weighted graph for Kruskal's algorithm">
            {graph.edges.map(([u, v, w], i) => {
              const st = status.get(i) ?? 'pending'
              const [ax, ay] = graph.points[u]
              const [bx, by] = graph.points[v]
              const x1 = px(ax)
              const y1 = py(ay)
              const x2 = px(bx)
              const y2 = py(by)
              const isLatest = latest?.edge === i
              const stroke =
                st === 'accepted'
                  ? 'var(--color-ochre)'
                  : st === 'rejected'
                    ? 'var(--color-terracotta)'
                    : st === 'next'
                      ? 'var(--color-slate)'
                      : 'var(--color-ink-3)'
              return (
                <g
                  key={`${i}-${isLatest ? step : 'x'}`}
                  className={isLatest ? (st === 'accepted' ? 'edge-glow' : 'edge-shake') : undefined}
                >
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={stroke}
                    strokeWidth={st === 'accepted' ? 7 : st === 'next' ? 5 : 4}
                    strokeLinecap="round"
                    strokeDasharray={st === 'rejected' ? '4 9' : undefined}
                    opacity={st === 'pending' ? 0.35 : st === 'rejected' ? 0.75 : 1}
                    style={{ transition: 'stroke 300ms, opacity 300ms, stroke-width 300ms' }}
                  />
                  <g transform={`translate(${(x1 + x2) / 2}, ${(y1 + y2) / 2})`} opacity={st === 'pending' ? 0.7 : 1}>
                    <rect x={-13} y={-10} width={26} height={20} rx={6} className={st === 'next' ? 'fill-slate' : 'fill-paper'} />
                    <text
                      y={4.5}
                      textAnchor="middle"
                      className={`font-mono text-[12px] font-medium ${st === 'next' ? 'fill-paper' : 'fill-ink'}`}
                    >
                      {w}
                    </text>
                  </g>
                </g>
              )
            })}
            {graph.points.map(([x, y], i) => (
              <g key={i} transform={`translate(${px(x)}, ${py(y)})`} className="uf-node">
                <rect x={-NODE / 2} y={-NODE / 2 + 3} width={NODE} height={NODE} rx={9} className="fill-ink/20" />
                <rect
                  x={-NODE / 2}
                  y={-NODE / 2}
                  width={NODE}
                  height={NODE}
                  rx={9}
                  className={`${SET_COLORS[roots.root[i] % SET_COLORS.length]} transition-[fill] duration-300`}
                />
                <text y={5} textAnchor="middle" className="fill-paper font-display text-[14px] font-extrabold">
                  {i}
                </text>
              </g>
            ))}
          </svg>
        </Panel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Tree weight" value={weight} />
          <Stat label="Accepted" value={accepted.length} hint="Edges that joined two components" />
          <Stat label="Rejected" value={applied.length - accepted.length} hint="Edges whose endpoints were already connected" />
          <Stat label="Sets" value={roots.sets} hint="Components still separate" />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Panel title="Run">
          <div className="flex flex-wrap gap-2">
            <Button tone="primary" disabled={done} onClick={() => setStep((s) => s + 1)}>
              Step
            </Button>
            <Button tone="primary" disabled={done} onClick={() => setPlaying(!running)}>
              {running ? 'Pause' : 'Run'}
            </Button>
            <Button onClick={() => reset()}>Rewind</Button>
            <Button tone="danger" onClick={() => reset(randomGraph(7 + Math.floor(Math.random() * 5), 5 + Math.floor(Math.random() * 4)))}>
              New graph
            </Button>
          </div>
          <p className="mt-3 text-sm leading-snug text-ink-2">{message}</p>
        </Panel>
        <Panel title="Edges by weight">
          <ol className="max-h-72 space-y-1 overflow-y-auto font-mono text-[13px]">
            {result.order.map((idx, i) => {
              const [u, v, w] = graph.edges[idx]
              const st = status.get(idx) ?? 'pending'
              const isNext = i === step && !done
              return (
                <li
                  key={idx}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1 ${isNext ? 'bg-slate text-paper' : i > step ? 'text-ink-3' : 'text-ink'}`}
                  aria-current={isNext || undefined}
                >
                  <span
                    className={`inline-block h-2.5 w-2.5 rounded-sm ${
                      st === 'accepted' ? 'bg-ochre' : st === 'rejected' ? 'bg-terracotta' : isNext ? 'bg-paper' : 'bg-paper-3'
                    }`}
                    aria-hidden
                  />
                  <span className="w-14">
                    {u}–{v}
                  </span>
                  <span className="w-8 text-right tabular-nums">{w}</span>
                  <span className="ml-auto smallcaps text-xs">
                    {st === 'accepted' ? 'accepted' : st === 'rejected' ? 'cycle' : isNext ? 'next' : ''}
                  </span>
                </li>
              )
            })}
            {result.order.length > result.steps.length && (
              <li className="px-2 pt-1 text-xs text-ink-3">…remaining edges are never examined once the tree spans.</li>
            )}
          </ol>
        </Panel>
      </div>
    </div>
  )
}
