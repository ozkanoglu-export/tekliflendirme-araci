/* ==========================================================================
   1D profil kesim optimizasyonu — First-Fit Decreasing (FFD) + boy içi
   iyileştirme. Her profil kodu + renk için ayrı çalışır.
   ========================================================================== */
import type { PositionCalc } from './bom'
import type { Catalog, CutSettings } from './types'

export interface CutItem {
  length: number
  label: string
  posIndex: number
  angle: string
}

export interface Bar {
  length: number
  cuts: CutItem[]
  used: number
  waste: number
}

export interface ProfileOptimization {
  code: string
  name: string
  colorName: string
  barLength: number
  pricePerMeter: number
  bars: Bar[]
  netMeters: number
  grossMeters: number
  wastePercent: number
  reusableOffcuts: number[]
  oversize: CutItem[]
}

export function packBars(items: CutItem[], barLength: number, s: CutSettings): { bars: Bar[]; oversize: CutItem[] } {
  const usable = barLength - 2 * s.barTrim
  const sorted = [...items].sort((a, b) => b.length - a.length)
  const bars: Bar[] = []
  const oversize: CutItem[] = []
  for (const it of sorted) {
    if (it.length > usable) {
      oversize.push(it)
      continue
    }
    // Best-fit: parçanın sığdığı ve en az boşluk bırakan boy
    let best: Bar | null = null
    let bestRest = Infinity
    for (const b of bars) {
      const need = it.length + (b.cuts.length > 0 ? s.kerf : 0)
      const rest = usable - b.used - need
      if (rest >= 0 && rest < bestRest) {
        best = b
        bestRest = rest
      }
    }
    if (!best) {
      best = { length: barLength, cuts: [], used: 0, waste: 0 }
      bars.push(best)
    }
    best.used += it.length + (best.cuts.length > 0 ? s.kerf : 0)
    best.cuts.push(it)
  }
  for (const b of bars) b.waste = barLength - b.used
  bars.sort((a, b) => a.waste - b.waste)
  return { bars, oversize }
}

export function optimizeProject(lines: PositionCalc[], catalog: Catalog, s: CutSettings): ProfileOptimization[] {
  const groups = new Map<string, { code: string; name: string; colorKey: string; role: string; series: string; items: CutItem[] }>()
  lines.forEach((l, posIndex) => {
    const q = Math.max(1, Math.round(l.pos.qty) || 1)
    for (const p of l.pieces) {
      const key = `${p.code}|${l.pos.color}`
      let g = groups.get(key)
      if (!g) {
        g = { code: p.code, name: p.name, colorKey: l.pos.color, role: p.role, series: l.pos.series, items: [] }
        groups.set(key, g)
      }
      for (let i = 0; i < p.qty * q; i++) g.items.push({ length: p.length, label: p.label, posIndex, angle: p.angle })
    }
  })

  const out: ProfileOptimization[] = []
  for (const g of groups.values()) {
    const series = catalog.series[g.series]
    const prof = series ? Object.values(series.profiles).find((p) => p.code === g.code) : undefined
    const color = catalog.colors[g.colorKey]
    const barLength = prof?.barLength ?? 6000
    const { bars, oversize } = packBars(g.items, barLength, s)
    const netMeters = g.items.reduce((a, i) => a + i.length, 0) / 1000
    const grossMeters = (bars.length * barLength) / 1000
    out.push({
      code: g.code,
      name: g.name,
      colorName: color?.name ?? g.colorKey,
      barLength,
      pricePerMeter: prof ? prof[color?.tier ?? 'white'] : 0,
      bars,
      netMeters,
      grossMeters,
      wastePercent: grossMeters > 0 ? ((grossMeters - netMeters) / grossMeters) * 100 : 0,
      reusableOffcuts: bars.map((b) => b.waste).filter((w) => w >= s.reusableOffcut),
      oversize,
    })
  }
  return out.sort((a, b) => a.code.localeCompare(b.code))
}
