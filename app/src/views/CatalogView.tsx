import { useEffect, useState } from 'react'
import { fileToLogo } from '../ui/logo'
import { RotateCcw, TrendingUp } from 'lucide-react'
import { useApp } from '../store/store'
import { Button, Label, NumberInput, Panel, Segmented, Select, TextInput, cx, toast } from '../ui/kit'
import { DEFAULT_CATALOG, DEFAULT_SETTINGS, clone } from '../engine/catalog'
import type { CasementDeductions, Catalog, CurrencyCode, ProfileRole } from '../engine/types'

type Tab = 'profiles' | 'glass' | 'hw' | 'rates' | 'company' | 'deductions'
const ROLE_LABEL: Record<ProfileRole, string> = { frame: 'Kasa', winSash: 'Pencere kanadı', doorSash: 'Kapı kanadı', mullion: 'Ortakayıt', hok: 'HOK ara' }

const cellInput = 'h-8 w-full rounded-md border border-white/10 bg-black/20 px-2 text-right font-mono text-[12.5px] text-ink-100 outline-none focus:border-brand-400'

function PriceCell({ value, onChange, tone }: { value: number; onChange: (v: number) => void; tone?: 'gold' }) {
  const [t, setT] = useState(String(value))
  useEffect(() => setT(String(value)), [value])
  return (
    <input
      value={t}
      onFocus={() => setT(String(value))}
      onChange={(e) => setT(e.target.value)}
      onBlur={() => {
        const v = parseFloat(t.replace(',', '.'))
        if (Number.isFinite(v) && v >= 0) onChange(Math.round(v * 100) / 100)
        else setT(String(value))
      }}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      className={cx(cellInput, tone === 'gold' && 'text-gold-300')}
    />
  )
}

export function CatalogView() {
  const { state, setCatalog, setSettings } = useApp()
  const { catalog } = state
  const [tab, setTab] = useState<Tab>('profiles')
  const [bulkCat, setBulkCat] = useState<'ALL' | 'SERIES' | 'GLASS' | 'HARDWARE' | 'EXTRAS'>('ALL')
  const [bulkPct, setBulkPct] = useState(5)

  const bulk = () => {
    if (!bulkPct) return
    const f = 1 + bulkPct / 100
    const r = (v: number) => Math.round(v * f * 100) / 100
    setCatalog((c) => {
      const n: Catalog = clone(c)
      if (bulkCat === 'ALL' || bulkCat === 'SERIES')
        for (const s of Object.values(n.series))
          for (const p of Object.values(s.profiles)) {
            p.white = r(p.white)
            p.colored = r(p.colored)
          }
      if (bulkCat === 'ALL' || bulkCat === 'GLASS') for (const g of Object.values(n.glasses)) g.price = r(g.price)
      if (bulkCat === 'ALL' || bulkCat === 'HARDWARE') for (const h of Object.values(n.hardware)) h.price = r(h.price)
      if (bulkCat === 'ALL' || bulkCat === 'EXTRAS')
        for (const e of Object.values(n.extras)) {
          e.price = r(e.price)
          if (e.colored) e.colored = r(e.colored)
        }
      return n
    })
    toast(`%${bulkPct > 0 ? '+' : ''}${bulkPct} toplu fiyat güncellemesi uygulandı`)
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-5 p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-semibold text-white">Katalog & Fiyat Yönetimi</h1>
            <p className="text-[13px] text-ink-400">Tüm fiyatlar EUR bazlıdır. Değişiklikler otomatik kaydedilir ve tüm pozlara anında yansır.</p>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              if (!confirm('Katalog ve ayarlar fabrika değerlerine dönsün mü? (Logolar korunur)')) return
              setCatalog(() => clone(DEFAULT_CATALOG))
              setSettings((s) => ({ ...clone(DEFAULT_SETTINGS), company: { ...DEFAULT_SETTINGS.company, logo: s.company.logo, logoDark: s.company.logoDark, partnerLogos: s.company.partnerLogos } }))
              toast('Fabrika ayarlarına dönüldü', 'info')
            }}
          >
            <RotateCcw size={13} /> Fabrika ayarları
          </Button>
        </div>

        <Panel title="Toplu zam / indirim" icon={<TrendingUp size={14} />}>
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-56">
              <Label>Kapsam</Label>
              <Select
                value={bulkCat}
                onChange={setBulkCat}
                options={[
                  { value: 'ALL', label: 'Tüm katalog' },
                  { value: 'SERIES', label: 'Profil serileri' },
                  { value: 'GLASS', label: 'Cam & paneller' },
                  { value: 'HARDWARE', label: 'Aksesuarlar' },
                  { value: 'EXTRAS', label: 'Panjur, sineklik, ekler' },
                ]}
              />
            </div>
            <div className="w-36">
              <Label>Oran</Label>
              <NumberInput value={bulkPct} onChange={setBulkPct} min={-90} max={300} suffix="%" decimals={1} />
            </div>
            <Button variant="gold" onClick={bulk}>
              Uygula
            </Button>
            <span className="pb-2 text-[12px] text-ink-500">Zam için +, indirim için − girin.</span>
          </div>
        </Panel>

        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'profiles', label: 'Profil serileri' },
            { value: 'glass', label: 'Cam & panel' },
            { value: 'hw', label: 'Aksesuar & ek' },
            { value: 'rates', label: 'Kur & ihracat' },
            { value: 'company', label: 'Firma & logo' },
            { value: 'deductions', label: 'Düşüm tabloları' },
          ]}
        />

        {tab === 'profiles' &&
          Object.values(catalog.series).map((s) => (
            <Panel
              key={s.key}
              title={
                <span className="flex items-center gap-2 normal-case tracking-normal">
                  <span className="rounded bg-brand-500/20 px-1.5 py-px text-[10px] font-bold text-brand-200">{s.brand}</span>
                  <span className="text-white">{s.name}</span>
                  <span className="text-ink-500">
                    · {s.thickness} mm · Uf {s.uf} · {s.kind === 'casement' ? 'Kanatlı' : s.kind === 'slide2' ? 'Sürme' : 'Kaldır-sür'}
                  </span>
                </span>
              }
              bodyClassName="p-0"
            >
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="border-b border-white/[0.07] text-left text-[10.5px] uppercase tracking-wider text-ink-500">
                    <th className="px-4 py-2">Rol</th>
                    <th className="py-2">Kod</th>
                    <th className="py-2">Profil</th>
                    <th className="w-24 py-2 text-right">Boy (mm)</th>
                    <th className="w-28 py-2 text-right">Beyaz €/m</th>
                    <th className="w-28 px-4 py-2 text-right">Renkli €/m</th>
                  </tr>
                </thead>
                <tbody>
                  {(Object.keys(s.profiles) as ProfileRole[]).map((role) => {
                    const p = s.profiles[role]
                    const set = (patch: Partial<typeof p>) => setCatalog((c) => ({ ...c, series: { ...c.series, [s.key]: { ...c.series[s.key], profiles: { ...c.series[s.key].profiles, [role]: { ...c.series[s.key].profiles[role], ...patch } } } } }))
                    return (
                      <tr key={role} className="border-b border-white/[0.07]">
                        <td className="px-4 py-1.5 text-ink-400">{ROLE_LABEL[role]}</td>
                        <td className="py-1.5 font-mono text-[11.5px] text-gold-400">{p.code}</td>
                        <td className="py-1.5 text-ink-100">{p.name}</td>
                        <td className="py-1.5 pl-2">
                          <PriceCell value={p.barLength} onChange={(v) => set({ barLength: v })} />
                        </td>
                        <td className="py-1.5 pl-2">
                          <PriceCell value={p.white} onChange={(v) => set({ white: v })} />
                        </td>
                        <td className="px-4 py-1.5 pl-2">
                          <PriceCell value={p.colored} onChange={(v) => set({ colored: v })} tone="gold" />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Panel>
          ))}

        {tab === 'glass' && (
          <Panel bodyClassName="p-0">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-white/[0.07] text-left text-[10.5px] uppercase tracking-wider text-ink-500">
                  <th className="px-4 py-2.5">Kod</th>
                  <th className="py-2.5">Açıklama</th>
                  <th className="w-24 py-2.5 text-right">Ug</th>
                  <th className="w-32 px-4 py-2.5 text-right">€ / m²</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(catalog.glasses).map((g) => (
                  <tr key={g.key} className="border-b border-white/[0.07]">
                    <td className="px-4 py-1.5 font-mono text-[11.5px] text-emerald-400">{g.key}</td>
                    <td className="py-1.5 text-ink-100">
                      {g.name} {g.panel && <span className="ml-1 rounded bg-white/[0.07] px-1.5 text-[10px] text-ink-300">panel</span>}
                    </td>
                    <td className="py-1.5 pl-2">
                      <PriceCell value={g.ug} onChange={(v) => setCatalog((c) => ({ ...c, glasses: { ...c.glasses, [g.key]: { ...g, ug: v } } }))} />
                    </td>
                    <td className="px-4 py-1.5 pl-2">
                      <PriceCell value={g.price} onChange={(v) => setCatalog((c) => ({ ...c, glasses: { ...c.glasses, [g.key]: { ...g, price: v } } }))} tone="gold" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        )}

        {tab === 'hw' && (
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Aksesuar setleri" bodyClassName="p-0">
              <table className="w-full text-[12.5px]">
                <tbody>
                  {Object.values(catalog.hardware).map((h) => (
                    <tr key={h.key} className="border-b border-white/[0.07]">
                      <td className="px-4 py-1.5 text-ink-100">
                        {h.name}
                        <div className="font-mono text-[10px] text-ink-500">{h.key}</div>
                      </td>
                      <td className="w-32 px-4 py-1.5">
                        <PriceCell value={h.price} onChange={(v) => setCatalog((c) => ({ ...c, hardware: { ...c.hardware, [h.key]: { ...h, price: v } } }))} tone="gold" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
            <Panel title="Ek donanım" bodyClassName="p-0">
              <table className="w-full text-[12.5px]">
                <tbody>
                  {Object.values(catalog.extras).map((e) => (
                    <tr key={e.key} className="border-b border-white/[0.07]">
                      <td className="px-4 py-1.5 text-ink-100">
                        {e.name}
                        <div className="font-mono text-[10px] text-ink-500">€ / {e.unit}</div>
                      </td>
                      <td className="w-28 py-1.5">
                        <PriceCell value={e.price} onChange={(v) => setCatalog((c) => ({ ...c, extras: { ...c.extras, [e.key]: { ...e, price: v } } }))} tone="gold" />
                      </td>
                      <td className="w-28 px-4 py-1.5">{e.colored !== undefined && <PriceCell value={e.colored} onChange={(v) => setCatalog((c) => ({ ...c, extras: { ...c.extras, [e.key]: { ...e, colored: v } } }))} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          </div>
        )}

        {tab === 'rates' && <RatesTab />}
        {tab === 'company' && <CompanyTab />}
        {tab === 'deductions' && <DeductionsTab />}
      </div>
    </div>
  )
}

function RatesTab() {
  const { state, setCatalog, setSettings } = useApp()
  const { catalog, settings } = state
  const r = settings.exportRules
  const setR = (patch: Partial<typeof r>) => setSettings((s) => ({ ...s, exportRules: { ...s.exportRules, ...patch } }))
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Döviz kurları (1 EUR =)">
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(catalog.exchangeRates) as CurrencyCode[]).map((k) => (
            <div key={k}>
              <Label>{k}</Label>
              <NumberInput value={catalog.exchangeRates[k]} onChange={(v) => setCatalog((c) => ({ ...c, exchangeRates: { ...c.exchangeRates, [k]: k === 'EUR' ? 1 : v }, ratesDate: new Date().toISOString().slice(0, 10) }))} min={0.0001} decimals={4} />
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-ink-500">Son güncelleme: {catalog.ratesDate}. Teklif tarihindeki kuru buraya girin.</p>
      </Panel>
      <Panel title="İhracat masraf kuralları (EUR)">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Ambalaj / m²</Label>
            <NumberInput value={r.packagingPerM2} onChange={(v) => setR({ packagingPerM2: v })} min={0} suffix="€" />
          </div>
          <div>
            <Label>Palet taban bedeli</Label>
            <NumberInput value={r.palletBase} onChange={(v) => setR({ palletBase: v })} min={0} suffix="€" />
          </div>
          <div>
            <Label>Taban alanı</Label>
            <NumberInput value={r.palletBaseArea} onChange={(v) => setR({ palletBaseArea: v })} min={1} suffix="m²" />
          </div>
          <div>
            <Label>Her ek … m²</Label>
            <NumberInput value={r.palletStepArea} onChange={(v) => setR({ palletStepArea: v })} min={1} suffix="m²" />
          </div>
          <div>
            <Label>… için ek palet</Label>
            <NumberInput value={r.palletStepPrice} onChange={(v) => setR({ palletStepPrice: v })} min={0} suffix="€" />
          </div>
          <div />
          <div>
            <Label>Navlun / blok</Label>
            <NumberInput value={r.freightPerBlock} onChange={(v) => setR({ freightPerBlock: v })} min={0} suffix="€" />
          </div>
          <div>
            <Label>Blok alanı</Label>
            <NumberInput value={r.freightBlockArea} onChange={(v) => setR({ freightBlockArea: v })} min={1} suffix="m²" />
          </div>
        </div>
        <p className="mt-3 text-[11px] text-ink-500">Isı geçirgenlik Ψ (cam kenarı):</p>
        <div className="mt-1 w-40">
          <NumberInput value={settings.psiGlass} onChange={(v) => setSettings((s) => ({ ...s, psiGlass: v }))} min={0} max={0.2} decimals={3} suffix="W/mK" />
        </div>
      </Panel>
    </div>
  )
}

function CompanyTab() {
  const { state, setSettings } = useApp()
  const co = state.settings.company
  type TextKey = Exclude<keyof typeof co, 'logo' | 'logoDark' | 'partnerLogos'>
  const set = (k: TextKey) => (v: string) => setSettings((s) => ({ ...s, company: { ...s.company, [k]: v } }))
  const F = ({ k, label, mono }: { k: TextKey; label: string; mono?: boolean }) => (
    <div>
      <Label>{label}</Label>
      <TextInput value={co[k]} onChange={set(k)} mono={mono} />
    </div>
  )
  const setLogo = (patch: Partial<typeof co>) => setSettings((s) => ({ ...s, company: { ...s.company, ...patch } }))
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Logolar" className="lg:col-span-2">
        <div className="grid gap-4 md:grid-cols-3">
          <LogoSlot
            title="Ana logo (açık zemin)"
            hint="Teklif sayfalarında, beyaz kâğıt üzerinde. PNG (şeffaf) veya SVG önerilir."
            value={co.logo}
            light
            onChange={(v) => setLogo({ logo: v })}
          />
          <LogoSlot
            title="Beyaz logo (koyu zemin)"
            hint="Uygulama üst barında ve teklifin lacivert başlığında. Yoksa ana logo beyaz kapsülde gösterilir."
            value={co.logoDark}
            onChange={(v) => setLogo({ logoDark: v })}
          />
          <div>
            <div className="mb-1 text-[12.5px] font-medium text-ink-100">Marka & iş ortağı logoları</div>
            <p className="mb-2 text-[11px] leading-relaxed text-ink-500">Teklifin son sayfasında "Çözüm ortaklarımız" satırında (ör. Adopen, Accado, grup firmaları).</p>
            <div className="grid grid-cols-3 gap-2">
              {(co.partnerLogos ?? []).map((src, i) => (
                <div key={i} className="group relative flex h-14 items-center justify-center rounded-lg bg-white/95 p-1.5">
                  <img src={src} alt="" className="max-h-full max-w-full object-contain" />
                  <button
                    onClick={() => setLogo({ partnerLogos: (co.partnerLogos ?? []).filter((_, j) => j !== i) })}
                    className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] text-white group-hover:flex"
                    title="Kaldır"
                  >
                    ×
                  </button>
                </div>
              ))}
              <label className="flex h-14 cursor-pointer items-center justify-center rounded-lg border border-dashed border-white/20 text-[11px] text-ink-400 transition hover:border-brand-400 hover:text-brand-200">
                + Ekle
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    const files = [...(e.target.files ?? [])]
                    e.target.value = ''
                    try {
                      const urls = await Promise.all(files.map((f) => fileToLogo(f, 600, 240)))
                      setLogo({ partnerLogos: [...(co.partnerLogos ?? []), ...urls] })
                      toast(`${urls.length} logo eklendi`)
                    } catch (err) {
                      toast((err as Error).message, 'err')
                    }
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      </Panel>
      <Panel title="Firma (teklif antetinde)">
        <div className="space-y-3">
          {F({ k: 'name', label: 'Marka adı' })}
          {F({ k: 'legalName', label: 'Ticari ünvan' })}
          {F({ k: 'slogan', label: 'Slogan' })}
          {F({ k: 'address', label: 'Adres' })}
          <div className="grid grid-cols-2 gap-3">
            {F({ k: 'phone', label: 'Telefon' })}
            {F({ k: 'email', label: 'E-posta' })}
          </div>
          {F({ k: 'web', label: 'Web' })}
        </div>
      </Panel>
      <Panel title="Banka">
        <div className="space-y-3">
          {F({ k: 'bankName', label: 'Banka / şube' })}
          {F({ k: 'bankAccountName', label: 'Hesap adı' })}
          {F({ k: 'iban', label: 'IBAN', mono: true })}
          {F({ k: 'swift', label: 'SWIFT', mono: true })}
        </div>
      </Panel>
    </div>
  )
}

const DED_LABELS: Array<[keyof CasementDeductions, string]> = [
  ['weldAllowance', 'Kaynak payı (parça başı)'],
  ['frameToFixedGlass', 'Kasa → sabit cam'],
  ['frameToSash', 'Kasa → kanat dış'],
  ['mullionAxisToSash', 'Ortakayıt ekseni → kanat'],
  ['mullionAxisToFixedGlass', 'Ortakayıt ekseni → sabit cam'],
  ['frameToMullionEnd', 'Kasa → ortakayıt ucu'],
  ['mullionAxisToMullionEnd', 'Ortakayıt → ortakayıt ucu (T)'],
  ['sashToGlass', 'Pencere kanadı → cam'],
  ['doorSashToGlass', 'Kapı kanadı → cam'],
  ['thresholdToSash', 'Eşik → kanat'],
  ['thresholdSashToGlassBottom', 'Eşikli kanat alt → cam'],
  ['thresholdLengthDeduct', 'Eşik boyu düşümü'],
  ['pairGap', 'HOK kanatlar arası boşluk'],
  ['pairMeetingToGlass', 'HOK birleşim → cam (pencere)'],
  ['pairMeetingToGlassDoor', 'HOK birleşim → cam (kapı)'],
  ['hokFromSashHeight', 'HOK ara profil düşümü'],
  ['hokFromSashHeightThreshold', 'HOK ara profil düşümü (eşikli)'],
]

function DeductionsTab() {
  const { state, setCatalog } = useApp()
  const casement = Object.values(state.catalog.series).filter((s) => s.kind === 'casement')
  return (
    <Panel title="Düşüm tabloları (mm, her taraf)" bodyClassName="p-0">
      <div className="border-b border-white/[0.07] bg-amber-500/5 px-4 py-2.5 text-[12px] text-amber-200">
        Değerler eski PenCAD 4.5 formüllerinden alındı. Ortakayıt eksen değerleri Adopen teknik kataloğundan teyit edilmeli. Değişiklik tüm cam/kesim ölçülerini anında günceller.
      </div>
      <table className="w-full text-[12.5px]">
        <thead>
          <tr className="border-b border-white/[0.07] text-left text-[10.5px] uppercase tracking-wider text-ink-500">
            <th className="px-4 py-2.5">Parametre</th>
            {casement.map((s) => (
              <th key={s.key} className="w-32 px-2 py-2.5 text-right">
                {s.shortName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DED_LABELS.map(([k, l]) => (
            <tr key={k} className="border-b border-white/[0.07]">
              <td className="px-4 py-1.5 text-ink-200">{l}</td>
              {casement.map((s) => (
                <td key={s.key} className="px-2 py-1.5">
                  <PriceCell value={s.deductions[k]} onChange={(v) => setCatalog((c) => ({ ...c, series: { ...c.series, [s.key]: { ...c.series[s.key], deductions: { ...c.series[s.key].deductions, [k]: v } } } }))} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  )
}

function LogoSlot({ title, hint, value, light, onChange }: { title: string; hint: string; value?: string; light?: boolean; onChange: (v: string | undefined) => void }) {
  const [drag, setDrag] = useState(false)
  const load = async (f?: File) => {
    if (!f) return
    try {
      onChange(await fileToLogo(f))
      toast('Logo yüklendi')
    } catch (err) {
      toast((err as Error).message, 'err')
    }
  }
  return (
    <div>
      <div className="mb-1 text-[12.5px] font-medium text-ink-100">{title}</div>
      <p className="mb-2 text-[11px] leading-relaxed text-ink-500">{hint}</p>
      <label
        onDragOver={(e) => {
          e.preventDefault()
          setDrag(true)
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          load(e.dataTransfer.files?.[0])
        }}
        className={cx(
          'relative flex h-24 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed p-3 transition',
          drag ? 'border-brand-400 bg-brand-500/10' : 'border-white/20 hover:border-brand-400/70',
          value && (light ? 'bg-white' : 'bg-[#002b5c]'),
        )}
      >
        {value ? <img src={value} alt="" className="max-h-full max-w-full object-contain" /> : <span className="text-center text-[12px] text-ink-400">Sürükle-bırak ya da tıkla<br /><span className="text-[10.5px] text-ink-500">PNG · SVG · JPG</span></span>}
        <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={(e) => (load(e.target.files?.[0]), (e.target.value = ''))} />
      </label>
      {value && (
        <button onClick={() => onChange(undefined)} className="mt-1.5 text-[11px] text-red-300 hover:text-red-200">
          Logoyu kaldır
        </button>
      )}
    </div>
  )
}
