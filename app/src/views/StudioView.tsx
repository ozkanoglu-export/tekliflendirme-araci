import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  LayoutTemplate,
  Maximize2,
  Minus,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  CornerLeftUp,
  Combine,
} from 'lucide-react'
import { useApp } from '../store/store'
import { WindowDrawing } from '../drawing/WindowDrawing'
import { TemplateGallery, type GalleryPick } from './studio/TemplateGallery'
import { FillIcon, SplitIcon } from './studio/icons'
import { Button, DimInput, IconBtn, Label, Panel, Segmented, Select, Stat, TextArea, TextInput, Toggle, cx, toast } from '../ui/kit'
import { money, num } from '../engine/format'
import { TEMPLATES } from '../engine/fields'
import { collectLeaves, findField, findParent, removeField, replaceField, setChildSize, splitField } from '../engine/fields'
import { clonePosition, newPosition } from '../engine/project'
import type { PositionCalc } from '../engine/bom'
import type { Field, FlyscreenType, LeafField, LeafFill, Position, SashOpening } from '../engine/types'
import { describeOpenings } from '../engine/describe'
import { QUOTE_I18N } from '../engine/i18n'

export function StudioView() {
  const { state, totals, activePos } = useApp()
  const line = totals.lines.find((l) => l.pos.id === state.activePosId)
  return (
    <div className="flex h-full min-h-0">
      <PositionList />
      <div className="flex min-w-0 flex-1 flex-col">{activePos && line ? <Canvas pos={activePos} line={line} /> : <EmptyState />}</div>
      {activePos && line && <Inspector pos={activePos} line={line} />}
    </div>
  )
}

function EmptyState() {
  const { updateProject, setActivePos } = useApp()
  return (
    <div className="canvas-grid flex flex-1 items-center justify-center">
      <div className="text-center">
        <p className="mb-4 text-ink-400">Projede poz yok.</p>
        <Button
          variant="primary"
          onClick={() => {
            const p = newPosition('tiltturn')
            updateProject((pr) => ({ ...pr, positions: [...pr.positions, p] }))
            setActivePos(p.id)
          }}
        >
          <Plus size={16} /> İlk pozu ekle
        </Button>
      </div>
    </div>
  )
}

/* ==========================================================================
   Sol: Poz listesi
   ========================================================================== */
function PositionList() {
  const { state, totals, updateProject, setActivePos } = useApp()
  const { project, catalog } = state
  const [gallery, setGallery] = useState(false)
  const cur = project.commercial.currency

  const add = (pick: GalleryPick) => {
    const last = project.positions.find((p) => p.id === state.activePosId) ?? project.positions[project.positions.length - 1]
    let p: Position
    if (pick.kind === 'template') {
      const keepSeries = last && catalog.series[last.series]?.kind === 'casement' ? last.series : 'ATLANTIK_750'
      p = newPosition(pick.key, { series: keepSeries, color: last?.color, glass: last?.glass })
    } else {
      const s = catalog.series[pick.series]
      p = newPosition('fixed', { series: pick.series, color: last?.color, glass: s.kind === 'slide2' ? 'DC4124SN' : (last?.glass ?? 'DC4164SN'), width: s.kind === 'liftslide' ? 3200 : 2000, height: s.kind === 'liftslide' ? 2400 : 2000 })
      p.title = s.name
    }
    updateProject((pr) => ({ ...pr, positions: [...pr.positions, p] }))
    setActivePos(p.id)
    setGallery(false)
    toast(`Poz ${project.positions.length + 1} eklendi`)
  }

  const move = (i: number, d: -1 | 1) =>
    updateProject((pr) => {
      const arr = [...pr.positions]
      const j = i + d
      if (j < 0 || j >= arr.length) return pr
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
      return { ...pr, positions: arr }
    })

  return (
    <aside className="no-print flex w-[292px] shrink-0 flex-col border-r border-ink-800 bg-ink-950">
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <div>
          <h2 className="text-[13px] font-semibold text-white">Pozlar</h2>
          <p className="text-[11px] text-ink-500">
            {project.positions.length} poz · {totals.totalUnits} adet · {num(totals.totalArea)} m²
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setGallery(true)}>
          <Plus size={14} /> Yeni
        </Button>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-3">
        {totals.lines.map((l, i) => {
          const p = l.pos
          const active = p.id === state.activePosId
          return (
            <div
              key={p.id}
              onClick={() => setActivePos(p.id)}
              className={cx(
                'group relative cursor-pointer rounded-xl border p-2.5 transition-all',
                active ? 'border-gold-500/50 bg-ink-850 shadow-[0_0_0_1px_rgba(212,175,55,0.15),0_10px_30px_-15px_rgba(0,0,0,0.8)]' : 'border-ink-800 bg-ink-900/60 hover:border-ink-700 hover:bg-ink-900',
              )}
            >
              {active && <span className="absolute -left-[13px] top-3 h-8 w-1 rounded-r bg-gold-500" />}
              <div className="flex gap-3">
                <div className="flex h-[74px] w-[74px] shrink-0 items-center justify-center rounded-lg bg-[#0c1016] p-1.5">
                  <WindowDrawing pos={p} geo={l.geo} catalog={catalog} variant="thumb" className="h-full w-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={cx('rounded px-1.5 py-px font-mono text-[10px] font-bold', active ? 'bg-gold-500 text-ink-950' : 'bg-ink-800 text-gold-400')}>P{i + 1}</span>
                    {l.warnings.length > 0 && <AlertTriangle size={12} className="text-amber-400" />}
                    <span className="ml-auto font-mono text-[11px] text-ink-400">×{p.qty}</span>
                  </div>
                  <div className="mt-1 truncate text-[12.5px] font-medium text-ink-100">{p.title || 'İsimsiz poz'}</div>
                  <div className="font-mono text-[11px] text-ink-400">
                    {p.width} × {l.geo.totalH}
                  </div>
                  <div className="mt-0.5 flex items-center justify-between">
                    <span className="truncate text-[10.5px] text-ink-500">{catalog.series[p.series]?.shortName}</span>
                    <span className="font-mono text-[11.5px] font-semibold text-ink-100">{money(l.priceLine, cur, catalog, { decimals: 0 })}</span>
                  </div>
                </div>
              </div>
              <div className="absolute right-1.5 top-9 hidden flex-col gap-0.5 group-hover:flex">
                <button title="Yukarı" onClick={(e) => (e.stopPropagation(), move(i, -1))} className="rounded bg-ink-800/90 p-1 text-ink-300 hover:text-white">
                  <ArrowUp size={12} />
                </button>
                <button title="Aşağı" onClick={(e) => (e.stopPropagation(), move(i, 1))} className="rounded bg-ink-800/90 p-1 text-ink-300 hover:text-white">
                  <ArrowDown size={12} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
      <div className="border-t border-ink-800 bg-ink-900/60 px-4 py-3">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] uppercase tracking-wider text-ink-500">Ürün toplamı</span>
          <span className="font-mono text-[15px] font-semibold text-white">{money(totals.products, cur, catalog)}</span>
        </div>
        <div className="mt-0.5 flex items-baseline justify-between">
          <span className="text-[11px] text-ink-500">Genel toplam ({project.commercial.incoterm})</span>
          <span className="font-mono text-[13px] font-semibold text-gold-400">{money(totals.grand, cur, catalog)}</span>
        </div>
      </div>
      {gallery && <TemplateGallery catalog={catalog} mode="new" onPick={add} onClose={() => setGallery(false)} />}
    </aside>
  )
}

/* ==========================================================================
   Orta: Tuval
   ========================================================================== */
function unionRect(f: Field, line: PositionCalc) {
  const ids = new Set(collectLeaves(f).map((l) => l.id))
  const rs = line.geo.leaves.filter((l) => ids.has(l.id)).map((l) => l.rect)
  if (!rs.length) return null
  const x = Math.min(...rs.map((r) => r.x))
  const y = Math.min(...rs.map((r) => r.y))
  return { x, y, w: Math.max(...rs.map((r) => r.x + r.w)) - x, h: Math.max(...rs.map((r) => r.y + r.h)) - y }
}

function Canvas({ pos, line }: { pos: Position; line: PositionCalc }) {
  const { state, selectField, updatePosition, setSettings } = useApp()
  const { catalog, settings, project } = state
  const [view, setView] = useState({ s: 1, x: 0, y: 0 })
  const [glassSizes, setGlassSizes] = useState(true)
  const box = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null)
  const dragged = useRef(false)

  useEffect(() => setView({ s: 1, x: 0, y: 0 }), [pos.id])

  useEffect(() => {
    const el = box.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      setView((v) => {
        const s = Math.min(8, Math.max(0.4, v.s * (e.deltaY < 0 ? 1.12 : 1 / 1.12)))
        const k = s / v.s
        return { s, x: mx - (mx - v.x) * k, y: my - (my - v.y) * k }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const zoom = (f: number) =>
    setView((v) => {
      const el = box.current
      const cx0 = el ? el.clientWidth / 2 : 0
      const cy0 = el ? el.clientHeight / 2 : 0
      const s = Math.min(8, Math.max(0.4, v.s * f))
      const k = s / v.s
      return { s, x: cx0 - (cx0 - v.x) * k, y: cy0 - (cy0 - v.y) * k }
    })

  const sel = state.selectedFieldId ? findField(pos.root, state.selectedFieldId) : null
  const selRect = sel && sel.kind === 'split' ? unionRect(sel, line) : null
  const series = catalog.series[pos.series]
  const isTree = series?.kind === 'casement'
  const t = QUOTE_I18N.TR

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={box}
        className="canvas-grid relative min-h-0 flex-1 cursor-grab overflow-hidden active:cursor-grabbing"
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false }
          dragged.current = false
        }}
        onPointerMove={(e) => {
          const d = drag.current
          if (!d) return
          const dx = e.clientX - d.x
          const dy = e.clientY - d.y
          if (!d.moved && Math.hypot(dx, dy) > 4) {
            d.moved = true
            dragged.current = true
            ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
          }
          if (d.moved) setView((v) => ({ ...v, x: d.vx + dx, y: d.vy + dy }))
        }}
        onPointerUp={() => {
          drag.current = null
        }}
        onClick={() => {
          if (!dragged.current) selectField(null)
        }}
      >
        <div className="absolute inset-0 origin-top-left p-12 pb-16" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})` }}>
          <WindowDrawing
            pos={pos}
            geo={line.geo}
            catalog={catalog}
            variant="studio"
            convention={settings.symbolConvention}
            selectedId={state.selectedFieldId}
            showGlassSizes={glassSizes}
            highlightRect={selRect}
            onSelect={(id) => {
              if (!dragged.current) selectField(id)
            }}
            className="h-full w-full"
          />
        </div>

        {/* Üst sol: başlık */}
        <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2">
          <span className="rounded-md bg-gold-500 px-2 py-0.5 font-mono text-[11px] font-bold text-ink-950">P{project.positions.findIndex((p) => p.id === pos.id) + 1}</span>
          <span className="text-[13px] font-medium text-ink-100">{pos.title}</span>
          <span className="text-[11px] text-ink-500">· İçeriden görünüş · {describeOpenings(pos, line.geo, t)}</span>
        </div>

        {/* Üst sağ: görünüm araçları */}
        <div className="glass-card absolute right-4 top-4 flex items-center gap-0.5 rounded-xl border border-ink-700 p-1" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          <IconBtn title="Uzaklaş" onClick={() => zoom(1 / 1.25)}>
            <ZoomOut size={15} />
          </IconBtn>
          <span className="w-11 text-center font-mono text-[11px] text-ink-400">{Math.round(view.s * 100)}%</span>
          <IconBtn title="Yakınlaş" onClick={() => zoom(1.25)}>
            <ZoomIn size={15} />
          </IconBtn>
          <IconBtn title="Sığdır" onClick={() => setView({ s: 1, x: 0, y: 0 })}>
            <Maximize2 size={15} />
          </IconBtn>
          <div className="mx-1 h-5 w-px bg-ink-700" />
          <IconBtn title={glassSizes ? 'Cam ölçülerini gizle' : 'Cam ölçülerini göster'} active={glassSizes} onClick={() => setGlassSizes((v) => !v)}>
            {glassSizes ? <Eye size={15} /> : <EyeOff size={15} />}
          </IconBtn>
          <Segmented
            size="sm"
            value={settings.symbolConvention}
            onChange={(v) => setSettings((s) => ({ ...s, symbolConvention: v }))}
            options={[
              { value: 'din', label: 'DIN', title: 'Üçgen ucu menteşe tarafını gösterir (Avrupa standardı)' },
              { value: 'classic', label: 'Klasik', title: 'Üçgen ucu kol tarafını gösterir' },
            ]}
          />
        </div>

        {/* Alt: seçili alan araç çubuğu */}
        {isTree && sel && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
            <FieldToolbar pos={pos} field={sel} onChange={(root) => updatePosition(pos.id, (p) => ({ ...p, root }))} />
          </div>
        )}
        {isTree && !sel && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-ink-700 bg-ink-900/80 px-4 py-1 text-[11.5px] text-ink-400">
            Alana tıkla → kanat tipi seç, böl, birleştir · Tekerlek: zoom · Sürükle: kaydır
          </div>
        )}
      </div>
      <StatusBar line={line} />
    </div>
  )
}

const FILLS: Array<{ fill: LeafFill; opening?: SashOpening; label: string }> = [
  { fill: 'fixed', label: 'Sabit' },
  { fill: 'sash', opening: 'tiltturn', label: 'Çift açılım' },
  { fill: 'sash', opening: 'turn', label: 'Tek açılım' },
  { fill: 'sash', opening: 'tilt', label: 'Vasistas' },
  { fill: 'pair', label: 'HOK' },
  { fill: 'door', label: 'Kapı' },
  { fill: 'doorPair', label: 'Çift kapı' },
]

function FieldToolbar({ pos, field, onChange }: { pos: Position; field: Field; onChange: (root: Field) => void }) {
  const { selectField } = useApp()
  const parent = findParent(pos.root, field.id)
  const setLeaf = (patch: Partial<LeafField>) => onChange(replaceField(pos.root, field.id, (f) => ({ ...(f as LeafField), ...patch })))
  const doSplit = (dir: 'v' | 'h', n: number) => {
    const root = splitField(pos.root, field.id, dir, n)
    onChange(root)
    let created: Field | null = null
    if (field.id === pos.root.id) created = root
    else if (parent) {
      const np = findField(root, parent.parent.id)
      if (np && np.kind === 'split') created = np.children[parent.index].field
    }
    selectField(created ? (collectLeaves(created)[0]?.id ?? null) : null)
  }
  return (
    <div className="glass-card fade-up flex items-center gap-1 rounded-2xl border border-ink-600 p-1.5 shadow-2xl">
      {field.kind === 'leaf' ? (
        <>
          {FILLS.map((f) => {
            const on = field.fill === f.fill && (f.fill !== 'sash' || field.opening === f.opening)
            return (
              <button
                key={f.label}
                title={f.label}
                onClick={() => setLeaf({ fill: f.fill, ...(f.opening ? { opening: f.opening } : {}) })}
                className={cx('flex w-[62px] flex-col items-center gap-0.5 rounded-xl py-1 text-[10.5px] transition', on ? 'bg-brand-500/20 text-brand-200 ring-1 ring-brand-400/50' : 'text-ink-300 hover:bg-ink-800 hover:text-white')}
              >
                <FillIcon fill={f.fill} opening={f.opening} hinge={field.hinge} size={26} />
                {f.label}
              </button>
            )
          })}
          {field.fill !== 'fixed' && (
            <button
              title="Menteşe / aktif kanat yönünü çevir"
              onClick={() => setLeaf({ hinge: field.hinge === 'left' ? 'right' : 'left' })}
              className="flex w-[62px] flex-col items-center gap-0.5 rounded-xl py-1 text-[10.5px] text-gold-300 hover:bg-ink-800"
            >
              <ArrowLeftRight size={20} className="my-[3px]" />
              {field.hinge === 'left' ? 'Sol' : 'Sağ'}
            </button>
          )}
        </>
      ) : (
        <span className="px-3 text-[12px] text-ink-300">
          {field.dir === 'v' ? 'Dikey' : 'Yatay'} bölme · {field.children.length} parça
        </span>
      )}
      <div className="mx-1 h-10 w-px bg-ink-700" />
      {[
        ['v', 2],
        ['v', 3],
        ['h', 2],
        ['h', 3],
      ].map(([d, n]) => (
        <button key={`${d}${n}`} title={`${d === 'v' ? 'Dikey' : 'Yatay'} ${n} parçaya böl`} onClick={() => doSplit(d as 'v' | 'h', n as number)} className="flex w-[46px] flex-col items-center gap-0.5 rounded-xl py-1 text-[10.5px] text-ink-300 hover:bg-ink-800 hover:text-white">
          <SplitIcon dir={d as 'v' | 'h'} parts={n as number} size={26} />
          {d === 'v' ? '│' : '─'}
          {n}
        </button>
      ))}
      {parent && (
        <>
          <div className="mx-1 h-10 w-px bg-ink-700" />
          <button title="Üst bölmeyi seç" onClick={() => selectField(parent.parent.id)} className="flex w-[50px] flex-col items-center gap-0.5 rounded-xl py-1 text-[10.5px] text-ink-300 hover:bg-ink-800 hover:text-white">
            <CornerLeftUp size={20} className="my-[3px]" />
            Üst
          </button>
          <button
            title="Bu alanı kaldır (komşusu genişler)"
            onClick={() => {
              onChange(removeField(pos.root, field.id))
              selectField(null)
            }}
            className="flex w-[50px] flex-col items-center gap-0.5 rounded-xl py-1 text-[10.5px] text-red-300 hover:bg-red-500/10"
          >
            <Combine size={20} className="my-[3px]" />
            Birleş
          </button>
        </>
      )}
    </div>
  )
}

function StatusBar({ line }: { line: PositionCalc }) {
  const { state } = useApp()
  const { catalog, project } = state
  const cur = project.commercial.currency
  const [open, setOpen] = useState(false)
  return (
    <div className="no-print relative border-t border-ink-800 bg-ink-950 px-5 py-2.5">
      <div className="flex items-center gap-8">
        <Stat label="Ölçü" value={`${line.geo.W} × ${line.geo.totalH}`} sub="mm" />
        <Stat label="Alan" value={`${num(line.grossArea)} m²`} sub={`cam ${num(line.glassArea)} m²`} />
        <Stat label="Uw" value={`${num(line.uw)}`} sub="W/m²K" tone="good" />
        <Stat label="Profil" value={`${num(Object.values(line.profileMeters).reduce((a, b) => a + b, 0))} m`} sub={`${line.pieces.reduce((a, p) => a + p.qty, 0)} parça`} />
        <Stat label="Birim fiyat" value={money(line.priceUnit, cur, catalog)} sub={`malzeme ${money(line.materialUnit, cur, catalog, { decimals: 0 })}`} />
        <Stat label={`Toplam ×${line.pos.qty}`} value={money(line.priceLine, cur, catalog)} tone="gold" />
        {line.warnings.length > 0 ? (
          <button onClick={() => setOpen((v) => !v)} className="ml-auto flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[12px] text-amber-200">
            <AlertTriangle size={14} /> {line.warnings.length} uyarı
          </button>
        ) : (
          <span className="ml-auto rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-[12px] text-emerald-300">✓ Ölçüler seri sınırları içinde</span>
        )}
      </div>
      {open && line.warnings.length > 0 && (
        <div className="fade-up absolute bottom-full right-4 mb-2 w-[380px] rounded-xl border border-amber-500/30 bg-ink-900 p-3 shadow-2xl">
          {line.warnings.map((w) => (
            <div key={w} className="flex gap-2 py-1 text-[12px] text-amber-100">
              <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-400" /> {w}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   Sağ: Özellikler paneli
   ========================================================================== */
function Inspector({ pos, line }: { pos: Position; line: PositionCalc }) {
  const { state, updatePosition, updateProject, setActivePos, selectField } = useApp()
  const { catalog, project } = state
  const [gallery, setGallery] = useState(false)
  const up = (fn: (p: Position) => Position, coalesce = false) => updatePosition(pos.id, fn, coalesce)
  const series = catalog.series[pos.series]
  const sel = state.selectedFieldId ? findField(pos.root, state.selectedFieldId) : null
  const cur = project.commercial.currency

  const seriesOptions = useMemo(
    () => Object.values(catalog.series).map((s) => ({ value: s.key, label: `${s.name} · ${s.thickness} mm`, group: `${s.brand} ${s.kind === 'casement' ? 'Kanatlı' : 'Sürme'}` })),
    [catalog.series],
  )
  const glassOptions = useMemo(() => Object.values(catalog.glasses).map((g) => ({ value: g.key, label: `${g.name}`, group: g.panel ? 'Paneller' : 'Camlar' })), [catalog.glasses])
  const idx = project.positions.findIndex((p) => p.id === pos.id)

  return (
    <aside className="no-print flex w-[348px] shrink-0 flex-col border-l border-ink-800 bg-ink-950">
      <div className="flex items-center justify-between border-b border-ink-800 px-4 py-3">
        <div className="text-[13px] font-semibold text-white">Poz özellikleri</div>
        <div className="flex gap-0.5">
          <IconBtn title="Şablon / düzen değiştir" onClick={() => setGallery(true)}>
            <LayoutTemplate size={15} />
          </IconBtn>
          <IconBtn
            title="Pozu kopyala"
            onClick={() => {
              const c = clonePosition(pos)
              updateProject((p) => {
                const arr = [...p.positions]
                arr.splice(idx + 1, 0, c)
                return { ...p, positions: arr }
              })
              setActivePos(c.id)
              toast('Poz kopyalandı', 'info')
            }}
          >
            <Copy size={15} />
          </IconBtn>
          <IconBtn
            title="Pozu sil"
            className="hover:!bg-red-500/10 hover:!text-red-300"
            onClick={() => {
              if (project.positions.length <= 1) return toast('Son poz silinemez', 'err')
              updateProject((p) => ({ ...p, positions: p.positions.filter((x) => x.id !== pos.id) }))
              toast('Poz silindi — Ctrl+Z ile geri alabilirsiniz', 'info')
            }}
          >
            <Trash2 size={15} />
          </IconBtn>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        <Panel>
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_88px] gap-2">
              <div>
                <Label>Poz adı</Label>
                <TextInput value={pos.title} onChange={(v) => up((p) => ({ ...p, title: v }), true)} />
              </div>
              <div>
                <Label>Adet</Label>
                <div className="flex h-9 items-center rounded-lg border border-ink-700 bg-ink-950/70">
                  <button className="px-2 text-ink-400 hover:text-white" onClick={() => up((p) => ({ ...p, qty: Math.max(1, p.qty - 1) }))}>
                    <Minus size={13} />
                  </button>
                  <input value={pos.qty} onChange={(e) => up((p) => ({ ...p, qty: Math.max(1, parseInt(e.target.value) || 1) }), true)} className="w-full bg-transparent text-center font-mono text-[14px] font-semibold text-white outline-none" />
                  <button className="px-2 text-ink-400 hover:text-white" onClick={() => up((p) => ({ ...p, qty: p.qty + 1 }))}>
                    <Plus size={13} />
                  </button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label hint="↑↓ ±10 · ⇧ ±100">Genişlik</Label>
                <DimInput big value={pos.width} onChange={(v) => up((p) => ({ ...p, width: v }))} />
              </div>
              <div>
                <Label hint={pos.shutter.enabled && pos.shutter.mode === 'subtract' ? 'panjur dahil' : undefined}>Yükseklik</Label>
                <DimInput big value={pos.height} onChange={(v) => up((p) => ({ ...p, height: v }))} />
              </div>
            </div>
            <p className="text-[11px] leading-relaxed text-ink-500">Ölçü: 1250 · 125cm · 1,25m · 49 1/4" — birim yazılmazsa mm.</p>
          </div>
        </Panel>

        <Panel title="Sistem">
          <div className="space-y-3">
            <div>
              <Label hint={series ? `Uf ${series.uf} · ${series.hardwareBrand}` : undefined}>Profil serisi</Label>
              <Select
                value={pos.series}
                onChange={(v) => {
                  const ns = catalog.series[v]
                  up((p) => ({ ...p, series: v, glass: ns?.kind === 'slide2' && p.glass === 'DC4164SN' ? 'DC4124SN' : p.glass }))
                  selectField(null)
                }}
                options={seriesOptions}
              />
            </div>
            <div>
              <Label>Profil rengi</Label>
              <div className="grid grid-cols-4 gap-2">
                {Object.values(catalog.colors).map((c) => (
                  <button
                    key={c.key}
                    onClick={() => up((p) => ({ ...p, color: c.key }))}
                    className={cx('flex flex-col items-center gap-1 rounded-lg border p-1.5 transition', pos.color === c.key ? 'border-gold-500/60 bg-ink-850' : 'border-ink-800 hover:border-ink-600')}
                    title={`${c.name} (${c.code})`}
                  >
                    <span
                      className="h-6 w-full rounded-md ring-1 ring-black/40"
                      style={{ background: c.woodgrain ? `repeating-linear-gradient(100deg, ${c.fill} 0 5px, ${c.stroke}55 5px 6px, ${c.fill} 6px 11px)` : c.fill }}
                    />
                    <span className="w-full truncate text-center text-[10px] text-ink-300">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label hint={catalog.glasses[pos.glass] ? `Ug ${catalog.glasses[pos.glass].ug}` : undefined}>Cam / dolgu</Label>
              <Select value={pos.glass} onChange={(v) => up((p) => ({ ...p, glass: v }))} options={glassOptions} />
            </div>
            {series && series.kind !== 'casement' && (
              <div>
                <Label>{series.kind === 'liftslide' ? 'Hareketli kanat' : 'Kol tarafı'}</Label>
                <Segmented value={pos.activeSide} onChange={(v) => up((p) => ({ ...p, activeSide: v }))} options={[{ value: 'left', label: 'Sol' }, { value: 'right', label: 'Sağ' }]} className="w-full" />
              </div>
            )}
          </div>
        </Panel>

        {series?.kind === 'casement' && <FieldPanel pos={pos} line={line} sel={sel} />}

        <Panel title="Ek donanım">
          <div className="divide-y divide-ink-800">
            <Toggle checked={pos.shutter.enabled} onChange={(v) => up((p) => ({ ...p, shutter: { ...p.shutter, enabled: v } }))} label="Monoblok motorlu panjur" hint="195 mm kutu" />
            {pos.shutter.enabled && (
              <div className="py-2">
                <Segmented
                  size="sm"
                  className="w-full"
                  value={pos.shutter.mode}
                  onChange={(v) => up((p) => ({ ...p, shutter: { ...p.shutter, mode: v } }))}
                  options={[
                    { value: 'subtract', label: 'Kutu ölçüye dahil' },
                    { value: 'add', label: 'Kutu üste eklenir' },
                  ]}
                />
              </div>
            )}
            {collectLeaves(pos.root).some((l) => l.fill === 'door' || l.fill === 'doorPair') && series?.kind === 'casement' && (
              <Toggle checked={pos.threshold === 'alu20'} onChange={(v) => up((p) => ({ ...p, threshold: v ? 'alu20' : 'none' }))} label="Alüminyum düşük eşik" hint="20 mm · kapı altı 3 kenar kasa" />
            )}
            <Toggle checked={pos.muntin} onChange={(v) => up((p) => ({ ...p, muntin: v }))} label="Cam içi karolaj" />
            <Toggle checked={pos.frameExt} onChange={(v) => up((p) => ({ ...p, frameExt: v }))} label="35×70 kasa yükseltme" />
            <div className="pt-2.5">
              <Label>Sineklik</Label>
              <Select<FlyscreenType>
                value={pos.flyscreen}
                onChange={(v) => up((p) => ({ ...p, flyscreen: v }))}
                options={[
                  { value: 'NONE', label: 'Yok' },
                  { value: 'SABIT', label: 'Sabit sineklik' },
                  { value: 'MENTESELI', label: 'Menteşeli sineklik' },
                  { value: 'PILELI_YATAY', label: 'Pileli yatay' },
                  { value: 'PILELI_DIKEY', label: 'Pileli dikey' },
                ]}
              />
            </div>
          </div>
        </Panel>

        <Panel title="Fiyat dökümü" actions={<span className="font-mono text-[12px] text-gold-400">{money(line.priceUnit, cur, catalog)}</span>}>
          <div className="space-y-1 text-[12px]">
            {(['profile', 'glass', 'hardware', 'extra'] as const).map((g) => {
              const sum = line.cost.filter((c) => c.group === g).reduce((a, c) => a + c.total, 0)
              if (!sum) return null
              const lbl = { profile: 'Profil', glass: 'Cam / panel', hardware: 'Aksesuar', extra: 'Ek donanım' }[g]
              return (
                <div key={g} className="flex justify-between text-ink-300">
                  <span>{lbl}</span>
                  <span className="font-mono">{money(sum, cur, catalog)}</span>
                </div>
              )
            })}
            {line.laborUnit > 0 && (
              <div className="flex justify-between text-ink-300">
                <span>İşçilik / genel gider</span>
                <span className="font-mono">{money(line.laborUnit, cur, catalog)}</span>
              </div>
            )}
            {project.commercial.marginPercent > 0 && (
              <div className="flex justify-between text-ink-300">
                <span>Kâr marjı %{project.commercial.marginPercent}</span>
                <span className="font-mono">{money(line.priceUnit - line.materialUnit - line.laborUnit, cur, catalog)}</span>
              </div>
            )}
            <div className="mt-1 flex justify-between border-t border-ink-800 pt-1.5 font-semibold text-white">
              <span>Birim satış</span>
              <span className="font-mono">{money(line.priceUnit, cur, catalog)}</span>
            </div>
          </div>
        </Panel>

        <Panel title="Not (teklifte görünür)">
          <TextArea value={pos.note ?? ''} onChange={(v) => up((p) => ({ ...p, note: v }), true)} rows={2} placeholder="Ör. Salon cephesi, 2. kat" />
        </Panel>
      </div>
      {gallery && (
        <TemplateGallery
          catalog={catalog}
          mode="apply"
          onClose={() => setGallery(false)}
          onPick={(pick) => {
            if (pick.kind === 'template') {
              const t = TEMPLATES.find((x) => x.key === pick.key)!
              up((p) => ({
                ...p,
                series: catalog.series[p.series]?.kind === 'casement' ? p.series : 'ATLANTIK_750',
                root: t.build(p.width, p.height),
                threshold: ['door', 'doorPair', 'balcony', 'entrance'].includes(t.key) ? 'alu20' : p.threshold,
              }))
              selectField(null)
            }
            setGallery(false)
          }}
        />
      )}
    </aside>
  )
}

function FieldPanel({ pos, line, sel }: { pos: Position; line: PositionCalc; sel: Field | null }) {
  const { state, updatePosition, selectField } = useApp()
  const { catalog } = state
  const setRoot = (root: Field) => updatePosition(pos.id, (p) => ({ ...p, root }))
  if (!sel) {
    return (
      <Panel title="Seçili alan">
        <p className="text-[12px] leading-relaxed text-ink-400">
          Çizimde bir alana tıklayın. Kanat tipini, menteşe yönünü, alanın camını ve bölme ölçüsünü buradan değiştirebilirsiniz.
        </p>
        <Button size="sm" className="mt-3 w-full" onClick={() => selectField(collectLeaves(pos.root)[0]?.id ?? null)}>
          İlk alanı seç
        </Button>
      </Panel>
    )
  }
  const parent = findParent(pos.root, sel.id)
  const leafGeo = sel.kind === 'leaf' ? line.geo.leaves.find((l) => l.id === sel.id) : null
  const rect = leafGeo?.rect ?? unionRect(sel, line)
  const currentSize = parent && rect ? Math.round(parent.parent.dir === 'v' ? rect.w : rect.h) : null
  const childSize = parent ? parent.parent.children[parent.index].size : null

  return (
    <Panel title="Seçili alan" icon={<span className="h-2 w-2 rounded-full bg-gold-500" />}>
      <div className="space-y-3">
        {sel.kind === 'leaf' && (
          <>
            <div className="grid grid-cols-4 gap-1.5">
              {FILLS.map((f) => {
                const on = sel.fill === f.fill && (f.fill !== 'sash' || sel.opening === f.opening)
                return (
                  <button
                    key={f.label}
                    onClick={() => setRoot(replaceField(pos.root, sel.id, (x) => ({ ...(x as LeafField), fill: f.fill, ...(f.opening ? { opening: f.opening } : {}) })))}
                    className={cx('flex flex-col items-center gap-0.5 rounded-lg border py-1.5 text-[10px] transition', on ? 'border-brand-400/60 bg-brand-500/15 text-brand-100' : 'border-ink-800 text-ink-400 hover:border-ink-600 hover:text-ink-100')}
                  >
                    <FillIcon fill={f.fill} opening={f.opening} hinge={sel.hinge} size={24} />
                    {f.label}
                  </button>
                )
              })}
            </div>
            {sel.fill !== 'fixed' && (
              <div>
                <Label>{sel.fill === 'pair' || sel.fill === 'doorPair' ? 'Aktif (kollu) kanat' : 'Menteşe tarafı'}</Label>
                <Segmented
                  className="w-full"
                  value={sel.hinge}
                  onChange={(v) => setRoot(replaceField(pos.root, sel.id, (x) => ({ ...(x as LeafField), hinge: v })))}
                  options={[
                    { value: 'left', label: 'Sol' },
                    { value: 'right', label: 'Sağ' },
                  ]}
                />
              </div>
            )}
            <div>
              <Label>Bu alanın camı</Label>
              <Select
                value={sel.glass ?? ''}
                onChange={(v) => setRoot(replaceField(pos.root, sel.id, (x) => ({ ...(x as LeafField), glass: v || undefined })))}
                options={[{ value: '', label: `Poz camı (${catalog.glasses[pos.glass]?.name ?? '-'})` }, ...Object.values(catalog.glasses).map((g) => ({ value: g.key, label: g.name, group: g.panel ? 'Paneller' : 'Camlar' }))]}
              />
            </div>
            {sel.fill !== 'fixed' && (
              <div>
                <Label>Aksesuar seti</Label>
                <Select
                  value={sel.hardware ?? ''}
                  onChange={(v) => setRoot(replaceField(pos.root, sel.id, (x) => ({ ...(x as LeafField), hardware: v || undefined })))}
                  options={[{ value: '', label: 'Otomatik (kanat tipine göre)' }, ...Object.values(catalog.hardware).map((h) => ({ value: h.key, label: h.name }))]}
                />
              </div>
            )}
          </>
        )}
        {sel.kind === 'split' && (
          <div className="space-y-2">
            <p className="text-[12px] text-ink-400">
              {sel.dir === 'v' ? 'Dikey ortakayıtlı' : 'Yatay kayıtlı'} bölme · {sel.children.length} parça. Parça ölçüleri (eksen):
            </p>
            {sel.children.map((c, i) => (
              <div key={c.field.id} className="flex items-center gap-2">
                <button className="w-6 font-mono text-[11px] text-ink-400 hover:text-gold-400" onClick={() => selectField(c.field.id)}>
                  {i + 1}
                </button>
                <SizeRow
                  size={c.size}
                  actual={(() => {
                    const r = unionRect(c.field, line)
                    return r ? Math.round(sel.dir === 'v' ? r.w : r.h) : 0
                  })()}
                  onChange={(v) => setRoot(setChildSize(pos.root, sel.id, i, v))}
                />
              </div>
            ))}
          </div>
        )}
        {parent && currentSize !== null && (
          <div>
            <Label hint={childSize === null ? 'otomatik paylaşım' : 'sabit ölçü'}>{parent.parent.dir === 'v' ? 'Bölme genişliği' : 'Bölme yüksekliği'} (eksen)</Label>
            <SizeRow size={childSize} actual={currentSize} onChange={(v) => setRoot(setChildSize(pos.root, parent.parent.id, parent.index, v))} />
          </div>
        )}
        {leafGeo && (
          <div className="rounded-lg bg-ink-950/70 p-2.5 font-mono text-[11px] text-ink-400">
            {line.geo.sashes
              .filter((s) => s.leafId === sel.id)
              .map((s, i) => (
                <div key={i}>
                  kanat {Math.round(s.rect.w)} × {Math.round(s.rect.h)} {s.role === 'doorSash' ? '· kapı profili' : ''}
                </div>
              ))}
            {line.geo.panes
              .filter((p) => p.leafId === sel.id)
              .map((p, i) => (
                <div key={i} className="text-brand-300">
                  cam {p.w} × {p.h}
                </div>
              ))}
          </div>
        )}
      </div>
    </Panel>
  )
}

function SizeRow({ size, actual, onChange }: { size: number | null; actual: number; onChange: (v: number | null) => void }) {
  return (
    <div className="flex flex-1 items-center gap-2">
      <DimInput value={size ?? actual} onChange={(v) => onChange(v)} className="flex-1" />
      <button
        onClick={() => onChange(null)}
        title="Otomatik: kalan alanı eşit paylaşır"
        className={cx('h-9 rounded-lg border px-2.5 text-[11px] transition', size === null ? 'border-brand-400/50 bg-brand-500/15 text-brand-200' : 'border-ink-700 text-ink-400 hover:text-white')}
      >
        Oto
      </button>
    </div>
  )
}
