import { useApp } from '../store/store'
import { NumberInput, Toggle, cx } from '../ui/kit'
import { money } from '../engine/format'
import type { Commercial } from '../engine/types'

type Key = 'Packaging' | 'Pallet' | 'Freight'
const ROWS: Array<{ key: Key; label: string; hint: string }> = [
  { key: 'Packaging', label: 'İhracat ambalajı & sandık', hint: 'm² başına' },
  { key: 'Pallet', label: 'Paletleme', hint: 'alana göre kademeli' },
  { key: 'Freight', label: 'Nakliye / navlun', hint: 'her blok m² için' },
]

/** Ambalaj, palet ve nakliye: her biri teklife eklenip çıkarılabilir; tutar otomatik ya da elle */
export function ExportCharges() {
  const { state, totals, updateProject } = useApp()
  const { catalog } = state
  const c = state.project.commercial
  const setC = (patch: Partial<Commercial>) => updateProject((p) => ({ ...p, commercial: { ...p.commercial, ...patch } }))
  const amount: Record<Key, number> = { Packaging: totals.packaging, Pallet: totals.pallet, Freight: totals.freight }

  return (
    <div className="space-y-1">
      {ROWS.map((r) => {
        const incKey = `include${r.key}` as const
        const ovKey = `${r.key.toLowerCase()}Override` as 'packagingOverride' | 'palletOverride' | 'freightOverride'
        const on = c[incKey]
        const ov = c[ovKey]
        return (
          <div key={r.key} className={cx('rounded-lg border px-3 py-1.5 transition', on ? 'border-white/10 bg-black/20' : 'border-transparent')}>
            <Toggle
              checked={on}
              onChange={(v) => setC({ [incKey]: v } as Partial<Commercial>)}
              label={r.label}
              hint={on ? `${money(amount[r.key], c.currency, catalog)} · ${ov === null ? `otomatik, ${r.hint}` : 'elle girildi'}` : 'teklife eklenmiyor'}
            />
            {on && (
              <div className="flex items-center gap-1.5 pb-1.5">
                <NumberInput value={ov ?? amount[r.key]} onChange={(v) => setC({ [ovKey]: v } as Partial<Commercial>)} min={0} suffix="€" className="flex-1" />
                <button
                  onClick={() => setC({ [ovKey]: null } as Partial<Commercial>)}
                  title="Otomatik hesaba dön"
                  className={cx('h-9 rounded-lg border px-2.5 text-[11px]', ov === null ? 'border-brand-400/50 bg-brand-500/15 text-brand-200' : 'border-white/10 text-ink-400 hover:text-white')}
                >
                  Oto
                </button>
              </div>
            )}
          </div>
        )
      })}
      <p className="px-1 pt-1 text-[11px] leading-relaxed text-ink-500">Elle girilen tutar EUR'dur. Otomatik kurallar Katalog → Kur & ihracat ekranında.</p>
    </div>
  )
}
