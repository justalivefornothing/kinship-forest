import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Tone = 'primary' | 'ghost' | 'danger'

const tones: Record<Tone, string> = {
  primary:
    'bg-terracotta text-paper shadow-cut-sm hover:bg-terracotta-2 active:translate-y-px active:shadow-none disabled:bg-paper-3 disabled:text-ink-3 disabled:shadow-none',
  ghost:
    'bg-paper-2 text-ink shadow-cut-sm hover:bg-paper-3 active:translate-y-px active:shadow-none disabled:text-ink-3 disabled:shadow-none disabled:hover:bg-paper-2',
  danger: 'bg-transparent text-ink-2 hover:bg-paper-2 hover:text-terracotta-2 disabled:text-ink-3 disabled:hover:bg-transparent',
}

export function Button({
  tone = 'ghost',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold tracking-wide transition-[background-color,transform,box-shadow] duration-150 ${tones[tone]} ${className}`}
      {...rest}
    />
  )
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: ReadonlyArray<{ value: T; label: string; hint?: string }>
  onChange: (v: T) => void
}) {
  return (
    <div>
      <div className="smallcaps mb-1.5 text-xs font-bold text-ink-2">{label}</div>
      <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-xl bg-paper-3/70 p-1 shadow-cut-inset">
        {options.map((o) => {
          const active = o.value === value
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              title={o.hint}
              onClick={() => onChange(o.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-bold transition-[background-color,color,box-shadow] duration-150 ${
                active ? 'bg-paper text-ink shadow-cut-sm' : 'text-ink-2 hover:text-ink'
              }`}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-paper-2/80 px-4 py-3 shadow-cut-inset" title={hint}>
      <div className="smallcaps text-xs font-bold text-ink-2">{label}</div>
      <div className="mt-0.5 truncate font-display text-2xl font-extrabold tabular-nums text-ink">{value}</div>
    </div>
  )
}

export function Panel({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`paper-card p-4 sm:p-5 ${className}`}>
      {title && <h2 className="smallcaps mb-3 text-sm font-bold text-ink-2">{title}</h2>}
      {children}
    </section>
  )
}
