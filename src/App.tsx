import { useState } from 'react'
import { ForestControls } from './ui/ForestControls'
import { ForestView } from './ui/ForestView'
import { KruskalMode } from './ui/KruskalMode'
import { PercolationMode } from './ui/PercolationMode'
import { Panel, Stat } from './ui/primitives'
import { useForest } from './ui/useForest'

type Mode = 'forest' | 'kruskal' | 'percolation'

const MODES: Array<{ id: Mode; label: string; blurb: string }> = [
  { id: 'forest', label: 'Forest', blurb: 'Union, find, and watch the trees change shape.' },
  { id: 'kruskal', label: 'Kruskal', blurb: 'The same structure decides which edges make the spanning tree.' },
  { id: 'percolation', label: 'Percolation', blurb: 'Open random cells until the top row touches the bottom.' },
]

function modeFromUrl(): Mode {
  const m = new URLSearchParams(window.location.search).get('mode')
  return MODES.some((x) => x.id === m) ? (m as Mode) : 'forest'
}

export default function App() {
  const [mode, setModeState] = useState<Mode>(modeFromUrl)
  const forest = useForest()
  const setMode = (m: Mode) => {
    setModeState(m)
    const url = new URL(window.location.href)
    if (m === 'forest') url.searchParams.delete('mode')
    else url.searchParams.set('mode', m)
    window.history.replaceState(null, '', url)
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-4xl font-extrabold leading-none tracking-tight text-ink sm:text-5xl">
            Kinship <span className="text-terracotta">Forest</span>
          </h1>
          <p className="mt-2 max-w-xl text-base leading-snug text-ink-2">
            Union-find, made visible. Watch trees merge, ranks grow, and path compression flatten a chain in one
            collapse — then put the same structure to work.
          </p>
        </div>
        <nav
          role="tablist"
          aria-label="Mode"
          className="inline-flex gap-1 self-start rounded-2xl bg-paper-3/70 p-1 shadow-cut-inset"
          onKeyDown={(e) => {
            // Roving arrow keys between tabs, as the tablist pattern expects.
            const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
            if (!delta) return
            e.preventDefault()
            const i = MODES.findIndex((m) => m.id === mode)
            const next = MODES[(i + delta + MODES.length) % MODES.length].id
            setMode(next)
            ;(e.currentTarget.querySelector(`[data-mode="${next}"]`) as HTMLButtonElement | null)?.focus()
          }}
        >
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              data-mode={m.id}
              aria-selected={mode === m.id}
              tabIndex={mode === m.id ? 0 : -1}
              onClick={() => setMode(m.id)}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition-[background-color,color,box-shadow] duration-150 ${
                mode === m.id ? 'bg-paper text-ink shadow-cut-sm' : 'text-ink-2 hover:text-ink'
              }`}
            >
              {m.label}
            </button>
          ))}
        </nav>
      </header>

      <p className="smallcaps -mt-2 text-sm font-bold text-ink-3">{MODES.find((m) => m.id === mode)?.blurb}</p>

      {mode === 'forest' && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex min-w-0 flex-col gap-4">
            <Panel className="overflow-hidden !p-2 sm:!p-3">
              <ForestView forest={forest} />
            </Panel>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Sets" value={forest.snap.count} hint="Number of disjoint sets" />
              <Stat label="Max height" value={forest.snap.height} hint="Height of the tallest tree" />
              <Stat label="Parent hops" value={forest.snap.hops} hint="Total parent pointers followed by find so far" />
            </div>
            <Panel title="Log">
              {forest.log.length === 0 ? (
                <p className="text-sm text-ink-3">Operations you run will be narrated here.</p>
              ) : (
                <ol className="space-y-1.5 font-mono text-[13px] leading-snug">
                  {forest.log.map((e, i) => (
                    <li key={e.id} className={i === 0 ? 'text-ink' : 'text-ink-3'}>
                      <span
                        className={`mr-2 inline-block w-2 h-2 rounded-sm align-middle ${
                          e.kind === 'union' ? 'bg-terracotta' : e.kind === 'find' ? 'bg-ochre' : e.kind === 'connected' ? 'bg-slate' : 'bg-ink-3'
                        }`}
                        aria-hidden
                      />
                      {e.text}
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          </div>
          <ForestControls forest={forest} />
        </div>
      )}

      {mode === 'kruskal' && <KruskalMode />}
      {mode === 'percolation' && <PercolationMode />}

      <footer className="mt-auto pt-4 text-xs text-ink-3">
        Typed-array disjoint set · every <code className="font-mono">find</code> records its path so the UI can replay it ·{' '}
        <a
          className="underline decoration-ochre decoration-2 underline-offset-2 hover:text-ink"
          href="https://github.com/goonerlogy-cyber/kinship-forest"
        >
          source
        </a>
      </footer>
    </div>
  )
}
