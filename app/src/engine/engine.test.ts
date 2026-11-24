import { describe, expect, it } from 'vitest'
import { calcPosition, calcProject, discountForTarget } from './bom'
import { DEFAULT_CATALOG, DEFAULT_SETTINGS } from './catalog'
import { leaf, removeField, split, splitField, collectLeaves } from './fields'
import { parseDimension } from './format'
import { computeGeometry, distribute } from './geometry'
import { packBars } from './optimize'
import { DEFAULT_COMMERCIAL, importLegacyPositions, newPosition } from './project'
import type { Position } from './types'

const cat = DEFAULT_CATALOG
const com = { ...DEFAULT_COMMERCIAL }
const set = DEFAULT_SETTINGS

function pos(over: Partial<Position>): Position {
  return { ...newPosition('tiltturn'), ...over }
}
const metersOf = (p: Position, role: string) => calcPosition(p, cat, com, set).profileMeters[role as 'frame']

describe('Eski PenCAD 4.5 formülleriyle uyum (Adopen Atlantik 750)', () => {
  it('tek kanat çift açılım 900×1300', () => {
    const p = pos({ width: 900, height: 1300, root: leaf('sash', 'tiltturn', 'right') })
    const g = computeGeometry(p, cat)
    expect(g.panes).toHaveLength(1)
    expect(g.panes[0].w).toBe(710) // W − 190
    expect(g.panes[0].h).toBe(1110) // H − 190
    expect(metersOf(p, 'frame')).toBeCloseTo(2 * 0.906 + 2 * 1.306, 3)
    expect(metersOf(p, 'winSash')).toBeCloseTo(2 * 0.838 + 2 * 1.238, 3) // W − 68 + 6
  })

  it('sabit pencere 1000×1400 cam W−94', () => {
    const g = computeGeometry(pos({ width: 1000, height: 1400, root: leaf('fixed') }), cat)
    expect([g.panes[0].w, g.panes[0].h]).toEqual([906, 1306])
    expect(g.sashes).toHaveLength(0)
  })

  it('çift kanat HOK 1400×1800', () => {
    const p = pos({ width: 1400, height: 1800, root: leaf('pair', 'tiltturn', 'right') })
    const c = calcPosition(p, cat, com, set)
    expect(c.geo.sashes.map((s) => Math.round(s.rect.w))).toEqual([660, 660]) // (W − 80)/2
    expect(c.geo.panes.map((x) => [x.w, x.h])).toEqual([
      [541, 1610],
      [541, 1610],
    ]) // (W − 318)/2 × (H − 190)
    expect(c.geo.hoks[0].cutLength).toBe(1660) // H − 140
    expect(c.geo.sashes.filter((s) => s.active)).toHaveLength(1)
  })

  it('eşikli tek kanat kapı 1000×2200', () => {
    const p = pos({ width: 1000, height: 2200, threshold: 'alu20', root: leaf('door', 'turn', 'right') })
    const c = calcPosition(p, cat, com, set)
    expect(c.geo.threshold).toBe(true)
    expect(Math.round(c.geo.sashes[0].rect.h)).toBe(2152) // H − 48
    expect([c.geo.panes[0].w, c.geo.panes[0].h]).toEqual([750, 1972]) // W − 250, H − 228
    // 3 kenar PVC kasa + alüminyum eşik
    expect(c.profileMeters.frame).toBeCloseTo(1.006 + 2 * 2.206, 3)
    expect(c.cost.find((l) => l.code === 'ALU_THRESHOLD_20MM')?.quantity).toBeCloseTo(0.96, 3)
  })

  it('eşiksiz kapıda cam H−250', () => {
    const g = computeGeometry(pos({ width: 1000, height: 2200, threshold: 'none', root: leaf('door') }), cat)
    expect([g.panes[0].w, g.panes[0].h]).toEqual([750, 1950])
  })

  it('üstü vasistas bölünmüş 1000×1800 (üst 630)', () => {
    const p = pos({ width: 1000, height: 1800, root: split('h', [{ size: 630, field: leaf('sash', 'tilt') }, { size: null, field: leaf('fixed') }]) })
    const g = computeGeometry(p, cat)
    expect(g.mullions[0].cutLength).toBe(916) // W − 84
    expect(Math.round(g.sashes[0].rect.h)).toBe(562)
    expect([g.panes[0].w, g.panes[0].h]).toEqual([810, 440])
    expect([g.panes[1].w, g.panes[1].h]).toEqual([906, 1076])
  })

  it('perge sürme ve hebeschiebe cam ölçüleri', () => {
    const s = computeGeometry(pos({ width: 2000, height: 2000, series: 'PERGE_SURME' }), cat)
    expect(s.panes.map((p) => [p.w, p.h])).toEqual([
      [860, 1770],
      [860, 1770],
    ])
    const h = computeGeometry(pos({ width: 3200, height: 2400, series: 'AKDENIZ_HEBESCHIEBE' }), cat)
    expect(h.panes.map((p) => [p.w, p.h])).toEqual([
      [1506, 2270],
      [1362, 2126],
    ])
    expect(h.mullions[0].cutLength).toBe(2285)
  })

  it('2 m üstü pencere kanadı kapı kanat profiline geçer', () => {
    const c = calcPosition(pos({ width: 900, height: 2300, root: leaf('sash') }), cat, com, set)
    expect(c.profileMeters.doorSash).toBeGreaterThan(0)
    expect(c.profileMeters.winSash).toBe(0)
  })
})

describe('Fiyatlandırma', () => {
  it('marj %0 iken satış = malzeme toplamı; marj satış üzerinden', () => {
    const p = pos({ width: 900, height: 1300 })
    const c0 = calcPosition(p, cat, com, set)
    const expected = 4.424 * 11.31 + 4.152 * 12.67 + 0.7881 * 51.29 + 30.91
    expect(c0.priceUnit).toBeCloseTo(expected, 1)
    const c25 = calcPosition(p, cat, { ...com, marginPercent: 25 }, set)
    expect(c25.priceUnit).toBeCloseTo(expected / 0.75, 1)
  })

  it('renkli profil renkli fiyattan hesaplanır', () => {
    const w = calcPosition(pos({ color: 'WHITE' }), cat, com, set)
    const c = calcPosition(pos({ color: 'GOLDEN_OAK' }), cat, com, set)
    expect(c.materialUnit).toBeGreaterThan(w.materialUnit)
  })

  it('EXW teslimde navlun yok, CIF teslimde var', () => {
    const ps = [pos({ width: 3000, height: 2500, qty: 5 })]
    expect(calcProject(ps, cat, { ...com, incoterm: 'EXW' }, set).freight).toBe(0)
    expect(calcProject(ps, cat, { ...com, incoterm: 'CIF' }, set).freight).toBeGreaterThan(0)
  })

  it('hedef fiyattan iskonto', () => {
    const ps = [pos({ qty: 3 })]
    const t = calcProject(ps, cat, com, set)
    const pct = discountForTarget(t.grand * 0.9, t, com)
    const t2 = calcProject(ps, cat, { ...com, discountPercent: pct }, set)
    expect(t2.grand).toBeCloseTo(t.grand * 0.9, 0)
  })

  it('Uw makul aralıkta', () => {
    const c = calcPosition(pos({ series: 'PASIFIK_888', glass: 'SN4164TP146SN' }), cat, com, set)
    expect(c.uw).toBeGreaterThan(0.5)
    expect(c.uw).toBeLessThan(1.3)
  })
})

describe('Bölme ağacı', () => {
  it('böl ve birleştir', () => {
    const root = leaf('sash')
    const s = splitField(root, root.id, 'v', 3)
    expect(collectLeaves(s)).toHaveLength(3)
    const leaves = collectLeaves(s)
    const r = removeField(s, leaves[1].id)
    expect(collectLeaves(r)).toHaveLength(2)
    const r2 = removeField(r, collectLeaves(r)[1].id)
    expect(r2.kind).toBe('leaf')
  })

  it('dağıtım: sabit ölçü korunur', () => {
    expect(distribute(1800, [630, null]).sizes).toEqual([630, 1170])
    expect(distribute(3000, [null, null, null]).sizes).toEqual([1000, 1000, 1000])
  })

  it('3 bölmede 2 dikey ortakayıt üretir', () => {
    const p = pos({ width: 2100, height: 1400, root: split('v', [{ size: null, field: leaf('sash') }, { size: null, field: leaf('fixed') }, { size: null, field: leaf('sash') }]) })
    const g = computeGeometry(p, cat)
    expect(g.mullions).toHaveLength(2)
    expect(g.mullions[0].cutLength).toBe(1400 - 84)
    expect(g.panes).toHaveLength(3)
  })
})

describe('Kesim optimizasyonu', () => {
  it('testere payı boy sayısını etkiler', () => {
    const items = Array.from({ length: 6 }, () => ({ length: 2000, label: '', posIndex: 0, angle: '45/45' }))
    expect(packBars(items, 6000, { kerf: 4, barTrim: 0, reusableOffcut: 800 }).bars).toHaveLength(3)
    expect(packBars(items, 6000, { kerf: 0, barTrim: 0, reusableOffcut: 800 }).bars).toHaveLength(2)
  })
  it('boydan uzun parça ayrı raporlanır', () => {
    const r = packBars([{ length: 6100, label: '', posIndex: 0, angle: '' }], 6000, { kerf: 4, barTrim: 0, reusableOffcut: 800 })
    expect(r.oversize).toHaveLength(1)
    expect(r.bars).toHaveLength(0)
  })
})

describe('Ölçü girişi', () => {
  it.each([
    ['1250', 1250],
    ['125cm', 1250],
    ['1,25m', 1250],
    ['250', 250],
    ['49 1/4"', 1251],
    ['49.25in', 1251],
  ])('%s → %d mm', (s, v) => expect(parseDimension(s)).toBe(v))
  it('geçersiz giriş null', () => expect(parseDimension('abc')).toBeNull())
})

describe('Eski JSON içe aktarma', () => {
  it('Türkçe İ ile yazılmış seri anahtarını düzeltir', () => {
    const ps = importLegacyPositions([{ title: 'A', width: 900, height: 1300, type: 'TEK_CIFT_ACILIM', series: 'ATLANTİK_750', glass: 'YOK' }], cat)
    expect(ps[0].series).toBe('ATLANTIK_750')
    expect(ps[0].glass).toBe('DC4164SN')
    expect(() => calcPosition(ps[0], cat, com, set)).not.toThrow()
  })
  it('HEBESCHIEBE tipini seriye çevirir', () => {
    const ps = importLegacyPositions([{ type: 'HEBESCHIEBE_AKDENIZ', width: 3200, height: 2400 }], cat)
    expect(ps[0].series).toBe('AKDENIZ_HEBESCHIEBE')
  })
})
