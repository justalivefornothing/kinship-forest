import { useMemo } from 'react'
import { layoutForest } from '../core/layout'
import type { Forest } from './useForest'

const CELL_W = 64
const CELL_H = 74
const NODE = 40
const PAD = 18

const SET_COLORS = ['fill-terracotta', 'fill-ochre', 'fill-slate', 'fill-moss'] as const

function rootOf(parent: ArrayLike<number>, v: number): number {
  while (parent[v] !== v) v = parent[v]
  return v
}

/** Slightly bowed connector so the lines feel hand-cut rather than ruled. */
function edgePath(x1: number, y1: number, x2: number, y2: number, seed: number): string {
  const bow = ((seed * 37) % 11) - 5
  const mx = (x1 + x2) / 2 + bow
  const my = (y1 + y2) / 2 + (bow % 3)
  return `M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`
}

export function ForestView({ forest }: { forest: Forest }) {
  const { viewParent, snap, anim, recent, selected, strategy, busy } = forest
  const n = viewParent.length
  const maxCols = n <= 12 ? 8 : 12
  const layout = useMemo(() => layoutForest(viewParent, maxCols), [viewParent, maxCols])
  const beforeLayout = useMemo(
    () => (anim.kind === 'collapse' ? layoutForest(anim.before, maxCols) : null),
    [anim, maxCols],
  )

  const px = (col: number) => PAD + col * CELL_W + CELL_W / 2
  const py = (row: number) => PAD + 14 + row * CELL_H + CELL_H / 2
  // While a collapse plays, keep the frame large enough for both the old and
  // new shapes so the nodes visibly slide instead of the whole picture rescaling.
  const frameCols = Math.max(layout.cols, beforeLayout?.cols ?? 0, 3)
  const frameRows = Math.max(layout.rows, beforeLayout?.rows ?? 0, 2)
  const width = PAD * 2 + frameCols * CELL_W
  const height = PAD * 2 + 14 + frameRows * CELL_H

  const walk = anim.kind === 'walk' ? new Set(anim.path.slice(0, anim.step)) : null
  const walkHead = anim.kind === 'walk' ? anim.path[anim.step - 1] : -1
  const recentSet = new Set(recent)
  const roots = useMemo(() => {
    const r = new Int32Array(n)
    for (let i = 0; i < n; i++) r[i] = rootOf(viewParent, i)
    return r
  }, [viewParent, n])

  if (n === 0) {
    return <p className="p-8 text-center text-ink-2">No nodes yet — pick a forest size to begin.</p>
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="block h-auto w-full"
      style={{ maxHeight: 520 }}
      role="img"
      aria-label={`Forest of ${snap.count} sets over ${n} nodes`}
    >
      {/* Edges child -> parent */}
      <g fill="none" strokeLinecap="round" strokeWidth={5}>
        {Array.from(viewParent, (p, i) => {
          if (p === i) return null
          const onWalk = walk?.has(i) && walk.has(p)
          return (
            <path
              key={`e${i}`}
              className="uf-edge"
              d={edgePath(px(layout.x[i]), py(layout.y[i]) - NODE / 2 + 4, px(layout.x[p]), py(layout.y[p]) + NODE / 2 - 4, i)}
              stroke={onWalk ? 'var(--color-ochre)' : 'var(--color-ink-3)'}
              strokeWidth={onWalk ? 7 : 5}
              opacity={onWalk ? 1 : 0.7}
            />
          )
        })}
      </g>

      {/* Compression arcs: from where each node was to the root it now hangs off */}
      {anim.kind === 'collapse' && beforeLayout && (
        <g fill="none" strokeLinecap="round" strokeWidth={4} stroke="var(--color-terracotta)">
          {anim.arcs.map((a) => {
            const x1 = px(beforeLayout.x[a.node])
            const y1 = py(beforeLayout.y[a.node])
            const x2 = px(layout.x[a.to])
            const y2 = py(layout.y[a.to]) + NODE / 2
            const cx = (x1 + x2) / 2 + (x1 < x2 ? -60 : 60)
            return (
              <path key={`a${a.node}`} className="arc-in" pathLength={1} d={`M${x1} ${y1} Q${cx} ${(y1 + y2) / 2} ${x2} ${y2}`} />
            )
          })}
        </g>
      )}

      {/* Nodes */}
      {Array.from(viewParent, (p, i) => {
        const isRoot = p === i
        const color = SET_COLORS[roots[i] % SET_COLORS.length]
        const isSelected = selected.includes(i)
        const onWalk = walk?.has(i) ?? false
        const isHead = walkHead === i
        const glow = recentSet.has(i)
        const badge = isRoot && snap.size[i] > 1 ? (strategy === 'rank' ? `rank ${snap.rank[i]}` : `size ${snap.size[i]}`) : null
        return (
          <g
            key={`n${i}`}
            className="uf-node group cursor-pointer"
            style={{ transform: `translate(${px(layout.x[i])}px, ${py(layout.y[i])}px)` }}
            role="button"
            tabIndex={busy ? -1 : 0}
            aria-pressed={isSelected}
            aria-label={`node ${i}${isRoot ? ', root' : ''}`}
            onClick={() => !busy && forest.toggleSelect(i)}
            onKeyDown={(e) => {
              if (busy) return
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                forest.toggleSelect(i)
              }
            }}
          >
            {isRoot && (
              <text y={-NODE / 2 - 7} textAnchor="middle" className="smallcaps fill-ink-2 text-[11px] font-bold">
                root
                {badge && <tspan className="fill-ink-3 font-mono font-medium"> · {badge}</tspan>}
              </text>
            )}
            <rect
              x={-NODE / 2}
              y={-NODE / 2 + 3}
              width={NODE}
              height={NODE}
              rx={11}
              className="fill-ink/20"
            />
            <rect
              x={-NODE / 2}
              y={-NODE / 2}
              width={NODE}
              height={NODE}
              rx={11}
              className={`${color} transition-[stroke-width,filter] duration-150 group-hover:brightness-110 group-focus-visible:brightness-110`}
              stroke={isHead ? 'var(--color-ink)' : isSelected ? 'var(--color-ink)' : onWalk || glow ? 'var(--color-ochre)' : 'transparent'}
              strokeWidth={isHead || isSelected ? 4 : onWalk || glow ? 3 : 0}
              strokeDasharray={isSelected && !isHead ? '5 4' : undefined}
            />
            <text y={6} textAnchor="middle" className="pointer-events-none fill-paper font-display text-[17px] font-extrabold">
              {i}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
