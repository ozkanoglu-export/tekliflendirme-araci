import { useMemo } from 'react'
import { X } from 'lucide-react'
import { WindowDrawing } from '../../drawing/WindowDrawing'
import { TEMPLATES, type TemplateKey } from '../../engine/fields'
import { computeGeometry } from '../../engine/geometry'
import { newPosition } from '../../engine/project'
import type { Catalog } from '../../engine/types'
import { cx } from '../../ui/kit'

export type GalleryPick = { kind: 'template'; key: TemplateKey } | { kind: 'series'; series: string }

export function TemplateGallery({ catalog, mode, onPick, onClose }: { catalog: Catalog; mode: 'new' | 'apply'; onPick: (p: GalleryPick) => void; onClose: () => void }) {
  const items = useMemo(
    () =>
      TEMPLATES.map((t) => {
        const p = newPosition(t.key)
        return { t, p, g: computeGeometry(p, catalog) }
      }),
    [catalog],
  )
  const slideSeries = Object.values(catalog.series).filter((s) => s.kind !== 'casement')
  const slideItems = useMemo(
    () =>
      slideSeries.map((s) => {
        const p = newPosition('fixed', { series: s.key, width: s.kind === 'liftslide' ? 3200 : 2000, height: s.kind === 'liftslide' ? 2400 : 2000 })
        return { s, p, g: computeGeometry(p, catalog) }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [catalog],
  )

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm" onClick={onClose}>
      <div className="fade-up max-h-full w-full max-w-4xl overflow-auto rounded-2xl border border-ink-700 bg-ink-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-ink-800 px-5 py-4">
          <div>
            <h2 className="text-[16px] font-semibold text-white">{mode === 'new' ? 'Yeni poz — şablon seçin' : 'Pozun düzenini değiştir'}</h2>
            <p className="text-[12px] text-ink-400">{mode === 'new' ? 'Şablonla başlayın; sonra tuval üzerinde bölüp kanat tiplerini değiştirebilirsiniz.' : 'Ölçüler korunur, bölme ve kanat düzeni şablona göre yenilenir.'}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-ink-400 hover:bg-ink-800 hover:text-white">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">Kanatlı sistemler · Atlantik / Pasifik</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {items.map(({ t, p, g }) => (
              <button key={t.key} onClick={() => onPick({ kind: 'template', key: t.key })} className="group rounded-xl border border-ink-700 bg-ink-950/60 p-3 text-left transition hover:border-brand-400 hover:bg-ink-850">
                <div className="flex h-28 items-center justify-center">
                  <WindowDrawing pos={p} geo={g} catalog={catalog} variant="thumb" className="h-full w-full" />
                </div>
                <div className="mt-2 text-[12.5px] font-semibold text-ink-100 group-hover:text-white">{t.label}</div>
                <div className="text-[11px] text-ink-500">{t.hint}</div>
              </button>
            ))}
          </div>
          {mode === 'new' && slideItems.length > 0 && (
            <>
              <h3 className="mb-3 mt-6 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">Sürme sistemler</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {slideItems.map(({ s, p, g }) => (
                  <button key={s.key} onClick={() => onPick({ kind: 'series', series: s.key })} className={cx('group rounded-xl border border-ink-700 bg-ink-950/60 p-3 text-left transition hover:border-brand-400 hover:bg-ink-850')}>
                    <div className="flex h-28 items-center justify-center">
                      <WindowDrawing pos={p} geo={g} catalog={catalog} variant="thumb" className="h-full w-full" />
                    </div>
                    <div className="mt-2 text-[12.5px] font-semibold text-ink-100">{s.name}</div>
                    <div className="text-[11px] text-ink-500">{s.kind === 'liftslide' ? 'Kaldır-sür, 1 sabit + 1 hareketli' : 'Çift ray, 2 hareketli kanat'}</div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
