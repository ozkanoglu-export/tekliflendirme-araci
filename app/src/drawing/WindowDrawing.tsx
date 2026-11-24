/* ==========================================================================
   Teknik çizim (SVG) — içeriden görünüş.
   Birimler: viewBox mm cinsindendir; çizgiler non-scaling-stroke ile her
   yakınlaştırmada keskin kalır. Varyantlar:
     studio — koyu tuval, seçilebilir alanlar
     paper  — teklif/baskı (beyaz zemin)
     thumb  — liste küçük resmi (ölçüsüz)
   ========================================================================== */
import { useId, type ReactNode } from 'react'
import type { PositionGeometry, Rect, SashGeo } from '../engine/geometry'
import type { Catalog, Position, SymbolConvention } from '../engine/types'

export type DrawingVariant = 'studio' | 'paper' | 'thumb'

interface Props {
  pos: Position
  geo: PositionGeometry
  catalog: Catalog
  variant: DrawingVariant
  convention?: SymbolConvention
  selectedId?: string | null
  onSelect?: (leafId: string) => void
  showGlassSizes?: boolean
  highlightRect?: Rect | null
  className?: string
}

interface Palette {
  line: string
  dim: string
  dimText: string
  glassA: string
  glassB: string
  glassStreak: string
  symbol: string
  handle: string
  bead: string
  shutter: string
  shutterLine: string
  label: string
  labelBg: string
}

const PALETTES: Record<DrawingVariant, Palette> = {
  studio: {
    line: '#0b1220',
    dim: '#7dd3fc',
    dimText: '#e0f2fe',
    glassA: '#9fd3f5',
    glassB: '#5aa9df',
    glassStreak: 'rgba(255,255,255,0.55)',
    symbol: '#0b1220',
    handle: '#9aa3ae',
    bead: 'rgba(0,0,0,0.18)',
    shutter: '#5b6573',
    shutterLine: '#3b434e',
    label: '#0b1220',
    labelBg: 'rgba(255,255,255,0.86)',
  },
  paper: {
    line: '#1f2937',
    dim: '#334155',
    dimText: '#0f172a',
    glassA: '#e3f1fb',
    glassB: '#c3def2',
    glassStreak: 'rgba(255,255,255,0.9)',
    symbol: '#1f2937',
    handle: '#6b7280',
    bead: 'rgba(0,0,0,0.12)',
    shutter: '#9ca3af',
    shutterLine: '#6b7280',
    label: '#0f172a',
    labelBg: 'rgba(255,255,255,0.9)',
  },
  thumb: {
    line: '#0b1220',
    dim: 'transparent',
    dimText: 'transparent',
    glassA: '#a8d8f7',
    glassB: '#6bb2e3',
    glassStreak: 'rgba(255,255,255,0.5)',
    symbol: '#0b1220',
    handle: '#9aa3ae',
    bead: 'rgba(0,0,0,0.15)',
    shutter: '#5b6573',
    shutterLine: '#3b434e',
    label: '#0b1220',
    labelBg: 'transparent',
  },
}

const NS = { vectorEffect: 'non-scaling-stroke' as const }

function poly(pts: Array<[number, number]>): string {
  return pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
}

/** Gönye (45°) kesimli profil çerçevesi: dış dikdörtgen + yüz genişliği */
function MiterRing({ r, face, fill, stroke, bottomOpen = false, id }: { r: Rect; face: number; fill: string; stroke: string; bottomOpen?: boolean; id?: string }) {
  const { x, y, w, h } = r
  const f = Math.min(face, w / 2 - 1, h / 2 - 1)
  if (f <= 0) return null
  const sw = 1.1
  if (bottomOpen) {
    return (
      <g data-id={id}>
        <polygon points={poly([[x, y], [x + w, y], [x + w - f, y + f], [x + f, y + f]])} fill={fill} stroke={stroke} strokeWidth={sw} {...NS} />
        <polygon points={poly([[x, y], [x + f, y + f], [x + f, y + h], [x, y + h]])} fill={fill} stroke={stroke} strokeWidth={sw} {...NS} />
        <polygon points={poly([[x + w, y], [x + w, y + h], [x + w - f, y + h], [x + w - f, y + f]])} fill={fill} stroke={stroke} strokeWidth={sw} {...NS} />
      </g>
    )
  }
  return (
    <g data-id={id}>
      <polygon points={poly([[x, y], [x + w, y], [x + w - f, y + f], [x + f, y + f]])} fill={fill} stroke={stroke} strokeWidth={sw} {...NS} />
      <polygon points={poly([[x, y + h], [x + f, y + h - f], [x + w - f, y + h - f], [x + w, y + h]])} fill={fill} stroke={stroke} strokeWidth={sw} {...NS} />
      <polygon points={poly([[x, y], [x + f, y + f], [x + f, y + h - f], [x, y + h]])} fill={fill} stroke={stroke} strokeWidth={sw} {...NS} />
      <polygon points={poly([[x + w, y], [x + w, y + h], [x + w - f, y + h - f], [x + w - f, y + f]])} fill={fill} stroke={stroke} strokeWidth={sw} {...NS} />
    </g>
  )
}

function shift(r: Rect, dy: number): Rect {
  return { ...r, y: r.y + dy }
}

export function WindowDrawing({ pos, geo, catalog, variant, convention = 'din', selectedId, onSelect, showGlassSizes = true, highlightRect, className }: Props) {
  const uidBase = useId().replace(/:/g, '')
  const P = PALETTES[variant]
  const series = catalog.series[pos.series] ?? Object.values(catalog.series)[0]
  const color = catalog.colors[pos.color] ?? catalog.colors.WHITE
  const profFill = color.woodgrain ? `url(#${uidBase}-wood)` : color.fill
  const profStroke = color.tier === 'white' ? (variant === 'paper' ? '#4b5563' : '#5b6675') : color.stroke

  const { W, H, totalH, shutterH } = geo
  const big = Math.max(W, totalH)
  const fs = Math.max(26, big * (variant === 'paper' ? 0.052 : 0.03))
  const showDims = variant !== 'thumb'
  const dimGap = fs * 2.1

  const vAxes = [...new Set(geo.mullions.filter((m) => m.dir === 'v' && m.from <= 1 && m.to >= H - 1).map((m) => Math.round(m.axis)))].sort((a, b) => a - b)
  const hAxes = [...new Set(geo.mullions.filter((m) => m.dir === 'h' && m.from <= 1 && m.to >= W - 1).map((m) => Math.round(m.axis)))].sort((a, b) => a - b)
  // Kısmi kayıtlar (alt bölmeler) için de zincir: tüm benzersiz eksenler
  const vAll = [...new Set(geo.mullions.filter((m) => m.dir === 'v').map((m) => Math.round(m.axis)))].sort((a, b) => a - b)
  const hAll = [...new Set(geo.mullions.filter((m) => m.dir === 'h').map((m) => Math.round(m.axis)))].sort((a, b) => a - b)
  const vChain = vAll.length ? vAll : vAxes
  const hChain = hAll.length ? hAll : hAxes

  const padB = showDims ? dimGap * (vChain.length ? 2 : 1) + fs * 0.6 : fs * 0.3
  const padR = showDims ? dimGap * (hChain.length || shutterH ? 2 : 1) + fs * 1.2 : fs * 0.3
  const padT = showDims ? fs * 0.8 : fs * 0.3
  const padL = showDims ? fs * 0.8 : fs * 0.3

  const frameFace = series.faces.frame
  const mullFace = series.faces.mullion
  const frameRect: Rect = { x: 0, y: shutterH, w: W, h: H }
  const glassFill = `url(#${uidBase}-glass)`

  const mullions = [...geo.mullions].sort((a, b) => b.depth - a.depth)

  /* ---- Cam ---- */
  const renderPane = (r: Rect, glassKey: string, key: string, label: string | null) => {
    const g = catalog.glasses[glassKey]
    const rr = shift(r, shutterH)
    if (rr.w <= 0 || rr.h <= 0) return null
    const isPanel = !!g?.panel
    const s = Math.min(rr.w, rr.h)
    return (
      <g key={key}>
        <rect x={rr.x} y={rr.y} width={rr.w} height={rr.h} fill={isPanel ? `url(#${uidBase}-panel)` : g?.frosted ? `url(#${uidBase}-frost)` : glassFill} stroke={P.line} strokeWidth={0.6} {...NS} />
        {isPanel ? (
          <rect x={rr.x + s * 0.12} y={rr.y + s * 0.12} width={rr.w - s * 0.24} height={rr.h - s * 0.24} fill="none" stroke={profStroke} strokeOpacity={0.6} strokeWidth={0.8} {...NS} />
        ) : (
          <>
            <line x1={rr.x + rr.w * 0.12} y1={rr.y + rr.h * 0.42} x2={rr.x + rr.w * 0.42} y2={rr.y + rr.h * 0.12} stroke={P.glassStreak} strokeWidth={variant === 'paper' ? 1.2 : 2} {...NS} />
            <line x1={rr.x + rr.w * 0.2} y1={rr.y + rr.h * 0.5} x2={rr.x + rr.w * 0.5} y2={rr.y + rr.h * 0.2} stroke={P.glassStreak} strokeWidth={variant === 'paper' ? 0.8 : 1.2} {...NS} />
          </>
        )}
        {pos.muntin && !isPanel && (
          <g stroke={color.tier === 'white' ? '#e5e7eb' : color.fill} strokeWidth={variant === 'thumb' ? 1 : 2.4} {...NS} opacity={0.95}>
            <line x1={rr.x + rr.w / 2} y1={rr.y} x2={rr.x + rr.w / 2} y2={rr.y + rr.h} {...NS} />
            <line x1={rr.x} y1={rr.y + rr.h / 2} x2={rr.x + rr.w} y2={rr.y + rr.h / 2} {...NS} />
          </g>
        )}
        {label && showDims && showGlassSizes && rr.w > fs * 4 && rr.h > fs * 1.6 && (
          <g>
            <rect x={rr.x + rr.w / 2 - fs * 2.6} y={rr.y + rr.h - fs * 1.55} width={fs * 5.2} height={fs * 1.15} rx={fs * 0.2} fill={P.labelBg} />
            <text x={rr.x + rr.w / 2} y={rr.y + rr.h - fs * 0.68} fontSize={fs * 0.62} textAnchor="middle" fill={P.label} fontFamily="JetBrains Mono, monospace" fontWeight={600}>
              {label}
            </text>
          </g>
        )}
      </g>
    )
  }

  /* ---- Açılım sembolleri ---- */
  const symbol = (s: SashGeo, inner: Rect, k: string): ReactNode[] => {
    const out: ReactNode[] = []
    const { x, y, w, h } = inner
    const sw = variant === 'thumb' ? 1 : 1.3
    const common = { fill: 'none', stroke: P.symbol, strokeWidth: sw, ...NS }
    const din = convention === 'din'
    if (s.opening === 'slide') {
      const cy = y + h / 2
      const dir = s.hinge === 'left' ? 1 : -1
      const cx = x + w / 2
      const len = Math.min(w * 0.35, fs * 4)
      out.push(<line key={k + 'a'} x1={cx - (dir * len) / 2} y1={cy} x2={cx + (dir * len) / 2} y2={cy} {...common} strokeWidth={sw * 1.4} markerEnd={`url(#${uidBase}-arrow)`} />)
      return out
    }
    if (s.opening === 'liftslide') {
      const cx = x + w / 2
      const cy = y + h / 2
      const dir = s.hinge === 'right' ? -1 : 1
      const len = Math.min(w * 0.3, fs * 4)
      out.push(<polyline key={k + 'l'} points={poly([[cx - (dir * len) / 2, cy + len * 0.3], [cx - (dir * len) / 2, cy - len * 0.3], [cx + (dir * len) / 2, cy - len * 0.3]])} {...common} strokeWidth={sw * 1.4} markerEnd={`url(#${uidBase}-arrow)`} />)
      return out
    }
    const hingeLeft = s.hinge === 'left'
    if (s.opening === 'turn' || s.opening === 'tiltturn') {
      // DIN: tepe menteşe tarafında. Klasik: tepe kol tarafında.
      const apexLeft = din ? hingeLeft : !hingeLeft
      const ax = apexLeft ? x : x + w
      const bx = apexLeft ? x + w : x
      out.push(<polyline key={k + 't'} points={poly([[bx, y], [ax, y + h / 2], [bx, y + h]])} {...common} />)
    }
    if (s.opening === 'tilt' || s.opening === 'tiltturn') {
      const apexBottom = din
      const ay = apexBottom ? y + h : y
      const by = apexBottom ? y : y + h
      out.push(<polyline key={k + 'k'} points={poly([[x, by], [x + w / 2, ay], [x + w, by]])} {...common} strokeDasharray={s.opening === 'tiltturn' ? '6 4' : undefined} />)
    }
    return out
  }

  const handle = (s: SashGeo, r: Rect, k: string): ReactNode => {
    if (variant === 'thumb' || !s.active || s.opening === 'fixedSlide') return null
    const hw = Math.max(14, Math.min(34, s.face * 0.42))
    const hh = hw * 4.2
    if (s.opening === 'tilt') {
      const cx = r.x + r.w / 2
      const cy = r.y + s.face / 2
      return (
        <g key={k}>
          <rect x={cx - hh / 2} y={cy - hw / 2} width={hh} height={hw} rx={hw / 2} fill={P.handle} stroke={P.line} strokeWidth={0.6} {...NS} />
        </g>
      )
    }
    if (s.opening === 'slide' || s.opening === 'liftslide') {
      const onLeft = s.hinge === 'right'
      const cx = onLeft ? r.x + s.face / 2 : r.x + r.w - s.face / 2
      const cy = r.y + r.h * 0.5
      return <rect key={k} x={cx - hw / 2} y={cy - hh * 0.8} width={hw} height={hh * 1.6} rx={hw / 2} fill={P.handle} stroke={P.line} strokeWidth={0.6} {...NS} />
    }
    const handleOnRight = s.hinge === 'left'
    const cx = handleOnRight ? r.x + r.w - s.face / 2 : r.x + s.face / 2
    const cy = s.door ? Math.max(r.y + hh, Math.min(r.y + r.h - hh, shutterH + geo.H - 1050)) : r.y + r.h / 2
    const lever = hh * 0.9 * (handleOnRight ? -1 : 1)
    return (
      <g key={k}>
        <rect x={cx - hw / 2} y={cy - hh / 2} width={hw} height={hh} rx={hw * 0.35} fill={P.handle} stroke={P.line} strokeWidth={0.6} {...NS} />
        <line x1={cx} y1={cy - hh * 0.25} x2={cx + lever} y2={cy - hh * 0.25} stroke={P.line} strokeWidth={variant === 'paper' ? 2 : 3} strokeLinecap="round" {...NS} />
        <line x1={cx} y1={cy - hh * 0.25} x2={cx + lever} y2={cy - hh * 0.25} stroke={P.handle} strokeWidth={variant === 'paper' ? 1.2 : 2} strokeLinecap="round" {...NS} />
      </g>
    )
  }

  /* ---- Ölçü zincirleri ---- */
  const tick = fs * 0.35
  const dimH = (x1: number, x2: number, y: number, label: string, k: string, ext: number) => (
    <g key={k}>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={P.dim} strokeWidth={0.9} {...NS} />
      <line x1={x1} y1={y - ext} x2={x1} y2={y + tick} stroke={P.dim} strokeWidth={0.6} {...NS} />
      <line x1={x2} y1={y - ext} x2={x2} y2={y + tick} stroke={P.dim} strokeWidth={0.6} {...NS} />
      <line x1={x1 - tick} y1={y + tick} x2={x1 + tick} y2={y - tick} stroke={P.dim} strokeWidth={1.6} {...NS} />
      <line x1={x2 - tick} y1={y + tick} x2={x2 + tick} y2={y - tick} stroke={P.dim} strokeWidth={1.6} {...NS} />
      <text x={(x1 + x2) / 2} y={y - fs * 0.3} fontSize={fs * 0.78} textAnchor="middle" fill={P.dimText} fontFamily="JetBrains Mono, monospace" fontWeight={600}>
        {label}
      </text>
    </g>
  )
  const dimV = (y1: number, y2: number, x: number, label: string, k: string, ext: number) => (
    <g key={k}>
      <line x1={x} y1={y1} x2={x} y2={y2} stroke={P.dim} strokeWidth={0.9} {...NS} />
      <line x1={x + ext} y1={y1} x2={x - tick} y2={y1} stroke={P.dim} strokeWidth={0.6} {...NS} />
      <line x1={x + ext} y1={y2} x2={x - tick} y2={y2} stroke={P.dim} strokeWidth={0.6} {...NS} />
      <line x1={x - tick} y1={y1 + tick} x2={x + tick} y2={y1 - tick} stroke={P.dim} strokeWidth={1.6} {...NS} />
      <line x1={x - tick} y1={y2 + tick} x2={x + tick} y2={y2 - tick} stroke={P.dim} strokeWidth={1.6} {...NS} />
      <text x={x + fs * 0.35} y={(y1 + y2) / 2} fontSize={fs * 0.78} textAnchor="middle" fill={P.dimText} fontFamily="JetBrains Mono, monospace" fontWeight={600} transform={`rotate(-90 ${x + fs * 0.35} ${(y1 + y2) / 2})`} dy={-fs * 0.05}>
        {label}
      </text>
    </g>
  )

  const dims: ReactNode[] = []
  if (showDims) {
    const yInner = totalH + dimGap * 0.9
    const yOuter = totalH + dimGap * (vChain.length ? 1.9 : 0.9)
    if (vChain.length) {
      const pts = [0, ...vChain, W]
      for (let i = 0; i < pts.length - 1; i++) dims.push(dimH(pts[i], pts[i + 1], yInner, String(Math.round(pts[i + 1] - pts[i])), `vi${i}`, yInner - totalH - fs * 0.3))
    }
    dims.push(dimH(0, W, yOuter, String(W), 'wo', yOuter - totalH - fs * 0.3))

    const xInner = W + dimGap * 0.9
    const xOuter = W + dimGap * (hChain.length || shutterH ? 1.9 : 0.9)
    const innerPts = [...(shutterH ? [0] : []), shutterH, ...hChain.map((a) => a + shutterH), shutterH + H]
    if (innerPts.length > 2) {
      for (let i = 0; i < innerPts.length - 1; i++) dims.push(dimV(innerPts[i], innerPts[i + 1], xInner, String(Math.round(innerPts[i + 1] - innerPts[i])), `hi${i}`, xInner - W - fs * 0.3))
    }
    dims.push(dimV(0, totalH, xOuter, String(totalH), 'ho', xOuter - W - fs * 0.3))
  }

  const threshold = geo.threshold
  const isTreeKind = geo.kind === 'casement'

  return (
    <svg
      viewBox={`${-padL} ${-padT} ${W + padL + padR} ${totalH + padT + padB}`}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={`${uidBase}-glass`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={P.glassA} />
          <stop offset="55%" stopColor={P.glassB} stopOpacity={variant === 'paper' ? 0.85 : 0.95} />
          <stop offset="100%" stopColor={P.glassA} />
        </linearGradient>
        <pattern id={`${uidBase}-frost`} width="18" height="18" patternUnits="userSpaceOnUse">
          <rect width="18" height="18" fill={P.glassA} />
          <circle cx="4" cy="4" r="1.6" fill="#ffffff" opacity="0.8" />
          <circle cx="13" cy="12" r="1.6" fill="#ffffff" opacity="0.8" />
        </pattern>
        <pattern id={`${uidBase}-panel`} width="40" height="40" patternUnits="userSpaceOnUse">
          <rect width="40" height="40" fill={color.tier === 'white' ? '#f4f5f7' : color.fill} />
          <line x1="0" y1="20" x2="40" y2="20" stroke={color.tier === 'white' ? '#e3e6ea' : color.stroke} strokeOpacity="0.25" strokeWidth="2" />
        </pattern>
        <pattern id={`${uidBase}-wood`} width="60" height="14" patternUnits="userSpaceOnUse">
          <rect width="60" height="14" fill={color.fill} />
          <path d="M0 4 Q15 2 30 5 T60 4" stroke={color.stroke} strokeOpacity="0.28" fill="none" strokeWidth="1.4" />
          <path d="M0 10 Q20 12 35 9 T60 10" stroke={color.stroke} strokeOpacity="0.2" fill="none" strokeWidth="1" />
        </pattern>
        <pattern id={`${uidBase}-shutter`} width="40" height="22" patternUnits="userSpaceOnUse">
          <rect width="40" height="22" fill={P.shutter} />
          <line x1="0" y1="21" x2="40" y2="21" stroke={P.shutterLine} strokeWidth="2" />
        </pattern>
        <marker id={`${uidBase}-arrow`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill={P.symbol} />
        </marker>
      </defs>

      {/* Panjur kutusu */}
      {shutterH > 0 && (
        <g>
          <rect x={0} y={0} width={W} height={shutterH} fill={`url(#${uidBase}-shutter)`} stroke={P.line} strokeWidth={1.1} {...NS} />
          {showDims && W > fs * 9 && (
            <text x={W / 2} y={shutterH / 2 + fs * 0.25} fontSize={fs * 0.6} textAnchor="middle" fill="#f1f5f9" fontFamily="Inter, sans-serif" fontWeight={700} letterSpacing={fs * 0.05}>
              MONOBLOK PANJUR 195
            </text>
          )}
        </g>
      )}

      {/* Kasa iç zemini (çıta) */}
      <rect x={frameRect.x} y={frameRect.y} width={W} height={H} fill={color.tier === 'white' ? '#dfe3e8' : color.stroke} />

      {/* Sabit camlar */}
      {geo.panes.filter((p) => !p.inSash).map((p, i) => renderPane(p.rect, p.glassKey, `fp${i}`, `${p.w}×${p.h}`))}

      {/* Ortakayıtlar */}
      {mullions.map((m) => {
        const r: Rect = m.dir === 'v' ? { x: m.axis - mullFace / 2, y: m.from, w: mullFace, h: m.to - m.from } : { x: m.from, y: m.axis - mullFace / 2, w: m.to - m.from, h: mullFace }
        const rr = shift(r, shutterH)
        return <rect key={m.id} x={rr.x} y={rr.y} width={rr.w} height={rr.h} fill={profFill} stroke={profStroke} strokeWidth={1} {...NS} />
      })}

      {/* Kasa */}
      <MiterRing r={frameRect} face={frameFace} fill={profFill} stroke={profStroke} bottomOpen={threshold} />
      {threshold && (
        <g>
          <rect x={0} y={shutterH + H - 22} width={W} height={22} fill="#c7cdd4" stroke="#64748b" strokeWidth={1} {...NS} />
          <line x1={0} y1={shutterH + H - 14} x2={W} y2={shutterH + H - 14} stroke="#94a3b8" strokeWidth={0.6} {...NS} />
        </g>
      )}

      {/* Kanatlar */}
      {geo.sashes.map((s, i) => {
        const r = shift(s.rect, shutterH)
        const visibleFace = Math.max(20, s.face - 12)
        const inner: Rect = { x: r.x + s.face, y: r.y + s.face, w: r.w - 2 * s.face, h: r.h - 2 * s.face }
        const panes = geo.panes.filter((p) => p.inSash && p.leafId === s.leafId && p.rect.x >= s.rect.x - 1 && p.rect.x + p.rect.w <= s.rect.x + s.rect.w + 1)
        return (
          <g key={`s${i}`}>
            <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={P.bead} />
            {panes.map((p, j) => renderPane(p.rect, p.glassKey, `sp${i}-${j}`, `${p.w}×${p.h}`))}
            <MiterRing r={r} face={visibleFace} fill={profFill} stroke={profStroke} />
            <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="none" stroke={P.line} strokeOpacity={0.55} strokeWidth={1.2} {...NS} />
            {symbol(s, inner.w > 0 && inner.h > 0 ? inner : r, `sy${i}`)}
            {handle(s, r, `h${i}`)}
          </g>
        )
      })}

      {/* HOK ara profil */}
      {geo.hoks.map((h, i) => (
        <rect key={`hok${i}`} x={h.x - 22} y={h.y1 + shutterH + 6} width={44} height={h.y2 - h.y1 - 12} fill={profFill} stroke={profStroke} strokeWidth={1} {...NS} />
      ))}

      {/* Sabit alan etiketi (sürme dışı) */}
      {geo.kind === 'liftslide' &&
        geo.panes
          .filter((p) => !p.inSash)
          .map((p, i) =>
            showDims ? (
              <text key={`fx${i}`} x={p.rect.x + p.rect.w / 2} y={p.rect.y + shutterH + p.rect.h / 2} fontSize={fs * 0.9} textAnchor="middle" fill={P.label} opacity={0.55} fontWeight={700} fontFamily="Inter, sans-serif">
                F
              </text>
            ) : null,
          )}

      {/* Seçilebilir alanlar (stüdyo) */}
      {variant === 'studio' &&
        isTreeKind &&
        geo.leaves.map((l) => {
          const r = shift(l.rect, shutterH)
          const sel = l.id === selectedId
          return (
            <rect
              key={`hit-${l.id}`}
              x={r.x + 3}
              y={r.y + 3}
              width={Math.max(0, r.w - 6)}
              height={Math.max(0, r.h - 6)}
              fill={sel ? 'rgba(212,175,55,0.14)' : 'transparent'}
              stroke={sel ? '#d4af37' : 'transparent'}
              strokeWidth={sel ? 2.5 : 0}
              strokeDasharray={sel ? '10 6' : undefined}
              className="cursor-pointer hover:fill-[rgba(125,211,252,0.12)]"
              onClick={(e) => {
                e.stopPropagation()
                onSelect?.(l.id)
              }}
              {...NS}
            />
          )
        })}

      {highlightRect && (
        <rect
          x={highlightRect.x + 4}
          y={highlightRect.y + shutterH + 4}
          width={Math.max(0, highlightRect.w - 8)}
          height={Math.max(0, highlightRect.h - 8)}
          fill="rgba(212,175,55,0.10)"
          stroke="#d4af37"
          strokeWidth={2.5}
          strokeDasharray="10 6"
          pointerEvents="none"
          {...NS}
        />
      )}

      {dims}
    </svg>
  )
}
