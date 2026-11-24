import { useMemo, useState } from 'react'
import { Download, Scissors, Layers, Wrench, TrendingUp } from 'lucide-react'
import { useApp } from '../store/store'
import { Button, Label, NumberInput, Panel, Segmented, Stat, cx } from '../ui/kit'
import { money, num } from '../engine/format'
import { optimizeProject, type ProfileOptimization } from '../engine/optimize'

type Tab = 'cost' | 'cut' | 'glass' | 'hw'

function downloadCSV(name: string, rows: Array<Array<string | number>>) {
  const cell = (c: string | number) => {
    if (typeof c === 'number' || /^-?\d+\.\d+$/.test(c)) return String(c).replace('.', ',')
    return /[;"\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c
  }
  const csv = '﻿' + rows.map((r) => r.map(cell).join(';')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export function CostView() {
  const [tab, setTab] = useState<Tab>('cost')
  return (
    <div className="flex h-full min-h-0">
      <PricingRail />
      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-ink-800 bg-ink-950/95 px-6 py-3 backdrop-blur">
          <Segmented<Tab>
            value={tab}
            onChange={setTab}
            options={[
              { value: 'cost', label: <span className="flex items-center gap-1.5"><TrendingUp size={13} /> Maliyet analizi</span> },
              { value: 'cut', label: <span className="flex items-center gap-1.5"><Scissors size={13} /> Kesim optimizasyonu</span> },
              { value: 'glass', label: <span className="flex items-center gap-1.5"><Layers size={13} /> Cam siparişi</span> },
              { value: 'hw', label: <span className="flex items-center gap-1.5"><Wrench size={13} /> Aksesuar & ek</span> },
            ]}
          />
          <span className="ml-auto text-[11px] text-ink-500">Şirket içi — müşteri teklifinde görünmez</span>
        </div>
        <div className="p-6">
          {tab === 'cost' && <CostTab />}
          {tab === 'cut' && <CutTab />}
          {tab === 'glass' && <GlassTab />}
          {tab === 'hw' && <HardwareTab />}
        </div>
      </div>
    </div>
  )
}

function PricingRail() {
  const { state, updateProject, setSettings } = useApp()
  const c = state.project.commercial
  const setC = (patch: Partial<typeof c>) => updateProject((p) => ({ ...p, commercial: { ...p.commercial, ...patch } }))
  const cut = state.settings.cut
  const Override = ({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) => (
    <div>
      <Label hint={value === null ? 'otomatik' : 'manuel'}>{label}</Label>
      <div className="flex gap-1.5">
        <NumberInput value={value ?? 0} onChange={(v) => onChange(v)} min={0} suffix="€" className="flex-1" />
        <button onClick={() => onChange(null)} className={cx('h-9 rounded-lg border px-2 text-[11px]', value === null ? 'border-brand-400/50 bg-brand-500/15 text-brand-200' : 'border-ink-700 text-ink-400')}>
          Oto
        </button>
      </div>
    </div>
  )
  return (
    <aside className="no-print w-[300px] shrink-0 space-y-3 overflow-y-auto border-r border-ink-800 bg-ink-950 p-3">
      <Panel title="Fiyatlandırma">
        <div className="space-y-3">
          <div>
            <Label hint="satış üzerinden">Kâr marjı</Label>
            <NumberInput value={c.marginPercent} onChange={(v) => setC({ marginPercent: v })} min={0} max={90} suffix="%" />
          </div>
          <div>
            <Label>Profil fire payı</Label>
            <NumberInput value={c.wastePercent} onChange={(v) => setC({ wastePercent: v })} min={0} max={50} suffix="%" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>İşçilik / adet</Label>
              <NumberInput value={c.laborPerUnit} onChange={(v) => setC({ laborPerUnit: v })} min={0} suffix="€" />
            </div>
            <div>
              <Label>İşçilik / m²</Label>
              <NumberInput value={c.laborPerM2} onChange={(v) => setC({ laborPerM2: v })} min={0} suffix="€" />
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-ink-500">Katalog fiyatları satış listesi ise marjı %0 bırakın. Alış maliyetiyse marj ve işçilik girin.</p>
        </div>
      </Panel>
      <Panel title="İhracat kalemleri">
        <div className="space-y-3">
          <Override label="Ambalaj & sandık" value={c.packagingOverride} onChange={(v) => setC({ packagingOverride: v })} />
          <Override label="Paletleme" value={c.palletOverride} onChange={(v) => setC({ palletOverride: v })} />
          <Override label="Navlun" value={c.freightOverride} onChange={(v) => setC({ freightOverride: v })} />
          <p className="text-[11px] text-ink-500">Navlun otomatikte yalnızca CFR/CIF/DAP/DDP teslimde eklenir.</p>
        </div>
      </Panel>
      <Panel title="Kesim ayarları">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Testere payı</Label>
            <NumberInput value={cut.kerf} onChange={(v) => setSettings((s) => ({ ...s, cut: { ...s.cut, kerf: v } }))} min={0} max={20} suffix="mm" decimals={1} />
          </div>
          <div>
            <Label>Boy uç kesimi</Label>
            <NumberInput value={cut.barTrim} onChange={(v) => setSettings((s) => ({ ...s, cut: { ...s.cut, barTrim: v } }))} min={0} max={100} suffix="mm" decimals={0} />
          </div>
          <div className="col-span-2">
            <Label>Kullanılabilir artık (≥)</Label>
            <NumberInput value={cut.reusableOffcut} onChange={(v) => setSettings((s) => ({ ...s, cut: { ...s.cut, reusableOffcut: v } }))} min={0} suffix="mm" decimals={0} />
          </div>
        </div>
      </Panel>
    </aside>
  )
}

function CostTab() {
  const { state, totals } = useApp()
  const { catalog, project } = state
  const cur = project.commercial.currency
  const m = (v: number) => money(v, cur, catalog)
  const marginPct = totals.net > 0 ? (totals.grossProfit / totals.net) * 100 : 0
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          ['Malzeme maliyeti', m(totals.material), 'default'],
          ['İşçilik / genel gider', m(totals.labor), 'default'],
          ['Ürün satış toplamı', m(totals.products), 'default'],
          ['Net (iskonto sonrası)', m(totals.net), 'gold'],
          ['Brüt kâr', `${m(totals.grossProfit)}`, totals.grossProfit >= 0 ? 'good' : 'warn'],
        ].map(([l, v, tone]) => (
          <div key={l} className="rounded-xl border border-ink-800 bg-ink-900/70 p-4">
            <Stat label={l} value={v} tone={tone as 'default'} sub={l === 'Brüt kâr' ? `%${num(marginPct, 1)} net üzerinden` : undefined} />
          </div>
        ))}
      </div>

      <Panel
        title="Poz bazında maliyet"
        actions={
          <Button
            size="sm"
            onClick={() =>
              downloadCSV(`Maliyet_${project.quoteNo}.csv`, [
                ['Poz', 'Tanım', 'Ölçü', 'Adet', 'Seri', 'Renk', 'Malzeme/adet', 'İşçilik/adet', 'Satış/adet', 'Satır toplam'],
                ...totals.lines.map((l, i) => [`P${i + 1}`, l.pos.title, `${l.geo.W}x${l.geo.totalH}`, l.pos.qty, catalog.series[l.pos.series]?.name ?? '', catalog.colors[l.pos.color]?.name ?? '', l.materialUnit.toFixed(2), l.laborUnit.toFixed(2), l.priceUnit.toFixed(2), l.priceLine.toFixed(2)]),
              ])
            }
          >
            <Download size={13} /> CSV
          </Button>
        }
        bodyClassName="p-0"
      >
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-b border-ink-800 text-left text-[10.5px] uppercase tracking-wider text-ink-500">
              <th className="px-4 py-2.5">Poz</th>
              <th className="py-2.5">Tanım</th>
              <th className="py-2.5">Ölçü</th>
              <th className="py-2.5 text-right">Adet</th>
              <th className="py-2.5 text-right">Profil</th>
              <th className="py-2.5 text-right">Cam</th>
              <th className="py-2.5 text-right">Aksesuar+Ek</th>
              <th className="py-2.5 text-right">Malzeme/ad.</th>
              <th className="py-2.5 text-right">Satış/ad.</th>
              <th className="px-4 py-2.5 text-right">Toplam</th>
            </tr>
          </thead>
          <tbody>
            {totals.lines.map((l, i) => {
              const g = (k: string) => l.cost.filter((c) => c.group === k).reduce((a, c) => a + c.total, 0)
              return (
                <tr key={l.pos.id} className="border-b border-ink-800/60 hover:bg-ink-900">
                  <td className="px-4 py-2 font-mono font-bold text-gold-400">P{i + 1}</td>
                  <td className="py-2 text-ink-100">{l.pos.title}</td>
                  <td className="py-2 font-mono text-ink-300">
                    {l.geo.W}×{l.geo.totalH}
                  </td>
                  <td className="py-2 text-right font-mono">{l.pos.qty}</td>
                  <td className="py-2 text-right font-mono text-ink-300">{m(g('profile'))}</td>
                  <td className="py-2 text-right font-mono text-ink-300">{m(g('glass'))}</td>
                  <td className="py-2 text-right font-mono text-ink-300">{m(g('hardware') + g('extra'))}</td>
                  <td className="py-2 text-right font-mono">{m(l.materialUnit)}</td>
                  <td className="py-2 text-right font-mono text-white">{m(l.priceUnit)}</td>
                  <td className="px-4 py-2 text-right font-mono font-semibold text-white">{m(l.priceLine)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        {totals.lines.map((l, i) => (
          <Panel key={l.pos.id} title={`P${i + 1} · ${l.pos.title}`} bodyClassName="p-0">
            <table className="w-full text-[12px]">
              <tbody>
                {l.cost.map((c, j) => (
                  <tr key={j} className="border-b border-ink-800/50">
                    <td className="px-4 py-1.5 text-ink-200">
                      {c.label}
                      <div className="font-mono text-[10px] text-ink-500">{c.code}</div>
                    </td>
                    <td className="py-1.5 text-right font-mono text-ink-300">
                      {num(c.quantity, c.unit === 'Adet' ? 0 : 3)} {c.unit}
                    </td>
                    <td className="py-1.5 text-right font-mono text-ink-400">× {num(c.unitPrice)}</td>
                    <td className="px-4 py-1.5 text-right font-mono text-white">{m(c.total)}</td>
                  </tr>
                ))}
                <tr>
                  <td className="px-4 py-2 font-semibold text-white" colSpan={3}>
                    Malzeme / adet
                  </td>
                  <td className="px-4 py-2 text-right font-mono font-semibold text-gold-400">{m(l.materialUnit)}</td>
                </tr>
              </tbody>
            </table>
          </Panel>
        ))}
      </div>
    </div>
  )
}

const POS_COLORS = ['#0b6bc4', '#d4af37', '#10b981', '#a855f7', '#f97316', '#06b6d4', '#ef4444', '#84cc16', '#ec4899', '#64748b']

function CutTab() {
  const { state, totals } = useApp()
  const { catalog, settings, project } = state
  const opt = useMemo(() => optimizeProject(totals.lines, catalog, settings.cut), [totals.lines, catalog, settings.cut])
  const barCost = opt.reduce((a, o) => a + o.grossMeters * o.pricePerMeter, 0)
  const netCost = opt.reduce((a, o) => a + o.netMeters * o.pricePerMeter, 0)
  const cur = project.commercial.currency
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-ink-800 bg-ink-900/70 p-4">
          <Stat label="Toplam boy" value={opt.reduce((a, o) => a + o.bars.length, 0)} sub={`${opt.length} profil kodu`} />
        </div>
        <div className="rounded-xl border border-ink-800 bg-ink-900/70 p-4">
          <Stat label="Net / brüt metre" value={`${num(opt.reduce((a, o) => a + o.netMeters, 0), 1)} / ${num(opt.reduce((a, o) => a + o.grossMeters, 0), 1)}`} sub="m" />
        </div>
        <div className="rounded-xl border border-ink-800 bg-ink-900/70 p-4">
          <Stat label="Gerçek fire" value={`%${num(barCost > 0 ? ((barCost - netCost) / barCost) * 100 : 0, 1)}`} tone="warn" sub={`fiyatlamada kullanılan: %${project.commercial.wastePercent}`} />
        </div>
        <div className="rounded-xl border border-ink-800 bg-ink-900/70 p-4">
          <Stat label="Boy bazlı profil maliyeti" value={money(barCost, cur, catalog)} sub={`net metre: ${money(netCost, cur, catalog)}`} tone="gold" />
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() =>
            downloadCSV(`Kesim_${project.quoteNo}.csv`, [
              ['Profil kodu', 'Profil', 'Renk', 'Boy no', 'Parça boyu (mm)', 'Açı', 'Poz', 'Tanım', 'Artık (mm)'],
              ...opt.flatMap((o) => o.bars.flatMap((b, bi) => b.cuts.map((c) => [o.code, o.name, o.colorName, bi + 1, c.length, c.angle, `P${c.posIndex + 1}`, c.label, b.waste]))),
            ])
          }
        >
          <Download size={13} /> Kesim listesi CSV
        </Button>
      </div>
      {opt.map((o) => (
        <ProfileBars key={o.code + o.colorName} o={o} />
      ))}
    </div>
  )
}

function ProfileBars({ o }: { o: ProfileOptimization }) {
  return (
    <Panel
      title={
        <span className="flex items-center gap-2 normal-case tracking-normal">
          <span className="font-mono text-[11px] text-gold-400">{o.code}</span>
          <span className="text-ink-100">{o.name}</span>
          <span className="text-ink-500">· {o.colorName}</span>
        </span>
      }
      actions={
        <span className="font-mono text-[11px] text-ink-400">
          {o.bars.length} × {o.barLength / 1000} m · fire %{num(o.wastePercent, 1)}
          {o.reusableOffcuts.length > 0 && <span className="text-emerald-400"> · {o.reusableOffcuts.length} kullanılabilir artık</span>}
        </span>
      }
    >
      <div className="space-y-1.5">
        {o.bars.map((b, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-7 text-right font-mono text-[10.5px] text-ink-500">{i + 1}</span>
            <div className="relative flex h-7 flex-1 overflow-hidden rounded-md bg-[repeating-linear-gradient(135deg,#1a2029_0_6px,#141922_6px_12px)] ring-1 ring-ink-700">
              {b.cuts.map((c, j) => (
                <div
                  key={j}
                  title={`${c.length} mm · P${c.posIndex + 1} · ${c.label} · ${c.angle}`}
                  className="flex h-full items-center justify-center overflow-hidden border-r-2 border-ink-950 text-[10px] font-semibold text-white"
                  style={{ width: `${(c.length / b.length) * 100}%`, background: `${POS_COLORS[c.posIndex % POS_COLORS.length]}cc` }}
                >
                  <span className="truncate px-1 font-mono">
                    {c.length} <span className="opacity-70">P{c.posIndex + 1}</span>
                  </span>
                </div>
              ))}
            </div>
            <span className={cx('w-16 text-right font-mono text-[11px]', b.waste >= 800 ? 'text-emerald-400' : 'text-ink-400')}>{b.waste} mm</span>
          </div>
        ))}
        {o.oversize.length > 0 && <div className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-[12px] text-red-200">Boydan uzun {o.oversize.length} parça var ({o.oversize.map((x) => x.length).join(', ')} mm) — ek boyla birleştirme gerekir.</div>}
      </div>
    </Panel>
  )
}

function GlassTab() {
  const { state, totals } = useApp()
  const { catalog, project } = state
  const rows = totals.lines.flatMap((l, i) => l.glass.map((g) => ({ ...g, qty: g.qty * l.pos.qty, area: g.area * l.pos.qty, pos: `P${i + 1}` })))
  const byType = new Map<string, typeof rows>()
  for (const r of rows) byType.set(r.key, [...(byType.get(r.key) ?? []), r])
  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => downloadCSV(`Cam_${project.quoteNo}.csv`, [['Cam kodu', 'Cam', 'Genişlik', 'Yükseklik', 'Adet', 'm²', 'Poz'], ...rows.map((r) => [r.key, r.name, r.w, r.h, r.qty, r.area.toFixed(3), r.pos])])}>
          <Download size={13} /> Cam sipariş CSV
        </Button>
      </div>
      {[...byType.entries()].map(([k, rs]) => (
        <Panel key={k} title={`${catalog.glasses[k]?.name ?? k}`} actions={<span className="font-mono text-[11px] text-ink-400">{rs.reduce((a, r) => a + r.qty, 0)} adet · {num(rs.reduce((a, r) => a + r.area, 0), 2)} m²</span>} bodyClassName="p-0">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-ink-800 text-left text-[10.5px] uppercase tracking-wider text-ink-500">
                <th className="px-4 py-2">Poz</th>
                <th className="py-2 text-right">Genişlik</th>
                <th className="py-2 text-right">Yükseklik</th>
                <th className="py-2 text-right">Adet</th>
                <th className="px-4 py-2 text-right">m²</th>
              </tr>
            </thead>
            <tbody>
              {rs.map((r, i) => (
                <tr key={i} className="border-b border-ink-800/50">
                  <td className="px-4 py-1.5 font-mono text-gold-400">{r.pos}</td>
                  <td className="py-1.5 text-right font-mono text-white">{r.w}</td>
                  <td className="py-1.5 text-right font-mono text-white">{r.h}</td>
                  <td className="py-1.5 text-right font-mono">{r.qty}</td>
                  <td className="px-4 py-1.5 text-right font-mono text-ink-300">{num(r.area, 3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      ))}
    </div>
  )
}

function HardwareTab() {
  const { state, totals } = useApp()
  const { catalog, project } = state
  const agg = new Map<string, { label: string; unit: string; qty: number; total: number }>()
  for (const l of totals.lines)
    for (const c of l.cost)
      if (c.group === 'hardware' || c.group === 'extra') {
        const e = agg.get(c.code) ?? { label: c.label, unit: c.unit, qty: 0, total: 0 }
        e.qty += c.quantity * l.pos.qty
        e.total += c.total * l.pos.qty
        agg.set(c.code, e)
      }
  const pieces = totals.lines.flatMap((l, i) => l.pieces.map((p) => ({ ...p, qty: p.qty * l.pos.qty, pos: i })))
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Aksesuar & ek donanım" bodyClassName="p-0">
        <table className="w-full text-[12.5px]">
          <tbody>
            {[...agg.entries()].map(([k, e]) => (
              <tr key={k} className="border-b border-ink-800/50">
                <td className="px-4 py-2 text-ink-100">
                  {e.label}
                  <div className="font-mono text-[10px] text-ink-500">{k}</div>
                </td>
                <td className="py-2 text-right font-mono">
                  {num(e.qty, e.unit === 'Adet' ? 0 : 2)} {e.unit}
                </td>
                <td className="px-4 py-2 text-right font-mono text-white">{money(e.total, project.commercial.currency, catalog)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <Panel title="Profil kesim listesi (poz bazında)" bodyClassName="p-0 max-h-[70vh] overflow-auto">
        <table className="w-full text-[12px]">
          <thead className="sticky top-0 bg-ink-900">
            <tr className="border-b border-ink-800 text-left text-[10.5px] uppercase tracking-wider text-ink-500">
              <th className="px-4 py-2">Poz</th>
              <th className="py-2">Parça</th>
              <th className="py-2 text-right">Boy</th>
              <th className="py-2 text-center">Açı</th>
              <th className="px-4 py-2 text-right">Adet</th>
            </tr>
          </thead>
          <tbody>
            {pieces.map((p, i) => (
              <tr key={i} className="border-b border-ink-800/40">
                <td className="px-4 py-1.5 font-mono text-gold-400">P{p.pos + 1}</td>
                <td className="py-1.5 text-ink-200">
                  {p.label}
                  <div className="font-mono text-[10px] text-ink-500">{p.code}</div>
                </td>
                <td className="py-1.5 text-right font-mono text-white">{p.length}</td>
                <td className="py-1.5 text-center font-mono text-ink-400">{p.angle}</td>
                <td className="px-4 py-1.5 text-right font-mono">{p.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  )
}
