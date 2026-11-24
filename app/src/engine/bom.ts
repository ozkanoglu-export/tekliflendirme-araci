/* ==========================================================================
   Malzeme reçetesi (BOM), maliyet ve Uw hesabı — geometriden türetilir.
   ========================================================================== */
import { computeGeometry, type PositionGeometry } from './geometry'
import type { AppSettings, Catalog, ColorTier, Commercial, Position, ProfileRole } from './types'

export interface CutPiece {
  role: ProfileRole
  code: string
  name: string
  length: number
  qty: number
  angle: '45/45' | '90/90'
  label: string
}

export interface GlassLine {
  key: string
  name: string
  w: number
  h: number
  qty: number
  area: number
  panel: boolean
}

export interface CostLine {
  group: 'profile' | 'glass' | 'hardware' | 'extra'
  label: string
  code: string
  quantity: number
  unit: 'Mt' | 'm²' | 'Adet'
  unitPrice: number
  total: number
}

export interface PositionCalc {
  pos: Position
  geo: PositionGeometry
  tier: ColorTier
  pieces: CutPiece[]
  glass: GlassLine[]
  cost: CostLine[]
  /** EUR — 1 adet malzeme maliyeti */
  materialUnit: number
  /** EUR — 1 adet işçilik/genel gider */
  laborUnit: number
  /** EUR — 1 adet satış fiyatı (marj dahil, iskonto hariç), 2 haneye yuvarlı */
  priceUnit: number
  priceLine: number
  grossArea: number
  glassArea: number
  uw: number
  profileMeters: Record<ProfileRole, number>
  warnings: string[]
}

const round2 = (n: number) => Math.round(n * 100) / 100

export function calcPosition(pos: Position, catalog: Catalog, commercial: Commercial, settings: AppSettings): PositionCalc {
  const geo = computeGeometry(pos, catalog)
  const series = catalog.series[pos.series] ?? Object.values(catalog.series)[0]
  const color = catalog.colors[pos.color] ?? catalog.colors.WHITE
  const tier: ColorTier = color.tier
  const d = series.deductions
  const weld = d.weldAllowance
  const qty = Math.max(1, Math.round(pos.qty) || 1)
  const pieces: CutPiece[] = []
  const prof = (role: ProfileRole) => series.profiles[role]

  /* --- Kasa --- */
  const fr = prof('frame')
  pieces.push({ role: 'frame', code: fr.code, name: fr.name, length: geo.W + weld, qty: geo.threshold ? 1 : 2, angle: '45/45', label: geo.threshold ? 'Kasa üst' : 'Kasa üst/alt' })
  pieces.push({ role: 'frame', code: fr.code, name: fr.name, length: geo.H + weld, qty: 2, angle: '45/45', label: 'Kasa yan' })

  /* --- Ortakayıt --- */
  for (const m of geo.mullions) {
    const p = prof('mullion')
    pieces.push({ role: 'mullion', code: p.code, name: p.name, length: m.cutLength, qty: 1, angle: '90/90', label: m.dir === 'v' ? 'Dikey ortakayıt' : 'Yatay kayıt' })
  }

  /* --- Kanatlar --- */
  for (const s of geo.sashes) {
    const p = prof(s.role)
    const add = s.weld ? weld : 0
    const label = s.door ? 'Kapı kanadı' : s.opening === 'slide' || s.opening === 'liftslide' ? 'Sürme kanat' : 'Pencere kanadı'
    const angle = '45/45' as const
    pieces.push({ role: s.role, code: p.code, name: p.name, length: Math.round(s.rect.w + add), qty: 2, angle, label: `${label} yatay` })
    pieces.push({ role: s.role, code: p.code, name: p.name, length: Math.round(s.rect.h + add), qty: 2, angle, label: `${label} dikey` })
  }

  /* --- HOK ara profil --- */
  for (const h of geo.hoks) {
    const p = prof('hok')
    pieces.push({ role: 'hok', code: p.code, name: p.name, length: h.cutLength, qty: 1, angle: '90/90', label: 'HOK ara profil' })
  }

  const profileMeters: Record<ProfileRole, number> = { frame: 0, winSash: 0, doorSash: 0, mullion: 0, hok: 0 }
  for (const p of pieces) profileMeters[p.role] += (p.length * p.qty) / 1000

  /* --- Camlar --- */
  const glassMap = new Map<string, GlassLine>()
  for (const pane of geo.panes) {
    const g = catalog.glasses[pane.glassKey] ?? catalog.glasses[pos.glass] ?? Object.values(catalog.glasses)[0]
    const k = `${g.key}|${pane.w}|${pane.h}`
    const area = Math.max(0, (pane.w * pane.h) / 1e6)
    const ex = glassMap.get(k)
    if (ex) {
      ex.qty += 1
      ex.area += area
    } else glassMap.set(k, { key: g.key, name: g.name, w: pane.w, h: pane.h, qty: 1, area, panel: !!g.panel })
  }
  const glass = [...glassMap.values()]
  const glassArea = glass.reduce((a, g) => a + g.area, 0)

  /* --- Maliyet satırları --- */
  const cost: CostLine[] = []
  const waste = 1 + Math.max(0, commercial.wastePercent) / 100
  for (const role of Object.keys(profileMeters) as ProfileRole[]) {
    const m = profileMeters[role]
    if (m <= 0) continue
    const p = prof(role)
    const unitPrice = p[tier]
    cost.push({ group: 'profile', label: p.name, code: p.code, quantity: m * waste, unit: 'Mt', unitPrice, total: m * waste * unitPrice })
  }
  for (const g of glass) {
    const item = catalog.glasses[g.key]
    cost.push({ group: 'glass', label: `${g.name} ${g.w}×${g.h}`, code: g.key, quantity: g.area, unit: 'm²', unitPrice: item.price, total: g.area * item.price })
  }
  const hwCount = new Map<string, number>()
  for (const l of geo.leaves) if (l.hardwareKey) hwCount.set(l.hardwareKey, (hwCount.get(l.hardwareKey) ?? 0) + 1)
  for (const [k, n] of hwCount) {
    const hw = catalog.hardware[k]
    if (!hw) continue
    cost.push({ group: 'hardware', label: hw.name, code: k, quantity: n, unit: 'Adet', unitPrice: hw.price, total: n * hw.price })
  }

  const perimeterM = (2 * geo.W + 2 * geo.H) / 1000
  const ex = catalog.extras
  if (pos.shutter.enabled && ex.SHUTTER_MONO_195) {
    const a = (geo.W * geo.H) / 1e6
    cost.push({ group: 'extra', label: ex.SHUTTER_MONO_195.name, code: 'SHUTTER_MONO_195', quantity: a, unit: 'm²', unitPrice: ex.SHUTTER_MONO_195.price, total: a * ex.SHUTTER_MONO_195.price })
  }
  if (geo.threshold && ex.ALU_THRESHOLD_20MM) {
    const m = (geo.W - d.thresholdLengthDeduct) / 1000
    cost.push({ group: 'extra', label: ex.ALU_THRESHOLD_20MM.name, code: 'ALU_THRESHOLD_20MM', quantity: m, unit: 'Mt', unitPrice: ex.ALU_THRESHOLD_20MM.price, total: m * ex.ALU_THRESHOLD_20MM.price })
  }
  if (pos.muntin && ex.GRID_MUNTIN) {
    const m = geo.panes.reduce((a, p) => a + (2 * p.w + 2 * p.h) / 1000, 0)
    cost.push({ group: 'extra', label: ex.GRID_MUNTIN.name, code: 'GRID_MUNTIN', quantity: m, unit: 'Mt', unitPrice: ex.GRID_MUNTIN.price, total: m * ex.GRID_MUNTIN.price })
  }
  if (pos.frameExt && ex.FRAME_EXT_35X70) {
    const up = tier === 'colored' ? (ex.FRAME_EXT_35X70.colored ?? ex.FRAME_EXT_35X70.price) : ex.FRAME_EXT_35X70.price
    cost.push({ group: 'extra', label: ex.FRAME_EXT_35X70.name, code: 'FRAME_EXT_35X70', quantity: perimeterM, unit: 'Mt', unitPrice: up, total: perimeterM * up })
  }
  if (pos.flyscreen !== 'NONE') {
    const key = pos.flyscreen === 'SABIT' ? 'FLYSCREEN_SABIT' : pos.flyscreen === 'MENTESELI' ? 'FLYSCREEN_MENTESELI' : 'FLYSCREEN_PILELI'
    const it = ex[key]
    if (it) cost.push({ group: 'extra', label: it.name, code: key, quantity: perimeterM, unit: 'Mt', unitPrice: it.price, total: perimeterM * it.price })
  }

  const materialUnit = cost.reduce((a, c) => a + c.total, 0)
  const grossArea = (geo.W * geo.totalH) / 1e6
  const laborUnit = Math.max(0, commercial.laborPerUnit) + Math.max(0, commercial.laborPerM2) * grossArea
  const margin = Math.min(90, Math.max(0, commercial.marginPercent)) / 100
  const priceUnit = round2((materialUnit + laborUnit) / (1 - margin))

  /* --- Uw (EN ISO 10077-1 basitleştirilmiş) --- */
  const frameArea = (geo.W * geo.H) / 1e6
  let agUg = 0
  let ag = 0
  let lgPsi = 0
  for (const p of geo.panes) {
    const g = catalog.glasses[p.glassKey] ?? catalog.glasses[pos.glass]
    const a = Math.max(0, (p.w * p.h) / 1e6)
    ag += a
    agUg += a * (g?.ug ?? 1)
    if (!g?.panel) lgPsi += ((2 * p.w + 2 * p.h) / 1000) * settings.psiGlass
  }
  const af = Math.max(0.05, frameArea - ag)
  const uw = Math.round(((agUg + af * series.uf + lgPsi) / Math.max(0.1, frameArea)) * 100) / 100

  return {
    pos,
    geo,
    tier,
    pieces,
    glass,
    cost,
    materialUnit,
    laborUnit,
    priceUnit,
    priceLine: round2(priceUnit * qty),
    grossArea,
    glassArea,
    uw,
    profileMeters,
    warnings: geo.warnings,
  }
}

/* ==========================================================================
   Proje toplamları — ihracat ambalaj, palet, navlun, iskonto, KDV
   ========================================================================== */

/** Ana taşıma bedeli satıcıya ait olan teslim şekilleri */
export const FREIGHT_INCLUDED: Record<string, boolean> = { EXW: false, FCA: false, FOB: false, CFR: true, CIF: true, DAP: true, DDP: true }

export interface ProjectTotals {
  lines: PositionCalc[]
  products: number
  material: number
  labor: number
  totalArea: number
  totalUnits: number
  packaging: number
  pallet: number
  freight: number
  subtotal: number
  discount: number
  net: number
  vat: number
  grand: number
  /** Brüt kâr (EUR) = net − malzeme − işçilik − ambalaj/palet/navlun maliyeti varsayımı */
  grossProfit: number
}

export function calcProject(positions: Position[], catalog: Catalog, commercial: Commercial, settings: AppSettings): ProjectTotals {
  const lines = positions.map((p) => calcPosition(p, catalog, commercial, settings))
  let products = 0
  let material = 0
  let labor = 0
  let totalArea = 0
  let totalUnits = 0
  for (const l of lines) {
    const q = Math.max(1, Math.round(l.pos.qty) || 1)
    products += l.priceLine
    material += l.materialUnit * q
    labor += l.laborUnit * q
    totalArea += l.grossArea * q
    totalUnits += q
  }
  const r = settings.exportRules
  const packaging = commercial.packagingOverride ?? round2(totalArea * r.packagingPerM2)
  let pallet = totalArea > 0 ? r.palletBase : 0
  if (totalArea > r.palletBaseArea) pallet += Math.ceil((totalArea - r.palletBaseArea) / r.palletStepArea) * r.palletStepPrice
  if (commercial.palletOverride !== null) pallet = commercial.palletOverride
  let freight = FREIGHT_INCLUDED[commercial.incoterm] ? Math.ceil(totalArea / r.freightBlockArea) * r.freightPerBlock : 0
  if (commercial.freightOverride !== null) freight = commercial.freightOverride

  const subtotal = round2(products + packaging + pallet + freight)
  const discount = round2((subtotal * Math.min(100, Math.max(0, commercial.discountPercent))) / 100)
  const net = round2(subtotal - discount)
  const vat = round2((net * Math.max(0, commercial.vatPercent)) / 100)
  const grand = round2(net + vat)
  return {
    lines,
    products: round2(products),
    material,
    labor,
    totalArea,
    totalUnits,
    packaging,
    pallet,
    freight,
    subtotal,
    discount,
    net,
    vat,
    grand,
    grossProfit: net - material - labor - packaging - pallet - freight,
  }
}

/** Hedef genel toplama ulaşmak için gereken iskonto yüzdesi (KDV dahil hedef) */
export function discountForTarget(target: number, totals: ProjectTotals, commercial: Commercial): number {
  const vatF = 1 + Math.max(0, commercial.vatPercent) / 100
  const netTarget = target / vatF
  if (totals.subtotal <= 0) return 0
  const pct = ((totals.subtotal - netTarget) / totals.subtotal) * 100
  return Math.round(Math.min(100, Math.max(0, pct)) * 100) / 100
}
