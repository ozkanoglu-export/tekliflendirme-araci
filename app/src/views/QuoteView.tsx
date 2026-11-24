import { useState, type ReactNode } from 'react'
import { Printer, Target } from 'lucide-react'
import { useApp } from '../store/store'
import { WindowDrawing } from '../drawing/WindowDrawing'
import { Button, Label, NumberInput, Panel, Select, TextArea, TextInput, Toggle, cx, toast } from '../ui/kit'
import { LANGS, QUOTE_I18N, type QuoteDict } from '../engine/i18n'
import { addDays, fmtLen, formatDate, money, num } from '../engine/format'
import { ExportCharges } from './ExportCharges'
import { FREIGHT_INCLUDED } from '../engine/bom'
import { discountForTarget, type PositionCalc, type ProjectTotals } from '../engine/bom'
import { describeOpenings } from '../engine/describe'
import { BrandMark } from '../App'
import { LogoOnDark, LogoOnLight } from '../ui/logo'
import type { AppSettings, Catalog, Incoterm, LangCode, Project } from '../engine/types'

const INCOTERMS: Incoterm[] = ['EXW', 'FCA', 'FOB', 'CFR', 'CIF', 'DAP', 'DDP']
const PARTNERS: Record<LangCode, string> = { TR: 'Çözüm ortaklarımız', EN: 'Our system partners', DE: 'Unsere Systempartner', IT: 'I nostri partner', RU: 'Наши партнёры', FR: 'Nos partenaires' }
const CHAMBERS: Record<LangCode, string> = { TR: 'odacık', EN: 'chambers', DE: 'Kammern', IT: 'camere', RU: 'камер', FR: 'chambres' }

export function QuoteView() {
  const { state, totals, updateProject } = useApp()
  const { project, catalog, settings } = state
  const c = project.commercial
  const t = QUOTE_I18N[c.language]
  const setC = (patch: Partial<Project['commercial']>, coalesce = false) => updateProject((p) => ({ ...p, commercial: { ...p.commercial, ...patch } }), coalesce)
  const setCust = (patch: Partial<Project['customer']>) => updateProject((p) => ({ ...p, customer: { ...p.customer, ...patch } }), true)
  const [target, setTarget] = useState('')

  const pages = paginate(totals.lines)

  return (
    <div className="flex h-full min-h-0">
      <aside className="no-print w-[340px] shrink-0 space-y-3 overflow-y-auto border-r glass-side p-3">
        <Panel title="Teklif dili">
          <div className="grid grid-cols-3 gap-1.5">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => setC({ language: l.code as LangCode })}
                className={cx('flex items-center justify-center gap-1.5 rounded-lg border py-2 text-[12px] font-medium transition', c.language === l.code ? 'border-gold-500/60 bg-gold-500/10 text-gold-300' : 'border-white/[0.07] text-ink-300 hover:border-white/[0.16]')}
              >
                <span>{l.flag}</span>
                {l.code}
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Ticari şartlar">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Teslim şekli</Label>
                <Select<Incoterm> value={c.incoterm} onChange={(v) => setC({ incoterm: v, includeFreight: FREIGHT_INCLUDED[v] })} options={INCOTERMS.map((i) => ({ value: i, label: i }))} />
              </div>
              <div>
                <Label>Geçerlilik</Label>
                <NumberInput value={c.validityDays} onChange={(v) => setC({ validityDays: v })} min={1} max={365} suffix="gün" decimals={0} />
              </div>
            </div>
            <div>
              <Label>Teslim yeri</Label>
              <TextInput value={c.incotermPlace} onChange={(v) => setC({ incotermPlace: v }, true)} placeholder="Ör. Mersin Limanı" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>İskonto</Label>
                <NumberInput value={c.discountPercent} onChange={(v) => setC({ discountPercent: v })} min={0} max={100} suffix="%" />
              </div>
              <div>
                <Label>KDV</Label>
                <NumberInput value={c.vatPercent} onChange={(v) => setC({ vatPercent: v })} min={0} max={50} suffix="%" decimals={0} />
              </div>
            </div>
            <div>
              <Label hint={c.currency}>Hedef genel toplam</Label>
              <div className="flex gap-2">
                <TextInput value={target} onChange={setTarget} placeholder={money(totals.grand, c.currency, catalog)} mono />
                <Button
                  onClick={() => {
                    const v = parseFloat(target.replace(/\./g, '').replace(',', '.'))
                    if (!Number.isFinite(v) || v <= 0) return toast('Geçerli bir tutar girin', 'err')
                    const eur = v / (catalog.exchangeRates[c.currency] ?? 1)
                    const undiscounted = { ...totals } as ProjectTotals
                    const pct = discountForTarget(eur, undiscounted, c)
                    setC({ discountPercent: pct })
                    toast(`Hedefe ulaşmak için %${num(pct)} iskonto uygulandı`)
                  }}
                  title="Gereken iskontoyu hesapla"
                >
                  <Target size={14} />
                </Button>
              </div>
            </div>
            <div className="divide-y divide-white/[0.06] border-t border-white/[0.07] pt-1">
              <Toggle checked={c.showBank} onChange={(v) => setC({ showBank: v })} label="Banka bilgilerini göster" />
            </div>
          </div>
        </Panel>

        <Panel title="Ambalaj · palet · nakliye">
          <ExportCharges />
        </Panel>

        <Panel title="Müşteri">
          <div className="space-y-2.5">
            <div>
              <Label>Firma</Label>
              <TextInput value={project.customer.company} onChange={(v) => setCust({ company: v })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Yetkili</Label>
                <TextInput value={project.customer.name} onChange={(v) => setCust({ name: v })} />
              </div>
              <div>
                <Label>Ülke</Label>
                <TextInput value={project.customer.country} onChange={(v) => setCust({ country: v })} />
              </div>
            </div>
            <div>
              <Label>Adres</Label>
              <TextArea value={project.customer.address} onChange={(v) => setCust({ address: v })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Telefon</Label>
                <TextInput value={project.customer.phone} onChange={(v) => setCust({ phone: v })} />
              </div>
              <div>
                <Label>E-posta</Label>
                <TextInput value={project.customer.email} onChange={(v) => setCust({ email: v })} />
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Teklif bilgileri">
          <div className="space-y-2.5">
            <div className="grid grid-cols-[1fr_72px] gap-2">
              <div>
                <Label>Teklif no</Label>
                <TextInput mono value={project.quoteNo} onChange={(v) => updateProject((p) => ({ ...p, quoteNo: v }), true)} />
              </div>
              <div>
                <Label>Rev.</Label>
                <NumberInput value={project.revision} onChange={(v) => updateProject((p) => ({ ...p, revision: v }))} min={0} decimals={0} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Tarih</Label>
                <input type="date" value={project.date} onChange={(e) => updateProject((p) => ({ ...p, date: e.target.value }))} className="h-9 w-full rounded-lg border border-white/10 bg-black/20 px-2 text-[13px] text-ink-100 outline-none focus:border-brand-400" />
              </div>
              <div>
                <Label>Hazırlayan</Label>
                <TextInput value={project.drawnBy} onChange={(v) => updateProject((p) => ({ ...p, drawnBy: v }), true)} />
              </div>
            </div>
            <div>
              <Label>Proje adı</Label>
              <TextInput value={project.projectName} onChange={(v) => updateProject((p) => ({ ...p, projectName: v }), true)} />
            </div>
          </div>
        </Panel>

        <Button variant="gold" className="w-full" onClick={() => window.print()}>
          <Printer size={15} /> PDF olarak kaydet / Yazdır
        </Button>
        <p className="px-1 pb-4 text-[11px] leading-relaxed text-ink-500">Yazdır penceresinde hedef olarak "PDF olarak kaydet" seçin. Kenar boşluğu: Yok, Arka plan grafikleri: Açık.</p>
      </aside>

      <div className="min-w-0 flex-1 overflow-auto bg-transparent">
        <div className="print-area mx-auto flex w-[210mm] flex-col items-center gap-8 py-10 print:gap-0 print:py-0">
          {pages.map((pg, i) => (
            <Sheet key={i} page={i + 1} pages={pages.length} first={i === 0} project={project} t={t} settings={settings}>
              <div className="space-y-[4mm]">
                {pg.lines.map((l) => (
                  <PositionCard key={l.pos.id} line={l} index={totals.lines.indexOf(l)} t={t} catalog={catalog} project={project} settings={settings} />
                ))}
                {pg.summary && <Summary totals={totals} t={t} project={project} catalog={catalog} settings={settings} overview={pg.lines.length === 0} />}
              </div>
            </Sheet>
          ))}
        </div>
      </div>
    </div>
  )
}

function paginate(lines: PositionCalc[]): Array<{ lines: PositionCalc[]; summary: boolean }> {
  const pages: Array<{ lines: PositionCalc[]; summary: boolean }> = []
  let i = 0
  pages.push({ lines: lines.slice(0, 2), summary: false })
  i = 2
  while (i < lines.length) {
    pages.push({ lines: lines.slice(i, i + 3), summary: false })
    i += 3
  }
  const last = pages[pages.length - 1]
  if (last.lines.length <= 1) last.summary = true
  else pages.push({ lines: [], summary: true })
  return pages
}

/* ==========================================================================
   A4 sayfa
   ========================================================================== */
function Sheet({ children, page, pages, first, project, t, settings }: { children: ReactNode; page: number; pages: number; first: boolean; project: Project; t: QuoteDict; settings: AppSettings }) {
  const co = settings.company
  const c = project.commercial
  return (
    <div className="sheet flex flex-col font-sans">
      {first ? (
        <>
          <div className="relative overflow-hidden bg-[#002b5c] px-[14mm] pb-[7mm] pt-[9mm] text-white">
            <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full border-[28px] border-white/[0.04]" />
            <div className="absolute right-24 top-10 h-40 w-40 rounded-full border-[18px] border-white/[0.03]" />
            <div className="relative flex items-start justify-between">
              {co.logoDark || co.logo ? (
                <div>
                  <LogoOnDark co={co} height={50} />
                  <div className="mt-2 text-[9px] font-semibold tracking-[0.32em] text-[#d4af37]">{t.slogan}</div>
                </div>
              ) : (
                <div className="flex items-center gap-3.5">
                  <BrandMark size={46} />
                  <div>
                    <div className="text-[25px] font-extrabold leading-none tracking-[0.16em]">{co.name}</div>
                    <div className="mt-1.5 text-[9px] font-semibold tracking-[0.32em] text-[#d4af37]">{t.slogan}</div>
                  </div>
                </div>
              )}
              <div className="text-right">
                <div className="text-[25px] font-light leading-none tracking-[0.12em]">{t.quoteTitle}</div>
                <div className="mt-1.5 text-[10px] tracking-wide text-white/70">{t.quoteSubtitle}</div>
              </div>
            </div>
          </div>
          <div className="h-[1.2mm] bg-gradient-to-r from-[#d4af37] via-[#ecd58a] to-[#b08f24]" />
          <div className="grid grid-cols-[1.1fr_1fr] gap-[6mm] px-[14mm] pt-[6mm]">
            <div className="rounded-md border border-slate-200 bg-slate-50/80 px-4 py-3">
              <div className="text-[8px] font-bold uppercase tracking-[0.2em] text-slate-400">{t.customer}</div>
              <div className="mt-1 text-[13px] font-bold text-slate-900">{project.customer.company || '—'}</div>
              {project.customer.name && <div className="text-[10.5px] text-slate-700">{project.customer.name}</div>}
              {project.customer.address && <div className="whitespace-pre-line text-[9.5px] leading-snug text-slate-500">{project.customer.address}</div>}
              <div className="text-[9.5px] text-slate-500">{[project.customer.country, project.customer.phone, project.customer.email].filter(Boolean).join(' · ')}</div>
              {project.projectName && (
                <div className="mt-1.5 text-[9.5px] text-slate-600">
                  <span className="font-semibold text-slate-400">{t.project}:</span> {project.projectName}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 py-1 text-[9.5px]">
              <Meta k={t.quoteNo} v={`#${project.quoteNo}${project.revision ? ` · R${project.revision}` : ''}`} strong />
              <Meta k={t.date} v={formatDate(project.date, c.language)} />
              <Meta k={t.validUntil} v={formatDate(addDays(project.date, c.validityDays), c.language)} />
              <Meta k={t.preparedBy} v={project.drawnBy || '—'} />
              <Meta k={t.delivery} v={`${c.incoterm}${c.incotermPlace ? ` · ${c.incotermPlace}` : ''}`} />
              <Meta k={t.positions} v={`${project.positions.length} ${t.pos.toLowerCase()} · ${project.positions.reduce((a, p) => a + p.qty, 0)} ${t.unit}`} />
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-between border-b border-slate-200 px-[14mm] pb-[3mm] pt-[8mm]">
          <LogoOnLight co={co} height={24} />
          <div className="text-[9.5px] text-slate-500">
            {t.quoteTitle} <span className="font-mono font-semibold text-slate-800">#{project.quoteNo}</span> · {formatDate(project.date, c.language)}
          </div>
        </div>
      )}

      <div className="flex-1 px-[14mm] pt-[5mm]">{children}</div>

      <div className="mt-auto flex items-end justify-between border-t border-slate-200 px-[14mm] pb-[6mm] pt-[3mm] text-[7.5px] leading-relaxed text-slate-400">
        <div>
          <div className="font-semibold text-slate-500">{co.legalName}</div>
          <div>{co.address}</div>
          <div>
            {co.phone} · {co.email} · {co.web}
          </div>
        </div>
        <div className="font-mono text-[8px] text-slate-400">
          {t.page} {page}/{pages}
        </div>
      </div>
    </div>
  )
}

function Meta({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div>
      <div className="text-[7.5px] font-bold uppercase tracking-[0.18em] text-slate-400">{k}</div>
      <div className={cx('mt-0.5 text-slate-800', strong ? 'font-mono text-[12px] font-bold text-[#002b5c]' : 'text-[10.5px] font-medium')}>{v}</div>
    </div>
  )
}

/* ==========================================================================
   Poz kartı
   ========================================================================== */
function PositionCard({ line, index, t, catalog, project, settings }: { line: PositionCalc; index: number; t: QuoteDict; catalog: Catalog; project: Project; settings: AppSettings }) {
  const p = line.pos
  const s = catalog.series[p.series]
  const color = catalog.colors[p.color]
  const glassKeys = [...new Set(line.geo.panes.map((x) => x.glassKey))]
  const cur = project.commercial.currency
  const extras: string[] = []
  if (p.shutter.enabled) extras.push(t.shutter)
  if (line.geo.threshold) extras.push(t.threshold)
  if (p.flyscreen !== 'NONE') extras.push(t.flyscreen[p.flyscreen])
  if (p.muntin) extras.push(t.muntin)
  if (p.frameExt !== 'none') extras.push(t.frameExt)

  return (
    <div className="grid h-[76mm] grid-cols-[64mm_1fr_36mm] overflow-hidden rounded-lg border border-slate-200" style={{ breakInside: 'avoid' }}>
      <div className="relative flex flex-col bg-[linear-gradient(180deg,#f8fafc,#eef2f7)] p-[3mm]">
        <div className="flex items-center justify-between">
          <span className="rounded bg-[#002b5c] px-1.5 py-px font-mono text-[9px] font-bold text-white">
            {t.pos.toUpperCase()} {index + 1}
          </span>
          <span className="text-[7px] uppercase tracking-[0.14em] text-slate-400">{t.insideView}</span>
        </div>
        <div className="flex h-[64mm] items-center justify-center pt-1">
          <WindowDrawing pos={p} geo={line.geo} catalog={catalog} variant="paper" convention={settings.symbolConvention} showGlassSizes={false} fmt={(v) => fmtLen(v, project.commercial.units)} className="h-full w-full" />
        </div>
      </div>

      <div className="min-w-0 border-l border-slate-200 px-[4mm] py-[3mm]">
        <div className="text-[12.5px] font-bold leading-tight text-slate-900">{p.title}</div>
        <div className="mb-[2mm] text-[9.5px] font-medium text-[#0b6bc4]">{describeOpenings(p, line.geo, t)}</div>
        <table className="w-full text-[9px] leading-[1.45]">
          <tbody>
            <Spec k={t.size} v={project.commercial.units === 'inch' ? `${fmtLen(line.geo.outerW, 'inch')} × ${fmtLen(line.geo.totalH, 'inch')} (${line.geo.outerW} × ${line.geo.totalH} mm) · ${num(line.grossArea * 10.7639, 1)} ft²` : `${line.geo.outerW} × ${line.geo.totalH} mm · ${num(line.grossArea)} m²`} mono />
            <Spec k={t.series} v={`${s?.brand ?? ''} ${s?.name ?? ''} · ${s?.thickness} mm${s?.chambers ? ` · ${s.chambers} ${CHAMBERS[project.commercial.language]}` : ''}`} />
            <Spec k={t.color} v={`${color?.name ?? ''} ${color?.code ? `(${color.code})` : ''}`} />
            <Spec k={t.glass} v={glassKeys.map((k) => catalog.glasses[k]?.name ?? k).join(' / ')} />
            <Spec k={t.hardware} v={s?.hardwareBrand ?? ''} />
            <Spec k={t.uw} v={`Uw ≈ ${num(line.uw)} W/m²K`} mono />
            {extras.length > 0 && <Spec k={t.extras} v={extras.join(' · ')} />}
          </tbody>
        </table>
        {p.note && <div className="mt-[1.5mm] rounded bg-amber-50 px-2 py-1 text-[8.5px] italic text-amber-900">{p.note}</div>}
      </div>

      <div className="flex flex-col justify-between border-l border-slate-200 bg-slate-50/60 px-[3mm] py-[3mm] text-right">
        <div>
          <div className="text-[7px] font-bold uppercase tracking-[0.16em] text-slate-400">{t.unitPrice}</div>
          <div className="font-mono text-[11px] font-semibold text-slate-800">{money(line.priceUnit, cur, catalog)}</div>
          <div className="mt-[2mm] text-[7px] font-bold uppercase tracking-[0.16em] text-slate-400">{t.qty}</div>
          <div className="font-mono text-[11px] font-semibold text-slate-800">
            {p.qty} {t.unit}
          </div>
        </div>
        <div className="border-t border-slate-200 pt-[2mm]">
          <div className="text-[7px] font-bold uppercase tracking-[0.16em] text-slate-400">{t.total}</div>
          <div className="font-mono text-[14px] font-bold text-[#002b5c]">{money(line.priceLine, cur, catalog)}</div>
        </div>
      </div>
    </div>
  )
}

function Spec({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <tr className="align-top">
      <td className="w-[24mm] pr-2 text-slate-400">{k}</td>
      <td className={cx('text-slate-800', mono && 'font-mono')}>{v}</td>
    </tr>
  )
}

/* ==========================================================================
   Özet, şartlar, banka, onay
   ========================================================================== */
function Summary({ totals, t, project, catalog, settings, overview }: { totals: ProjectTotals; t: QuoteDict; project: Project; catalog: Catalog; settings: AppSettings; overview: boolean }) {
  const c = project.commercial
  const cur = c.currency
  const m = (v: number) => money(v, cur, catalog)
  const co = settings.company
  const Row = ({ k, v, tone }: { k: string; v: string; tone?: 'muted' | 'discount' }) => (
    <div className={cx('flex justify-between py-[0.9mm] text-[9.5px]', tone === 'discount' ? 'text-amber-700' : 'text-slate-600')}>
      <span>{k}</span>
      <span className="font-mono font-semibold">{v}</span>
    </div>
  )
  return (
    <div className="space-y-[4mm] pt-[1mm]" style={{ breakInside: 'avoid' }}>
      {overview && totals.lines.length <= 14 && (
        <div>
          <h4 className="mb-[1.5mm] text-[8px] font-bold uppercase tracking-[0.2em] text-[#002b5c]">{t.positions}</h4>
          <table className="w-full text-[9px]">
            <thead>
              <tr className="border-b-2 border-[#002b5c] text-left text-[7.5px] uppercase tracking-[0.12em] text-slate-500">
                <th className="py-[1.2mm] pr-2">{t.pos}</th>
                <th className="py-[1.2mm]">{t.desc}</th>
                <th className="py-[1.2mm] text-right">{t.size}</th>
                <th className="py-[1.2mm] text-right">{t.qty}</th>
                <th className="py-[1.2mm] text-right">{t.unitPrice}</th>
                <th className="py-[1.2mm] text-right">{t.total}</th>
              </tr>
            </thead>
            <tbody>
              {totals.lines.map((l, i) => (
                <tr key={l.pos.id} className="border-b border-slate-100">
                  <td className="py-[1.1mm] pr-2 font-mono font-bold text-[#002b5c]">{i + 1}</td>
                  <td className="py-[1.1mm]">
                    <span className="font-semibold text-slate-800">{l.pos.title}</span>
                    <span className="text-slate-400"> · {describeOpenings(l.pos, l.geo, t)} · {catalog.series[l.pos.series]?.name}</span>
                  </td>
                  <td className="py-[1.1mm] text-right font-mono text-slate-600">
                    {fmtLen(l.geo.outerW, project.commercial.units)}×{fmtLen(l.geo.totalH, project.commercial.units)}
                  </td>
                  <td className="py-[1.1mm] text-right font-mono text-slate-600">{l.pos.qty}</td>
                  <td className="py-[1.1mm] text-right font-mono text-slate-600">{m(l.priceUnit)}</td>
                  <td className="py-[1.1mm] text-right font-mono font-semibold text-slate-900">{m(l.priceLine)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="grid grid-cols-[1fr_74mm] gap-[6mm]">
        <div>
          <h4 className="mb-[1.5mm] text-[8px] font-bold uppercase tracking-[0.2em] text-[#002b5c]">{t.terms}</h4>
          <ol className="list-decimal space-y-[0.6mm] pl-4 text-[8.2px] leading-snug text-slate-600 marker:text-slate-400">
            <li>
              <b className="text-slate-800">
                {t.delivery}: {c.incoterm}
                {c.incotermPlace ? ` — ${c.incotermPlace}` : ''}
              </b>
            </li>
            {t.termsList.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ol>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-[4mm]">
          <h4 className="mb-[1.5mm] text-[8px] font-bold uppercase tracking-[0.2em] text-[#002b5c]">{t.summary}</h4>
          <Row k={`${t.products} (${totals.totalUnits} ${t.unit} · ${num(totals.totalArea)} m²)`} v={m(totals.products)} />
          {totals.packaging > 0 && <Row k={t.packaging} v={m(totals.packaging)} />}
          {totals.pallet > 0 && <Row k={t.pallet} v={m(totals.pallet)} />}
          {totals.freight > 0 && <Row k={t.freight} v={m(totals.freight)} />}
          <div className="my-[1mm] border-t border-slate-200" />
          <Row k={t.subtotal} v={m(totals.subtotal)} />
          {totals.discount > 0 && <Row k={`${t.discount} (%${num(c.discountPercent)})`} v={`−${m(totals.discount)}`} tone="discount" />}
          {(totals.discount > 0 || c.vatPercent > 0) && <Row k={t.net} v={m(totals.net)} />}
          <Row k={c.vatPercent > 0 ? `${t.vat} %${c.vatPercent}` : t.vatExport} v={m(totals.vat)} />
          <div className="mt-[2mm] flex items-baseline justify-between rounded-md bg-[#002b5c] px-[3mm] py-[2.5mm] text-white">
            <span className="text-[9px] font-bold tracking-[0.16em]">{t.grand}</span>
            <span className="font-mono text-[15px] font-bold text-[#ecd58a]">{m(totals.grand)}</span>
          </div>
        </div>
      </div>

      <div className={cx('grid gap-[6mm]', c.showBank ? 'grid-cols-2' : 'grid-cols-1')}>
        {c.showBank && (
          <div className="rounded-lg border border-[#cfe1f5] bg-[#eaf2fb]/60 p-[3.5mm] text-[8.5px] leading-relaxed text-slate-700">
            <h4 className="mb-[1mm] text-[8px] font-bold uppercase tracking-[0.2em] text-[#002b5c]">{t.bank}</h4>
            <div>
              <span className="text-slate-400">{t.bankName}:</span> {co.bankName}
            </div>
            <div>
              <span className="text-slate-400">{t.accountName}:</span> {co.bankAccountName}
            </div>
            <div className="font-mono">
              <span className="font-sans text-slate-400">IBAN ({cur}):</span> {co.iban}
            </div>
            <div className="font-mono">
              <span className="font-sans text-slate-400">SWIFT:</span> {co.swift}
            </div>
          </div>
        )}
        <div className="rounded-lg border border-dashed border-slate-300 p-[3.5mm]">
          <h4 className="mb-[1mm] text-[8px] font-bold uppercase tracking-[0.2em] text-[#002b5c]">{t.approval}</h4>
          <p className="text-[8.2px] leading-snug text-slate-500">{t.approvalText}</p>
          <div className="mt-[9mm] border-t border-slate-300 pt-[1mm] text-[7.5px] uppercase tracking-[0.14em] text-slate-400">{t.signature}</div>
        </div>
      </div>
      {(co.partnerLogos?.length ?? 0) > 0 && (
        <div className="flex items-center gap-[6mm] border-t border-slate-100 pt-[3mm]">
          <span className="shrink-0 text-[7.5px] font-bold uppercase tracking-[0.2em] text-slate-400">{PARTNERS[c.language]}</span>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-x-[7mm] gap-y-[2mm]">
            {co.partnerLogos!.map((src, i) => (
              <img key={i} src={src} alt="" className="h-[9mm] w-auto max-w-[36mm] object-contain" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
