import { useState } from 'react'
import { Download, FilePlus2, FileUp, FolderOpen, Save, Trash2, Sparkles, ClipboardCopy } from 'lucide-react'
import { useApp } from '../store/store'
import { Button, Panel, TextArea, cx, toast } from '../ui/kit'
import { importLegacyPositions, newProject } from '../engine/project'
import { formatDate, money } from '../engine/format'
import { calcProject } from '../engine/bom'
import type { Project } from '../engine/types'

export function ProjectsView() {
  const { state, saved, loadProject, updateProject, setView } = useApp()
  const { project, catalog, settings } = state
  const [list, setList] = useState<Project[]>(() => saved.list())
  const [json, setJson] = useState('')
  const refresh = () => setList(saved.list())

  const nextNo = () => {
    const nums = [project, ...list].map((p) => parseInt(p.quoteNo)).filter((n) => Number.isFinite(n))
    return (nums.length ? Math.max(...nums) : 1860) + 1
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-5 p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-semibold text-white">Projeler & Teklif Arşivi</h1>
            <p className="text-[13px] text-ink-400">Teklifler bu bilgisayarın tarayıcısında saklanır. Yedek için JSON olarak dışa aktarın.</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                saved.save(project)
                refresh()
                toast(`#${project.quoteNo} arşive kaydedildi`)
              }}
            >
              <Save size={14} /> Mevcut teklifi kaydet
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                saved.save(project)
                const p = newProject(nextNo())
                p.positions = p.positions.slice(1, 2)
                p.projectName = ''
                p.customer = { name: '', company: '', address: '', country: '', contact: '', phone: '', email: '' }
                loadProject(p)
                refresh()
                setView('studio')
                toast(`Yeni teklif #${p.quoteNo} açıldı`)
              }}
            >
              <FilePlus2 size={14} /> Yeni teklif
            </Button>
          </div>
        </div>

        <Panel title="Kayıtlı teklifler" icon={<FolderOpen size={14} />} bodyClassName="p-0">
          {list.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-ink-500">Henüz kayıtlı teklif yok. Ctrl+S ile mevcut teklifi kaydedebilirsiniz.</div>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-ink-800 text-left text-[10.5px] uppercase tracking-wider text-ink-500">
                  <th className="px-4 py-2.5">No</th>
                  <th className="py-2.5">Müşteri / Proje</th>
                  <th className="py-2.5">Tarih</th>
                  <th className="py-2.5 text-right">Poz</th>
                  <th className="py-2.5 text-right">Tutar</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {list.map((p) => {
                  const tot = calcProject(p.positions, catalog, p.commercial, settings)
                  const current = p.id === project.id
                  return (
                    <tr key={p.id} className={cx('border-b border-ink-800/60', current ? 'bg-gold-500/5' : 'hover:bg-ink-900')}>
                      <td className="px-4 py-2.5 font-mono font-semibold text-gold-400">
                        #{p.quoteNo}
                        {p.revision > 0 && <span className="text-ink-500"> R{p.revision}</span>}
                      </td>
                      <td className="py-2.5">
                        <div className="text-ink-100">{p.customer.company || '—'}</div>
                        <div className="text-[11px] text-ink-500">{p.projectName}</div>
                      </td>
                      <td className="py-2.5 text-ink-300">{formatDate(p.date, 'TR')}</td>
                      <td className="py-2.5 text-right font-mono">{p.positions.length}</td>
                      <td className="py-2.5 text-right font-mono text-white">{money(tot.grand, p.commercial.currency, catalog)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex justify-end gap-1.5">
                          {current ? (
                            <span className="px-2 text-[11px] text-gold-400">açık</span>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => {
                                saved.save(project)
                                loadProject(p)
                                refresh()
                                setView('studio')
                                toast(`#${p.quoteNo} açıldı`)
                              }}
                            >
                              Aç
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Revizyon olarak kopyala"
                            onClick={() => {
                              const copy: Project = { ...JSON.parse(JSON.stringify(p)), id: `q${Date.now().toString(36)}`, revision: p.revision + 1 }
                              saved.save(project)
                              loadProject(copy)
                              saved.save(copy)
                              refresh()
                              setView('studio')
                              toast(`#${p.quoteNo} R${copy.revision} revizyonu açıldı`)
                            }}
                          >
                            +Rev
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (!confirm(`#${p.quoteNo} arşivden silinsin mi?`)) return
                              saved.remove(p.id)
                              refresh()
                            }}
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Panel>

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="JSON içe aktar (Gemini / eski PenCAD)" icon={<Sparkles size={14} />}>
            <p className="mb-2 text-[12px] leading-relaxed text-ink-400">
              Yapay zekâya el çizimi veya ölçü listesini verip aşağıdaki formatta JSON isteyin, buraya yapıştırın. Eski PenCAD 4.5 poz tipleri (TEK_CIFT_ACILIM, HOK_CIFTKANAT, KAPI_TEK_SAG…) otomatik çevrilir.
            </p>
            <TextArea
              value={json}
              onChange={setJson}
              rows={9}
              className="font-mono text-[11.5px]"
              placeholder={`[\n  { "title": "Salon", "qty": 2, "width": 1600, "height": 2100,\n    "type": "HOK_CIFTKANAT", "series": "PASIFIK_888",\n    "color": "GOLDEN_OAK", "glass": "SN4164TP146SN" }\n]`}
            />
            <div className="mt-3 flex gap-2">
              <Button
                variant="primary"
                onClick={() => {
                  try {
                    const ps = importLegacyPositions(JSON.parse(json), catalog)
                    updateProject((p) => ({ ...p, positions: [...p.positions, ...ps] }))
                    toast(`${ps.length} poz eklendi`)
                    setJson('')
                    setView('studio')
                  } catch (e) {
                    toast(`JSON okunamadı: ${(e as Error).message}`, 'err')
                  }
                }}
              >
                <FileUp size={14} /> Pozları ekle
              </Button>
              <Button
                onClick={() => {
                  try {
                    const ps = importLegacyPositions(JSON.parse(json), catalog)
                    updateProject((p) => ({ ...p, positions: ps }))
                    toast(`Pozlar değiştirildi (${ps.length})`)
                    setJson('')
                    setView('studio')
                  } catch (e) {
                    toast(`JSON okunamadı: ${(e as Error).message}`, 'err')
                  }
                }}
              >
                Mevcutların yerine koy
              </Button>
            </div>
          </Panel>

          <Panel title="Yedekleme">
            <div className="space-y-3 text-[12.5px] text-ink-300">
              <p>Mevcut teklifi ya da tüm arşivi dosya olarak indirin; başka bilgisayarda "Dosyadan yükle" ile açın.</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    const url = URL.createObjectURL(new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }))
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `Teklif_${project.quoteNo}.json`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                >
                  <Download size={14} /> Teklifi indir
                </Button>
                <Button
                  onClick={() => {
                    const url = URL.createObjectURL(new Blob([JSON.stringify({ projects: [project, ...list.filter((x) => x.id !== project.id)], catalog, settings }, null, 2)], { type: 'application/json' }))
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `PenCAD_Yedek_${new Date().toISOString().slice(0, 10)}.json`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                >
                  <Download size={14} /> Tüm arşiv + katalog
                </Button>
                <Button
                  onClick={() => {
                    navigator.clipboard?.writeText(JSON.stringify(project.positions, null, 2))
                    toast('Pozlar JSON olarak panoya kopyalandı', 'info')
                  }}
                >
                  <ClipboardCopy size={14} /> Pozları kopyala
                </Button>
                <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-ink-700 bg-ink-800 px-3.5 text-[13px] font-medium text-ink-100 hover:bg-ink-700">
                  <FileUp size={14} /> Dosyadan yükle
                  <input
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0]
                      if (!f) return
                      try {
                        const data = JSON.parse(await f.text())
                        if (data && Array.isArray(data.projects)) {
                          for (const p of data.projects as Project[]) saved.save(p)
                          refresh()
                          toast(`${data.projects.length} teklif arşive yüklendi`)
                        } else if (data && data.positions && data.quoteNo) {
                          saved.save(project)
                          loadProject(data as Project)
                          refresh()
                          toast(`#${data.quoteNo} açıldı`)
                        } else throw new Error('tanınmayan dosya')
                      } catch (err) {
                        toast(`Dosya okunamadı: ${(err as Error).message}`, 'err')
                      }
                      e.target.value = ''
                    }}
                  />
                </label>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
