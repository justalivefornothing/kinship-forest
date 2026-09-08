import { useState } from 'react'
import { parseScript } from '../core/script'
import { Button, Panel, Segmented } from './primitives'
import type { Forest } from './useForest'

const STRATEGIES = [
  { value: 'naive', label: 'Naive', hint: "b's root always hangs under a's root" },
  { value: 'rank', label: 'By rank', hint: 'shorter tree hangs under taller' },
  { value: 'size', label: 'By size', hint: 'smaller tree hangs under larger' },
] as const

const COMPRESSION = [
  { value: 'none', label: 'None', hint: 'find never rewrites parents' },
  { value: 'full', label: 'Compression', hint: 'every node on the path points at the root' },
  { value: 'halving', label: 'Halving', hint: 'every visited node skips to its grandparent' },
] as const

export function ForestControls({ forest }: { forest: Forest }) {
  const { n, busy, selected, strategy, compression } = forest
  const [script, setScript] = useState('u 8 9; u 7 8; u 0 7   # chain 9 → 8 → 7 → 0\nf 9                    # then flatten it')
  const [errors, setErrors] = useState<string[]>([])
  const [a, b] = selected as [number?, number?]
  const pair = (kind: 'union' | 'connected') => () => {
    if (a !== undefined && b !== undefined) forest.run([{ kind, a, b }])
  }
  const findSelected = () => {
    if (a !== undefined) forest.run([{ kind: 'find', a }])
  }

  const runScript = () => {
    const parsed = parseScript(script, n)
    setErrors(parsed.errors)
    if (parsed.errors.length === 0) forest.run(parsed.ops)
  }

  return (
    <div className="flex flex-col gap-4">
      <Panel title="Strategy">
        <div className="flex flex-col gap-4">
          <Segmented label="Union" value={strategy} options={STRATEGIES} onChange={forest.setStrategy} />
          <Segmented label="Find" value={compression} options={COMPRESSION} onChange={forest.setCompression} />
          <label className="block">
            <span className="smallcaps mb-1.5 flex items-baseline justify-between text-xs font-bold text-ink-2">
              Forest size <span className="font-mono text-sm text-ink">{n} nodes</span>
            </span>
            <input
              type="range"
              min={4}
              max={24}
              value={n}
              disabled={busy}
              onChange={(e) => forest.reset(Number(e.target.value))}
              className="w-full accent-terracotta"
              aria-label="Forest size"
            />
          </label>
        </div>
      </Panel>

      <Panel title="Operate">
        <p className="mb-3 text-sm leading-snug text-ink-2">
          {a === undefined
            ? 'Click a node to select it. Select two to union them, one to find its root.'
            : b === undefined
              ? `Node ${a} selected — pick a second node, or find its root.`
              : `Nodes ${a} and ${b} selected.`}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button tone="primary" disabled={busy || b === undefined} onClick={pair('union')}>
            Union {a !== undefined && b !== undefined ? `${a}, ${b}` : ''}
          </Button>
          <Button tone="primary" disabled={busy || a === undefined} onClick={findSelected}>
            Find {a ?? ''}
          </Button>
          <Button disabled={busy || b === undefined} onClick={pair('connected')}>
            Connected?
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-paper-3 pt-4">
          <Button disabled={busy} onClick={forest.buildChain} title="Build a straight chain so find has something to flatten">
            Tall chain
          </Button>
          <Button disabled={busy} onClick={forest.randomize}>
            Random unions
          </Button>
          <Button tone="danger" disabled={busy} onClick={() => forest.reset()}>
            Reset
          </Button>
        </div>
      </Panel>

      <Panel title="Script">
        <label htmlFor="script" className="sr-only">
          Operation script
        </label>
        <textarea
          id="script"
          value={script}
          onChange={(e) => setScript(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') runScript()
          }}
          rows={3}
          spellCheck={false}
          placeholder="u 1 2; f 5"
          className="w-full resize-y rounded-xl border-0 bg-paper-2/80 px-3 py-2 font-mono text-sm text-ink shadow-cut-inset placeholder:text-ink-3"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button tone="primary" disabled={busy} onClick={runScript}>
            Run script
          </Button>
          <span className="text-xs text-ink-3">
            <code className="font-mono">u a b</code> union · <code className="font-mono">f a</code> find ·{' '}
            <code className="font-mono">c a b</code> connected · Ctrl+Enter runs
          </span>
        </div>
        {errors.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm text-terracotta-2" role="alert">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
