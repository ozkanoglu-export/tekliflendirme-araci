/* ==========================================================================
   Geometri motoru — çizim ve metrajın TEK kaynağı.
   Poz ağacını (field tree) mm cinsinden dikdörtgenlere çevirir:
   kasa, ortakayıtlar, kanatlar, camlar. Çizim de reçete de buradan beslenir;
   böylece ekrandaki çizim ile kesim listesi asla birbirinden kopmaz.
   Koordinatlar: kasa dış sol-üst köşe (0,0), y aşağı doğru.
   ========================================================================== */
import type { Catalog, Field, Hinge, LeafField, LeafFill, Position, ProfileRole, SashOpening, Series } from './types'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export type EdgeKind = 'frame' | 'mullion' | 'threshold'
export interface Edges {
  l: EdgeKind
  t: EdgeKind
  r: EdgeKind
  b: EdgeKind
}

export interface MullionGeo {
  id: string
  dir: 'v' | 'h'
  /** Eksen konumu (dikey için x, yatay için y) */
  axis: number
  /** Eksen boyunca başlangıç/bitiş (kasa kenarı veya eksen) */
  from: number
  to: number
  /** Kesim boyu (mm) */
  cutLength: number
  /** Ağaç derinliği — çizimde üst seviye kayıt en üstte çizilir */
  depth: number
}

export interface SashGeo {
  leafId: string
  rect: Rect
  door: boolean
  role: ProfileRole
  opening: SashOpening | 'slide' | 'liftslide' | 'fixedSlide'
  hinge: Hinge
  /** Çift kanatta kollu (aktif) kanat mı */
  active: boolean
  /** Profil kesimine +kaynak payı eklenir mi */
  weld: boolean
  /** Bu kanat çizimde hangi profil yüzü ile gösterilir (mm) */
  face: number
}

export interface PaneGeo {
  leafId: string
  /** Çizim için cam dikdörtgeni */
  rect: Rect
  /** Sipariş cam ölçüsü */
  w: number
  h: number
  glassKey: string
  inSash: boolean
}

export interface HokGeo {
  leafId: string
  x: number
  y1: number
  y2: number
  cutLength: number
}

export interface LeafGeo {
  id: string
  fill: LeafFill
  rect: Rect
  edges: Edges
  hardwareKey: string | null
}

export interface PositionGeometry {
  W: number
  /** Kasa yüksekliği (panjur kutusu hariç) */
  H: number
  /** Toplam genişlik (kasa yükseltme dahil) */
  outerW: number
  /** Toplam yükseklik (panjur ve kasa yükseltme dahil) */
  totalH: number
  shutterH: number
  /** Kasa yükseltme kalınlıkları (mm) */
  ext: { l: number; t: number; r: number; b: number }
  threshold: boolean
  kind: Series['kind']
  leaves: LeafGeo[]
  mullions: MullionGeo[]
  sashes: SashGeo[]
  panes: PaneGeo[]
  hoks: HokGeo[]
  warnings: string[]
}

export const SHUTTER_BOX = 195

function inset(r: Rect, l: number, t: number, rr: number, b: number): Rect {
  return { x: r.x + l, y: r.y + t, w: r.w - l - rr, h: r.h - t - b }
}

function hasDoorAtBottom(f: Field): boolean {
  if (f.kind === 'leaf') return f.fill === 'door' || f.fill === 'doorPair'
  if (f.dir === 'v') return f.children.some((c) => hasDoorAtBottom(c.field))
  return hasDoorAtBottom(f.children[f.children.length - 1].field)
}

export function hardwareFor(leaf: LeafField): string | null {
  if (leaf.hardware) return leaf.hardware
  switch (leaf.fill) {
    case 'fixed':
      return null
    case 'sash':
      return leaf.opening === 'tilt' ? 'VASISTAS' : 'TEK_CIFT_ACILIM'
    case 'door':
      return 'KAPI_LOK'
    case 'pair':
      return 'HOK_SET'
    case 'doorPair':
      return 'HOK_KAPI_SET'
  }
}

/** Bölme boyutlarını dağıtır: sabit ölçüler korunur, kalan auto alanlara eşit bölünür. */
export function distribute(total: number, sizes: Array<number | null>): { sizes: number[]; overflow: boolean } {
  const fixed = sizes.reduce<number>((a, s) => a + (s ?? 0), 0)
  const autoCount = sizes.filter((s) => s === null).length
  const rest = total - fixed
  if (autoCount === 0) {
    // Hepsi sabit: toplam tutmuyorsa son parça farkı alır
    const out = sizes.map((s) => s ?? 0)
    const diff = total - fixed
    out[out.length - 1] += diff
    return { sizes: out, overflow: out[out.length - 1] <= 0 }
  }
  if (rest <= autoCount * 50) {
    // Taşma: orantılı küçült
    const scale = total / Math.max(1, fixed + autoCount * 200)
    return { sizes: sizes.map((s) => (s ?? 200) * scale), overflow: true }
  }
  const auto = rest / autoCount
  return { sizes: sizes.map((s) => s ?? auto), overflow: false }
}

export function computeGeometry(pos: Position, catalog: Catalog): PositionGeometry {
  const series = catalog.series[pos.series] ?? Object.values(catalog.series)[0]
  const warnings: string[] = []

  // Kasa yükseltme: girilen toplam ölçüden düşülür (alt veya 4 kenar)
  const extSize = catalog.extras.FRAME_EXT_35X70?.size ?? 35
  const ext = { l: 0, t: 0, r: 0, b: 0 }
  if (pos.frameExt === 'bottom') ext.b = extSize
  else if (pos.frameExt === 'all') ext.l = ext.t = ext.r = ext.b = extSize

  const outerW = Math.max(200, pos.width)
  const W = Math.max(200, outerW - ext.l - ext.r)
  let totalH = Math.max(200, pos.height)
  let shutterH = 0
  let H = totalH - ext.t - ext.b
  if (pos.shutter.enabled) {
    shutterH = SHUTTER_BOX
    if (pos.shutter.mode === 'subtract') H = totalH - SHUTTER_BOX - ext.t - ext.b
    else totalH = totalH + SHUTTER_BOX
  }
  H = Math.max(300, H)

  const geo: PositionGeometry = {
    W,
    H,
    outerW,
    totalH,
    shutterH,
    ext,
    threshold: false,
    kind: series.kind,
    leaves: [],
    mullions: [],
    sashes: [],
    panes: [],
    hoks: [],
    warnings,
  }

  if (series.kind === 'slide2') {
    buildSlide(geo, pos)
  } else if (series.kind === 'liftslide') {
    buildLiftSlide(geo, pos)
  } else {
    geo.threshold = pos.threshold === 'alu20' && hasDoorAtBottom(pos.root)
    const edges: Edges = { l: 'frame', t: 'frame', r: 'frame', b: geo.threshold ? 'threshold' : 'frame' }
    walk(pos.root, { x: 0, y: 0, w: W, h: H }, edges, geo, pos, series, 0)
  }

  // Sınır kontrolleri
  const lim = series.limits
  for (const s of geo.sashes) {
    if (s.opening === 'fixedSlide') continue
    if (s.rect.w > lim.sashMaxWidth) warnings.push(`Kanat genişliği ${Math.round(s.rect.w)} mm — seri sınırı ${lim.sashMaxWidth} mm`)
    if (s.rect.h > lim.sashMaxHeight) warnings.push(`Kanat yüksekliği ${Math.round(s.rect.h)} mm — seri sınırı ${lim.sashMaxHeight} mm`)
    if (s.rect.w < lim.sashMinWidth) warnings.push(`Kanat genişliği ${Math.round(s.rect.w)} mm — minimum ${lim.sashMinWidth} mm`)
    if (s.rect.h < lim.sashMinHeight) warnings.push(`Kanat yüksekliği ${Math.round(s.rect.h)} mm — minimum ${lim.sashMinHeight} mm`)
    if (s.opening === 'tilt' && s.rect.h > s.rect.w * 1.2) warnings.push(`Vasistas kanatta yükseklik genişlikten büyük (${Math.round(s.rect.w)}×${Math.round(s.rect.h)})`)
  }
  for (const p of geo.panes) {
    if (p.w <= 0 || p.h <= 0) warnings.push('Bölme ölçüleri çok küçük — cam ölçüsü sıfırın altında')
    else if ((p.w * p.h) / 1e6 > lim.glassMaxArea) warnings.push(`Cam ${p.w}×${p.h} mm — ${lim.glassMaxArea} m² sınırını aşıyor`)
  }
  geo.warnings = [...new Set(warnings)]
  return geo
}

function sashInset(e: EdgeKind, d: Series['deductions']): number {
  return e === 'frame' ? d.frameToSash : e === 'mullion' ? d.mullionAxisToSash : d.thresholdToSash
}
function fixedInset(e: EdgeKind, d: Series['deductions']): number {
  return e === 'mullion' ? d.mullionAxisToFixedGlass : d.frameToFixedGlass
}

function walk(field: Field, rect: Rect, edges: Edges, geo: PositionGeometry, pos: Position, series: Series, depth: number) {
  const d = series.deductions
  if (field.kind === 'split') {
    const vertical = field.dir === 'v'
    const total = vertical ? rect.w : rect.h
    const { sizes, overflow } = distribute(
      total,
      field.children.map((c) => c.size),
    )
    if (overflow) geo.warnings.push('Bölme ölçüleri toplam ölçüyü aşıyor — oranlı dağıtıldı')
    let cursor = vertical ? rect.x : rect.y
    field.children.forEach((c, i) => {
      const s = sizes[i]
      const childRect: Rect = vertical ? { x: cursor, y: rect.y, w: s, h: rect.h } : { x: rect.x, y: cursor, w: rect.w, h: s }
      const childEdges: Edges = vertical
        ? { ...edges, l: i === 0 ? edges.l : 'mullion', r: i === field.children.length - 1 ? edges.r : 'mullion' }
        : { ...edges, t: i === 0 ? edges.t : 'mullion', b: i === field.children.length - 1 ? edges.b : 'mullion' }
      walk(c.field, childRect, childEdges, geo, pos, series, depth + 1)
      cursor += s
      if (i < field.children.length - 1) {
        const endA = vertical ? edges.t : edges.l
        const endB = vertical ? edges.b : edges.r
        const endDed = (e: EdgeKind) => (e === 'mullion' ? d.mullionAxisToMullionEnd : d.frameToMullionEnd)
        const from = vertical ? rect.y : rect.x
        const to = vertical ? rect.y + rect.h : rect.x + rect.w
        geo.mullions.push({
          id: `${field.id}-${i}`,
          dir: field.dir,
          axis: cursor,
          from,
          to,
          cutLength: Math.round(to - from - endDed(endA) - endDed(endB)),
          depth,
        })
      }
    })
    return
  }

  const leafField = field
  geo.leaves.push({ id: leafField.id, fill: leafField.fill, rect, edges, hardwareKey: hardwareFor(leafField) })
  const glassKey = leafField.glass ?? pos.glass

  if (leafField.fill === 'fixed') {
    const g = inset(rect, fixedInset(edges.l, d), fixedInset(edges.t, d), fixedInset(edges.r, d), fixedInset(edges.b, d))
    geo.panes.push({ leafId: leafField.id, rect: g, w: Math.round(g.w), h: Math.round(g.h), glassKey, inSash: false })
    return
  }

  const area = inset(rect, sashInset(edges.l, d), sashInset(edges.t, d), sashInset(edges.r, d), sashInset(edges.b, d))
  const onThreshold = edges.b === 'threshold'

  if (leafField.fill === 'sash' || leafField.fill === 'door') {
    const isDoor = leafField.fill === 'door'
    const role: ProfileRole = isDoor || area.h > series.limits.doorProfileAboveHeight ? 'doorSash' : 'winSash'
    const gd = role === 'doorSash' ? d.doorSashToGlass : d.sashToGlass
    const bottom = isDoor && onThreshold ? d.thresholdSashToGlassBottom : gd
    geo.sashes.push({
      leafId: leafField.id,
      rect: area,
      door: isDoor,
      role,
      opening: isDoor ? 'turn' : leafField.opening,
      hinge: leafField.hinge,
      active: true,
      weld: true,
      face: gd,
    })
    const g = inset(area, gd, gd, gd, bottom)
    geo.panes.push({ leafId: leafField.id, rect: g, w: Math.round(g.w), h: Math.round(g.h), glassKey, inSash: true })
    return
  }

  // Çift kanat (HOK) — pencere veya kapı
  const isDoor = leafField.fill === 'doorPair'
  const role: ProfileRole = isDoor || area.h > series.limits.doorProfileAboveHeight ? 'doorSash' : 'winSash'
  const outer = role === 'doorSash' ? d.doorSashToGlass : d.sashToGlass
  const meet = isDoor ? d.pairMeetingToGlassDoor : d.pairMeetingToGlass
  const bottom = isDoor && onThreshold ? d.thresholdSashToGlassBottom : outer
  const sw = (area.w - d.pairGap) / 2
  const left: Rect = { x: area.x, y: area.y, w: sw, h: area.h }
  const right: Rect = { x: area.x + sw + d.pairGap, y: area.y, w: sw, h: area.h }
  const activeRight = leafField.hinge === 'right'
  // Aktif kanat kollu kanattır; menteşesi dış kenardadır
  geo.sashes.push({ leafId: leafField.id, rect: left, door: isDoor, role, opening: activeRight ? 'turn' : isDoor ? 'turn' : 'tiltturn', hinge: 'left', active: !activeRight, weld: true, face: outer })
  geo.sashes.push({ leafId: leafField.id, rect: right, door: isDoor, role, opening: activeRight ? (isDoor ? 'turn' : 'tiltturn') : 'turn', hinge: 'right', active: activeRight, weld: true, face: outer })
  const gl = inset(left, outer, outer, meet, bottom)
  const gr = inset(right, meet, outer, outer, bottom)
  geo.panes.push({ leafId: leafField.id, rect: gl, w: Math.round(gl.w), h: Math.round(gl.h), glassKey, inSash: true })
  geo.panes.push({ leafId: leafField.id, rect: gr, w: Math.round(gr.w), h: Math.round(gr.h), glassKey, inSash: true })
  const hokLen = area.h - (onThreshold ? d.hokFromSashHeightThreshold : d.hokFromSashHeight)
  geo.hoks.push({ leafId: leafField.id, x: area.x + area.w / 2, y1: area.y, y2: area.y + area.h, cutLength: Math.round(hokLen) })
}

/** Perge çift raylı sürme — eski PenCAD formülleri */
function buildSlide(geo: PositionGeometry, pos: Position) {
  const { W, H } = geo
  const sw = W / 2 - 8
  const sh = H - 82
  const y = 41
  const left: Rect = { x: 41, y, w: sw, h: sh }
  const right: Rect = { x: W - 41 - sw, y, w: sw, h: sh }
  const id = pos.root.id
  geo.leaves.push({ id, fill: 'sash', rect: { x: 0, y: 0, w: W, h: H }, edges: { l: 'frame', t: 'frame', r: 'frame', b: 'frame' }, hardwareKey: 'SURME_PERGE_SET' })
  const gw = Math.round(W / 2 - 140)
  const gh = Math.round(H - 230)
  for (const [r, hinge] of [
    [left, 'left'],
    [right, 'right'],
  ] as const) {
    geo.sashes.push({ leafId: id, rect: r, door: false, role: 'winSash', opening: 'slide', hinge, active: true, weld: false, face: 66 })
    const g = { x: r.x + (r.w - gw) / 2, y: r.y + (r.h - gh) / 2, w: gw, h: gh }
    geo.panes.push({ leafId: id, rect: g, w: gw, h: gh, glassKey: pos.glass, inSash: true })
  }
}

/** Akdeniz Hebeschiebe — 1 sabit + 1 kaldır-sür; eski PenCAD formülleri */
function buildLiftSlide(geo: PositionGeometry, pos: Position) {
  const { W, H } = geo
  const id = pos.root.id
  const activeRight = pos.activeSide !== 'left'
  geo.leaves.push({ id, fill: 'sash', rect: { x: 0, y: 0, w: W, h: H }, edges: { l: 'frame', t: 'frame', r: 'frame', b: 'frame' }, hardwareKey: 'HEBESCHIEBE_160KG' })
  geo.mullions.push({ id: `${id}-m`, dir: 'v', axis: W / 2, from: 0, to: H, cutLength: Math.round(H - 115), depth: 0 })

  const aw = W / 2 - 40
  const ah = H - 115
  const activeRect: Rect = activeRight ? { x: W / 2 + 20, y: 57, w: aw, h: ah } : { x: 20, y: 57, w: aw, h: ah }
  geo.sashes.push({ leafId: id, rect: activeRect, door: true, role: 'doorSash', opening: 'liftslide', hinge: activeRight ? 'right' : 'left', active: true, weld: false, face: 119 })

  const fw = Math.round(W / 2 - 94)
  const fh = Math.round(H - 130)
  const fixedX = activeRight ? (W / 2 - fw) / 2 : W / 2 + (W / 2 - fw) / 2
  geo.panes.push({ leafId: id, rect: { x: fixedX, y: (H - fh) / 2, w: fw, h: fh }, w: fw, h: fh, glassKey: pos.glass, inSash: false })

  const gw = Math.round(W / 2 - 238)
  const gh = Math.round(H - 274)
  geo.panes.push({
    leafId: id,
    rect: { x: activeRect.x + (activeRect.w - gw) / 2, y: activeRect.y + (activeRect.h - gh) / 2, w: gw, h: gh },
    w: gw,
    h: gh,
    glassKey: pos.glass,
    inSash: true,
  })
}
