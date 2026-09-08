import { useCallback, useEffect, useState } from 'react'
import { Percolation, shuffledCells } from '../core/percolation'
import { Button, Panel, Stat } from './primitives'

const TICK = 28
const P_STAR = 0.5927

interface Sim {
  p: Percolation
  order: Array<[number, number]>
}

function fresh(n: number): Sim {
  return { p: new Percolation(n), order: shuffledCells(n) }
}

export function PercolationMode() {
  const [sim, setSim] = useState<Sim>(() => fresh(14))
  const [cursor, setCursor] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [trials, setTrials] = useState<number[]>([])
  const { p, order } = sim
  const n = p.n
  const percolates = p.percolates()
  const exhausted = cursor >= order.length
  const running = playing && !percolates && !exhausted

  // The Percolation instance is mutated in place; `cursor` is the render key.
  const openNext = useCallback(() => {
    if (percolates || exhausted) return
    const [r, c] = order[cursor]
    p.open(r, c)
    setCursor(cursor + 1)
    if (p.percolates()) setTrials((t) => [...t, p.openFraction()])
  }, [cursor, exhausted, order, p, percolates])

  useEffect(() => {
    if (!running) return
    const id = window.setTimeout(openNext, TICK)
    return () => window.clearTimeout(id)
  }, [running, openNext])

  const restart = (size = n, keepTrials = true) => {
    setSim(fresh(size))
    setCursor(0)
    setPlaying(false)
    if (!keepTrials) setTrials([])
  }

  const mean = trials.length ? trials.reduce((a, b) => a + b, 0) / trials.length : null
  const gap = 0.08
  const status = percolates ? 'percolates' : exhausted ? 'never percolated' : running ? 'opening…' : 'not yet'

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex min-w-0 flex-col gap-4">
        <Panel className="overflow-hidden !p-2 sm:!p-3">
          <svg
            viewBox={`${-gap} ${-gap} ${n + gap} ${n + gap}`}
            className="mx-auto block h-auto w-full max-w-[520px]"
            role="img"
            aria-label={`${n} by ${n} percolation grid, ${p.openCount} cells open, ${status}`}
          >
            {Array.from({ length: n * n }, (_, i) => {
              const r = Math.floor(i / n)
              const c = i % n
              const open = p.isOpen(r, c)
              const full = open && p.isFull(r, c)
              return (
                <rect
                  key={i}
                  x={c}
                  y={r}
                  width={1 - gap}
                  height={1 - gap}
                  rx={0.14}
                  className={`transition-[fill] duration-200 ${
                    full ? (percolates ? 'fill-terracotta' : 'fill-ochre') : open ? 'fill-paper' : 'fill-slate-2'
                  }`}
                />
              )
            })}
          </svg>
        </Panel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Open cells" value={`${p.openCount} / ${n * n}`} />
          <Stat label="Open fraction" value={p.openFraction().toFixed(3)} />
          <Stat label="Status" value={<span className={percolates ? 'text-terracotta' : ''}>{status}</span>} />
          <Stat
            label="Threshold est."
            value={mean === null ? '—' : mean.toFixed(3)}
            hint={`Mean open fraction at first percolation over ${trials.length} trial${trials.length === 1 ? '' : 's'}`}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Panel title="Run">
          <div className="flex flex-wrap gap-2">
            <Button tone="primary" disabled={percolates || exhausted} onClick={openNext}>
              Open one
            </Button>
            <Button tone="primary" disabled={percolates || exhausted} onClick={() => setPlaying(!running)}>
              {running ? 'Pause' : 'Run to threshold'}
            </Button>
            <Button onClick={() => restart()}>New trial</Button>
            <Button tone="danger" disabled={trials.length === 0} onClick={() => restart(n, false)}>
              Clear trials
            </Button>
          </div>
          <label className="mt-4 block">
            <span className="smallcaps mb-1.5 flex items-baseline justify-between text-xs font-bold text-ink-2">
              Grid size <span className="font-mono text-sm text-ink">{n} × {n}</span>
            </span>
            <input
              type="range"
              min={5}
              max={30}
              value={n}
              onChange={(e) => restart(Number(e.target.value), false)}
              className="w-full accent-terracotta"
              aria-label="Grid size"
            />
          </label>
        </Panel>
        <Panel title="What you're seeing">
          <p className="text-sm leading-snug text-ink-2">
            Cells open in a random order. Every open cell is unioned with its open neighbours; row 0 also joins a virtual{' '}
            <em>top</em> node and the last row a virtual <em>bottom</em>. Cells shown in{' '}
            <span className="font-bold text-ochre-2">ochre</span> share a root with top. The moment top and bottom share a root
            the grid percolates, and the open fraction at that instant is one sample of the threshold.
          </p>
          <p className="mt-3 text-sm leading-snug text-ink-2">
            Reference: for large grids p* ≈ <span className="font-mono">{P_STAR}</span>.
            {mean !== null && (
              <>
                {' '}
                Your {trials.length}-trial mean is off by{' '}
                <span className="font-mono">{Math.abs(mean - P_STAR).toFixed(3)}</span>.
              </>
            )}
          </p>
          {trials.length > 0 && (
            <ol className="mt-3 flex flex-wrap gap-1.5 font-mono text-xs" aria-label="Trial results">
              {trials.slice(-12).map((t, i) => (
                <li key={i} className="rounded-md bg-paper-2 px-1.5 py-0.5 text-ink-2">
                  {t.toFixed(3)}
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </div>
  )
}
