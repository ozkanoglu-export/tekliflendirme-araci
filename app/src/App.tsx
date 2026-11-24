import { useEffect, useId } from 'react'
import { Boxes, Calculator, FileText, FolderOpen, PenTool, Printer, Redo2, Save, Undo2 } from 'lucide-react'
import { useApp, type View } from './store/store'
import { Button, IconBtn, Select, Toaster, cx, toast } from './ui/kit'
import { StudioView } from './views/StudioView'
import { QuoteView } from './views/QuoteView'
import { CostView } from './views/CostView'
import { CatalogView } from './views/CatalogView'
import { ProjectsView } from './views/ProjectsView'
import { money } from './engine/format'
import { LogoOnDark } from './ui/logo'
import type { CurrencyCode } from './engine/types'

const TABS: Array<{ view: View; label: string; icon: typeof PenTool; key: string }> = [
  { view: 'studio', label: 'Çizim Stüdyosu', icon: PenTool, key: '1' },
  { view: 'quote', label: 'Müşteri Teklifi', icon: FileText, key: '2' },
  { view: 'cost', label: 'Maliyet & Kesim', icon: Calculator, key: '3' },
  { view: 'catalog', label: 'Katalog & Fiyat', icon: Boxes, key: '4' },
  { view: 'projects', label: 'Projeler', icon: FolderOpen, key: '5' },
]

export function BrandMark({ size = 34 }: { size?: number }) {
  const gid = `bm${useId().replace(/:/g, '')}`
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0b6bc4" />
          <stop offset="1" stopColor="#002b5c" />
        </linearGradient>
      </defs>
      <rect width="34" height="34" rx="8" fill={`url(#${gid})`} />
      <rect x="8" y="7.5" width="18" height="19" rx="1.5" fill="none" stroke="#fff" strokeWidth="2.2" />
      <path d="M17 7.5v19M8 17h18" stroke="#d4af37" strokeWidth="1.8" />
      <path d="M10.5 10l5 4.5-5 4.5" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="1" />
    </svg>
  )
}

export default function App() {
  const { state, setView, undo, redo, saved, totals, updateProject } = useApp()
  const { project, view, catalog } = state
  const co = state.settings.company

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === 'z' && !typing) {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      } else if (mod && e.key.toLowerCase() === 'y' && !typing) {
        e.preventDefault()
        redo()
      } else if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault()
        saved.save(project)
        toast(`#${project.quoteNo} kaydedildi`)
      } else if (mod && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        if (view !== 'quote') setView('quote')
        setTimeout(() => window.print(), 250)
      } else if (e.altKey && /^[1-5]$/.test(e.key)) {
        e.preventDefault()
        setView(TABS[Number(e.key) - 1].view)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo, saved, project, view, setView])

  return (
    <div className="flex h-full flex-col">
      <header className="no-print relative z-30 flex h-14 shrink-0 items-center gap-4 border-b glass-bar px-4">
        <div className="flex min-w-0 items-center gap-3">
          {co.logoDark || co.logo ? <LogoOnDark co={co} height={32} /> : <BrandMark />}
          <div className="leading-tight">
            <div className="flex items-center gap-2">
              {!(co.logoDark || co.logo) && <span className="text-[15px] font-extrabold tracking-[0.14em] text-white">{co.name}</span>}
              <span className="rounded-md border border-gold-500/30 bg-gold-500/10 px-1.5 py-px font-mono text-[10px] font-semibold text-gold-400">PenCAD 5</span>
            </div>
            <div className="truncate text-[11px] text-ink-400">
              <span className="font-mono text-ink-300">#{project.quoteNo}</span>
              {project.revision > 0 && <span className="font-mono text-ink-400"> · R{project.revision}</span>}
              <span className="mx-1.5 text-ink-600">/</span>
              <span>{project.projectName || 'İsimsiz proje'}</span>
            </div>
          </div>
        </div>

        <nav className="mx-auto hidden items-center gap-1 rounded-xl glass-panel p-1 lg:flex">
          {TABS.map((t) => (
            <button
              key={t.view}
              onClick={() => setView(t.view)}
              title={`${t.label} (Alt+${t.key})`}
              className={cx(
                'flex h-8 items-center gap-2 rounded-lg px-3 text-[12.5px] font-medium transition-all',
                view === t.view ? 'bg-white/[0.12] text-white shadow-[0_1px_0_rgba(255,255,255,0.06)_inset]' : 'text-ink-400 hover:bg-white/[0.07] hover:text-ink-100',
              )}
            >
              <t.icon size={15} className={view === t.view ? 'text-gold-400' : ''} />
              {t.label}
              {t.view === 'quote' && <span className="rounded-full bg-black/30 px-1.5 font-mono text-[10px] text-brand-300">{project.positions.length}</span>}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 lg:ml-0">
          <div className="hidden items-baseline gap-2 pr-2 xl:flex">
            <span className="text-[10px] uppercase tracking-wider text-ink-500">Genel toplam</span>
            <span className="font-mono text-[14px] font-semibold text-gold-400">{money(totals.grand, project.commercial.currency, catalog)}</span>
          </div>
          <Select<CurrencyCode>
            value={project.commercial.currency}
            onChange={(v) => updateProject((p) => ({ ...p, commercial: { ...p.commercial, currency: v } }))}
            options={(Object.keys(catalog.exchangeRates) as CurrencyCode[]).map((c) => ({ value: c, label: c }))}
            className="!h-8 !w-[84px] text-[12px]"
          />
          <IconBtn title="Geri al (Ctrl+Z)" onClick={undo} disabled={!state.past.length}>
            <Undo2 size={16} />
          </IconBtn>
          <IconBtn title="Yinele (Ctrl+Y)" onClick={redo} disabled={!state.future.length}>
            <Redo2 size={16} />
          </IconBtn>
          <IconBtn
            title="Projeyi kaydet (Ctrl+S)"
            onClick={() => {
              saved.save(project)
              toast(`#${project.quoteNo} kaydedildi`)
            }}
          >
            <Save size={16} />
          </IconBtn>
          <Button
            variant="gold"
            size="sm"
            className="ml-1 h-8"
            onClick={() => {
              if (view !== 'quote') setView('quote')
              setTimeout(() => window.print(), 250)
            }}
          >
            <Printer size={14} /> PDF / Yazdır
          </Button>
        </div>
      </header>

      <nav className="no-print flex gap-1 overflow-x-auto border-b glass-bar px-2 py-1.5 lg:hidden">
        {TABS.map((t) => (
          <button key={t.view} onClick={() => setView(t.view)} className={cx('flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px]', view === t.view ? 'bg-white/[0.12] text-white' : 'text-ink-400')}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </nav>

      <main className="min-h-0 flex-1">
        {view === 'studio' && <StudioView />}
        {view === 'quote' && <QuoteView />}
        {view === 'cost' && <CostView />}
        {view === 'catalog' && <CatalogView />}
        {view === 'projects' && <ProjectsView />}
      </main>
      <Toaster />
    </div>
  )
}
