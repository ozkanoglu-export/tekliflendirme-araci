import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { fmtLen, parseDimension } from '../engine/format'

export function cx(...c: Array<string | false | null | undefined>): string {
  return c.filter(Boolean).join(' ')
}

type BtnVariant = 'primary' | 'ghost' | 'subtle' | 'danger' | 'gold'
export function Button({ variant = 'subtle', size = 'md', className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' }) {
  const v: Record<BtnVariant, string> = {
    primary: 'bg-brand-500 hover:bg-brand-400 text-white shadow-[0_1px_0_rgba(255,255,255,0.15)_inset,0_6px_18px_-6px_rgba(11,107,196,0.7)]',
    gold: 'bg-gold-500 hover:bg-gold-400 text-ink-950 shadow-[0_6px_18px_-8px_rgba(212,175,55,0.8)]',
    subtle: 'bg-ink-800 hover:bg-ink-700 text-ink-100 border border-ink-700',
    ghost: 'hover:bg-ink-800 text-ink-300 hover:text-ink-100',
    danger: 'bg-transparent hover:bg-red-500/10 text-red-300 border border-red-500/30',
  }
  const s = size === 'sm' ? 'h-7 px-2.5 text-[12px] gap-1.5' : 'h-9 px-3.5 text-[13px] gap-2'
  return (
    <button {...rest} className={cx('inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none select-none', v[variant], s, className)}>
      {children}
    </button>
  )
}

export function IconBtn({ title, active, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      title={title}
      aria-label={title}
      {...rest}
      className={cx('inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-30', active ? 'bg-brand-500/20 text-brand-300 ring-1 ring-brand-500/40' : 'text-ink-300 hover:bg-ink-800 hover:text-ink-100', className)}
    >
      {children}
    </button>
  )
}

export function Label({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-1 flex items-center justify-between">
      <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-ink-400">{children}</span>
      {hint && <span className="text-[10px] text-ink-500">{hint}</span>}
    </div>
  )
}

const inputCls =
  'w-full h-9 rounded-lg bg-ink-950/70 border border-ink-700 px-3 text-[13px] text-ink-100 placeholder:text-ink-500 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/25 transition'

export function TextInput({ value, onChange, placeholder, className, mono }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; mono?: boolean }) {
  return <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cx(inputCls, mono && 'font-mono', className)} />
}

export function TextArea({ value, onChange, rows = 3, placeholder, className }: { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string; className?: string }) {
  return <textarea value={value} rows={rows} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cx(inputCls, 'h-auto py-2 leading-relaxed', className)} />
}

/** Sayı girişi — yazarken serbest, Enter/blur'da doğrular */
export function NumberInput({ value, onChange, min, max, step, suffix, className, decimals = 2 }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; suffix?: string; className?: string; decimals?: number }) {
  const [txt, setTxt] = useState(String(value))
  useEffect(() => setTxt(String(Math.round(value * 10 ** decimals) / 10 ** decimals)), [value, decimals])
  const commit = () => {
    let v = parseFloat(txt.replace(',', '.'))
    if (!Number.isFinite(v)) v = value
    if (min !== undefined) v = Math.max(min, v)
    if (max !== undefined) v = Math.min(max, v)
    onChange(v)
    setTxt(String(v))
  }
  return (
    <div className={cx('relative', className)}>
      <input
        inputMode="decimal"
        value={txt}
        step={step}
        onChange={(e) => setTxt(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        }}
        className={cx(inputCls, 'font-mono tabular-nums', suffix && 'pr-10')}
      />
      {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-ink-500">{suffix}</span>}
    </div>
  )
}

/**
 * Ölçü girişi — yazarken serbest, geçerli değer 0,3 sn sonra çizime yansır.
 * mm modunda: 1250 · 125cm · 1,25m · 49 1/4"   inç modunda: 49 1/4 · 49.25 · 1250mm
 */
export function DimInput({ value, onChange, className, big, units = 'mm', min = 200, max = 12000 }: { value: number; onChange: (v: number) => void; className?: string; big?: boolean; units?: 'mm' | 'inch'; min?: number; max?: number }) {
  const [txt, setTxt] = useState(fmtLen(value, units))
  const [focused, setFocused] = useState(false)
  const [err, setErr] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const valueRef = useRef(value)
  valueRef.current = value
  useEffect(() => {
    if (!focused) setTxt(fmtLen(value, units))
  }, [value, units, focused])
  useEffect(() => () => clearTimeout(timer.current), [])

  const valid = (v: number | null): v is number => v !== null && v >= min && v <= max
  const live = (t: string) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const v = parseDimension(t, units)
      if (valid(v) && v !== valueRef.current) onChange(v)
    }, 300)
  }
  const commit = () => {
    clearTimeout(timer.current)
    setFocused(false)
    const v = parseDimension(txt, units)
    if (!valid(v)) {
      setErr(true)
      setTxt(fmtLen(value, units))
      setTimeout(() => setErr(false), 1200)
      return
    }
    setErr(false)
    if (v !== value) onChange(v)
    setTxt(fmtLen(v, units))
  }
  const step = (dir: 1 | -1, big: boolean) => {
    const d = units === 'inch' ? (big ? 25.4 : 25.4 / 16) : big ? 100 : 10
    const v = Math.min(max, Math.max(min, Math.round(value + dir * d)))
    onChange(v)
    setTxt(fmtLen(v, units))
  }
  return (
    <div className={cx('relative', className)}>
      <input
        value={txt}
        inputMode={units === 'inch' ? 'text' : 'decimal'}
        onChange={(e) => {
          setTxt(e.target.value)
          live(e.target.value)
        }}
        onBlur={commit}
        onFocus={(e) => {
          setFocused(true)
          e.target.select()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          if (e.key === 'Escape') {
            setTxt(fmtLen(value, units))
            ;(e.target as HTMLInputElement).blur()
          }
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault()
            step(e.key === 'ArrowUp' ? 1 : -1, e.shiftKey)
          }
        }}
        className={cx(inputCls, 'font-mono tabular-nums pr-10', big && 'h-11 text-[17px] font-semibold', err && 'border-red-500 ring-2 ring-red-500/30')}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-ink-500">{units === 'inch' ? 'inç' : 'mm'}</span>
      {focused && units === 'inch' && valid(parseDimension(txt, units)) && (
        <span className="pointer-events-none absolute -bottom-4 right-1 font-mono text-[10px] text-ink-500">= {parseDimension(txt, units)} mm</span>
      )}
    </div>
  )
}

/** Tam sayı (adet) girişi — silip yeniden yazmaya izin verir */
export function IntInput({ value, onChange, min = 1, max = 9999, className }: { value: number; onChange: (v: number) => void; min?: number; max?: number; className?: string }) {
  const [txt, setTxt] = useState(String(value))
  const [focused, setFocused] = useState(false)
  useEffect(() => {
    if (!focused) setTxt(String(value))
  }, [value, focused])
  return (
    <input
      value={txt}
      inputMode="numeric"
      onFocus={(e) => {
        setFocused(true)
        e.target.select()
      }}
      onChange={(e) => {
        const t = e.target.value.replace(/[^0-9]/g, '')
        setTxt(t)
        const v = parseInt(t)
        if (Number.isFinite(v) && v >= min && v <= max) onChange(v)
      }}
      onBlur={() => {
        setFocused(false)
        setTxt(String(value))
      }}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      className={className}
    />
  )
}

export function Select<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string; group?: string }>; className?: string }) {
  const groups = [...new Set(options.map((o) => o.group ?? ''))]
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)} className={cx(inputCls, 'cursor-pointer pr-8 appearance-none bg-[length:12px] bg-[right_10px_center] bg-no-repeat', className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M3 4.5l3 3 3-3' stroke='%2397a2b3' fill='none' stroke-width='1.5'/%3E%3C/svg%3E\")" }}>
      {groups.map((g) =>
        g ? (
          <optgroup key={g} label={g}>
            {options
              .filter((o) => o.group === g)
              .map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
          </optgroup>
        ) : (
          options
            .filter((o) => !o.group)
            .map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))
        ),
      )}
    </select>
  )
}

export function Segmented<T extends string>({ value, onChange, options, size = 'md', className }: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: ReactNode; title?: string }>; size?: 'sm' | 'md'; className?: string }) {
  return (
    <div className={cx('inline-flex rounded-lg bg-ink-950/70 p-0.5 border border-ink-700', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cx(
            'flex-1 rounded-md font-medium transition-all whitespace-nowrap',
            size === 'sm' ? 'px-2 h-6 text-[11px]' : 'px-3 h-8 text-[12px]',
            value === o.value ? 'bg-ink-700 text-white shadow-sm ring-1 ring-ink-600' : 'text-ink-400 hover:text-ink-100',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; hint?: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1.5">
      <span className="min-w-0">
        <span className="block text-[13px] text-ink-100">{label}</span>
        {hint && <span className="block text-[11px] text-ink-500">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx('relative h-5 w-9 shrink-0 rounded-full transition-colors', checked ? 'bg-brand-500' : 'bg-ink-700')}
      >
        <span className={cx('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', checked ? 'left-[18px]' : 'left-0.5')} />
      </button>
    </label>
  )
}

export function Panel({ title, icon, actions, children, className, bodyClassName }: { title?: ReactNode; icon?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={cx('rounded-xl border border-ink-700/70 bg-ink-900/80 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]', className)}>
      {title && (
        <header className="flex items-center justify-between gap-2 border-b border-ink-700/60 px-4 py-2.5">
          <h3 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-200">
            {icon && <span className="text-brand-300">{icon}</span>}
            {title}
          </h3>
          {actions}
        </header>
      )}
      <div className={cx('p-4', bodyClassName)}>{children}</div>
    </section>
  )
}

export function Stat({ label, value, sub, tone = 'default' }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'default' | 'gold' | 'good' | 'warn' }) {
  const t = { default: 'text-white', gold: 'text-gold-400', good: 'text-emerald-300', warn: 'text-amber-300' }[tone]
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-400">{label}</div>
      <div className={cx('mt-0.5 truncate font-mono text-[15px] font-semibold tabular-nums', t)}>{value}</div>
      {sub && <div className="truncate text-[11px] text-ink-500">{sub}</div>}
    </div>
  )
}

/* ---------- Toast ---------- */
type ToastT = { id: number; msg: string; tone: 'info' | 'ok' | 'err' }
let pushToast: (t: Omit<ToastT, 'id'>) => void = () => {}
export function toast(msg: string, tone: ToastT['tone'] = 'ok') {
  pushToast({ msg, tone })
}
export function Toaster() {
  const [items, setItems] = useState<ToastT[]>([])
  useEffect(() => {
    pushToast = (t) => {
      const id = Date.now() + Math.random()
      setItems((x) => [...x, { ...t, id }])
      setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 2800)
    }
  }, [])
  return (
    <div className="no-print pointer-events-none fixed bottom-5 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={cx(
            'animate-[toastIn_.25s_ease-out] rounded-full border px-4 py-2 text-[13px] font-medium shadow-2xl backdrop-blur',
            t.tone === 'err' ? 'border-red-500/40 bg-red-950/90 text-red-100' : t.tone === 'info' ? 'border-ink-600 bg-ink-850/95 text-ink-100' : 'border-emerald-500/30 bg-emerald-950/90 text-emerald-100',
          )}
        >
          {t.msg}
        </div>
      ))}
    </div>
  )
}
