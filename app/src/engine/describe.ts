import type { PositionGeometry } from './geometry'
import type { QuoteDict } from './i18n'
import { collectLeaves } from './fields'
import type { LeafField, Position } from './types'

export function leafLabel(l: LeafField, t: QuoteDict): string {
  const o = t.openings
  switch (l.fill) {
    case 'fixed':
      return o.fixed
    case 'door':
      return l.hinge === 'left' ? o.doorL : o.doorR
    case 'pair':
      return o.pair
    case 'doorPair':
      return o.doorPair
    case 'sash':
      if (l.opening === 'tilt') return o.tilt
      if (l.opening === 'turn') return l.hinge === 'left' ? o.turnL : o.turnR
      return l.hinge === 'left' ? o.tiltturnL : o.tiltturnR
  }
}

/** Pozun açılım özetini dil sözlüğüne göre üretir: "Çift açılım (sağ) + Sabit" */
export function describeOpenings(pos: Position, geo: PositionGeometry, t: QuoteDict): string {
  if (geo.kind === 'slide2') return t.openings.slide
  if (geo.kind === 'liftslide') return t.openings.liftslide
  const labels = collectLeaves(pos.root).map((l) => leafLabel(l, t))
  const counts = new Map<string, number>()
  for (const l of labels) counts.set(l, (counts.get(l) ?? 0) + 1)
  return [...counts.entries()].map(([l, n]) => (n > 1 ? `${n}× ${l}` : l)).join(' + ')
}
