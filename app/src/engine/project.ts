import { addDays, todayISO } from './format'
import { cloneTree, leaf, split, uid, TEMPLATES, type TemplateKey } from './fields'
import type { Catalog, Commercial, Field, LeafFill, Position, Project } from './types'

export const DEFAULT_COMMERCIAL: Commercial = {
  currency: 'EUR',
  language: 'TR',
  incoterm: 'EXW',
  incotermPlace: 'Çankırı, Türkiye',
  discountPercent: 0,
  marginPercent: 0,
  wastePercent: 0,
  laborPerUnit: 0,
  laborPerM2: 0,
  vatPercent: 0,
  validityDays: 30,
  showBank: true,
  freightOverride: null,
  palletOverride: null,
  packagingOverride: null,
}

export function newPosition(template: TemplateKey = 'tiltturn', base?: Partial<Position>): Position {
  const t = TEMPLATES.find((x) => x.key === template) ?? TEMPLATES[0]
  const width = base?.width ?? t.w
  const height = base?.height ?? t.h
  return {
    id: uid('p'),
    title: t.label === 'Sabit' ? 'Sabit Pencere' : t.label,
    qty: 1,
    width,
    height,
    series: base?.series ?? 'ATLANTIK_750',
    color: base?.color ?? 'WHITE',
    glass: base?.glass ?? 'DC4164SN',
    root: t.build(width, height),
    activeSide: 'right',
    shutter: { enabled: false, mode: 'subtract' },
    threshold: template === 'door' || template === 'doorPair' || template === 'balcony' ? 'alu20' : 'none',
    flyscreen: 'NONE',
    muntin: false,
    frameExt: false,
    note: '',
  }
}

export function clonePosition(p: Position): Position {
  return { ...JSON.parse(JSON.stringify(p)), id: uid('p'), root: cloneTree(p.root), title: `${p.title} (kopya)` }
}

export function newProject(seq = 1861): Project {
  const date = todayISO()
  const p1 = newPosition('hok', { width: 1400, height: 1800, series: 'PASIFIK_888', color: 'GOLDEN_OAK', glass: 'SN4164TP146SN' })
  p1.title = 'Salon Çift Kanat Fransız Pencere'
  p1.shutter = { enabled: true, mode: 'subtract' }
  p1.flyscreen = 'PILELI_YATAY'
  p1.muntin = true
  const p2 = newPosition('tiltturn', { width: 900, height: 1300 })
  p2.title = 'Mutfak Penceresi'
  p2.qty = 2
  p2.flyscreen = 'SABIT'
  const p3 = newPosition('door', { width: 1000, height: 2200, series: 'PASIFIK_888', color: 'ANTHRACITE', glass: 'SN4124LM' })
  p3.title = 'Veranda Çıkış Kapısı'
  p3.frameExt = true
  return {
    id: uid('q'),
    quoteNo: String(seq),
    date,
    revision: 0,
    projectName: 'Villa Projesi',
    drawnBy: 'Tarık Buğra',
    customer: { name: '', company: 'İhracat Müşterisi', address: '', country: '', contact: '', phone: '', email: '' },
    commercial: { ...DEFAULT_COMMERCIAL },
    positions: [p1, p2, p3],
    updatedAt: new Date().toISOString(),
  }
}

export function validUntil(p: Project): string {
  return addDays(p.date, p.commercial.validityDays)
}

/* ==========================================================================
   Eski PenCAD 4.5 / Gemini JSON formatından içe aktarma
   [{ title, qty, width, height, type, series, color, glass, hasShutter, ... }]
   ========================================================================== */
const LEGACY_TYPES: Record<string, () => Field> = {
  SABIT: () => leaf('fixed'),
  TEK_SOL: () => leaf('sash', 'turn', 'left'),
  TEK_SAG: () => leaf('sash', 'turn', 'right'),
  TEK_CIFT_ACILIM: () => leaf('sash', 'tiltturn', 'right'),
  HOK_CIFTKANAT: () => leaf('pair', 'tiltturn', 'right'),
  KAPI_TEK_SOL: () => leaf('door', 'turn', 'left'),
  KAPI_TEK_SAG: () => leaf('door', 'turn', 'right'),
  KAPI_CIFT: () => leaf('doorPair', 'turn', 'right'),
  KAPI_DEKORATIF: () => leaf('door', 'turn', 'right', { glass: 'PNL04101S', hardware: 'BINA_GIRIS_3KANCALI' }),
  SURME_PERGE: () => leaf('sash'),
  HEBESCHIEBE_AKDENIZ: () => leaf('sash'),
}

const LEGACY_SERIES: Record<string, string> = {
  'ATLANTİK_750': 'ATLANTIK_750',
  ATLANTIK_750: 'ATLANTIK_750',
  PASIFIK_888: 'PASIFIK_888',
  PERGE_SURME: 'PERGE_SURME',
  AKDENIZ_HEBESCHIEBE: 'AKDENIZ_HEBESCHIEBE',
}

export function importLegacyPositions(raw: unknown, catalog: Catalog): Position[] {
  const arr = Array.isArray(raw) ? raw : raw && typeof raw === 'object' && Array.isArray((raw as { positions?: unknown }).positions) ? (raw as { positions: unknown[] }).positions : null
  if (!arr) throw new Error('JSON bir poz dizisi ya da { positions: [...] } olmalı')
  return arr.map((r, i) => {
    const o = (r ?? {}) as Record<string, unknown>
    // Yeni formatta root varsa doğrudan kabul et
    if (o.root && typeof o.root === 'object') {
      const p = o as unknown as Position
      return { ...newPosition(), ...p, id: uid('p'), root: cloneTree(p.root) }
    }
    const type = String(o.type ?? 'TEK_CIFT_ACILIM')
    let width = Number(o.width) || 1000
    let height = Number(o.height) || 1400
    let series = LEGACY_SERIES[String(o.series ?? '')] ?? String(o.series ?? 'ATLANTIK_750')
    if (type === 'SURME_PERGE') series = 'PERGE_SURME'
    if (type === 'HEBESCHIEBE_AKDENIZ') series = 'AKDENIZ_HEBESCHIEBE'
    if (!catalog.series[series]) series = 'ATLANTIK_750'
    let root: Field
    if (type === 'YATAY_BOLUNMUS') root = split('h', [{ size: Math.round(height * 0.35), field: leaf('sash', 'tilt') }, { size: null, field: leaf('fixed') }])
    else root = (LEGACY_TYPES[type] ?? LEGACY_TYPES.TEK_CIFT_ACILIM)()
    const color = catalog.colors[String(o.color)] ? String(o.color) : 'WHITE'
    const glass = catalog.glasses[String(o.glass)] ? String(o.glass) : 'DC4164SN'
    const isDoor = type.startsWith('KAPI_')
    width = Math.max(300, width)
    height = Math.max(300, height)
    const fill: LeafFill | undefined = root.kind === 'leaf' ? root.fill : undefined
    return {
      id: uid('p'),
      title: String(o.title ?? `Poz ${i + 1}`),
      qty: Math.max(1, Number(o.qty) || 1),
      width,
      height,
      series,
      color,
      glass,
      root,
      activeSide: 'right',
      shutter: { enabled: !!o.hasShutter, mode: o.shutterDeduct === 'add' ? 'add' : 'subtract' },
      threshold: isDoor && (o.threshold === 'ALU_20MM' || fill === 'door') && o.threshold !== 'PVC_4KENAR' ? 'alu20' : 'none',
      flyscreen: (['SABIT', 'MENTESELI', 'PILELI_YATAY', 'PILELI_DIKEY'].includes(String(o.flyscreen)) ? o.flyscreen : 'NONE') as Position['flyscreen'],
      muntin: !!o.hasMuntin,
      frameExt: !!o.hasFrameExt,
      note: '',
    }
  })
}
