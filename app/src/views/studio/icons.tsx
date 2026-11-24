import type { LeafFill, SashOpening, Hinge } from '../../engine/types'

/** Dolgu/açılım seçici için küçük sembol ikonları (DIN gösterimi) */
export function FillIcon({ fill, opening = 'tiltturn', hinge = 'right', size = 30 }: { fill: LeafFill; opening?: SashOpening; hinge?: Hinge; size?: number }) {
  const s = 'currentColor'
  const frame = <rect x="3" y="3" width="24" height="24" rx="1" fill="none" stroke={s} strokeWidth="1.6" />
  const glass = <rect x="6" y="6" width="18" height="18" fill="currentColor" opacity=".12" />
  let sym = null
  const turn = (x0: number, x1: number, y0: number, y1: number, hingeLeft: boolean) => (hingeLeft ? `${x1},${y0} ${x0},${(y0 + y1) / 2} ${x1},${y1}` : `${x0},${y0} ${x1},${(y0 + y1) / 2} ${x0},${y1}`)
  if (fill === 'sash' || fill === 'door') {
    const lines = []
    if (fill === 'door' || opening !== 'tilt') lines.push(<polyline key="t" points={turn(7, 23, 7, 23, hinge === 'left')} fill="none" stroke={s} strokeWidth="1.2" />)
    if (fill === 'sash' && opening !== 'turn') lines.push(<polyline key="k" points="7,7 15,23 23,7" fill="none" stroke={s} strokeWidth="1.2" strokeDasharray={opening === 'tiltturn' ? '2.5 1.8' : undefined} />)
    sym = (
      <>
        <rect x="5.5" y="5.5" width="19" height="19" fill="none" stroke={s} strokeWidth="1.2" />
        {lines}
        {fill === 'door' && <rect x="5" y="26" width="20" height="1.2" fill={s} />}
      </>
    )
  } else if (fill === 'pair' || fill === 'doorPair') {
    sym = (
      <>
        <rect x="5.5" y="5.5" width="9" height="19" fill="none" stroke={s} strokeWidth="1.1" />
        <rect x="15.5" y="5.5" width="9" height="19" fill="none" stroke={s} strokeWidth="1.1" />
        <polyline points="14,6.5 6.5,15 14,23.5" fill="none" stroke={s} strokeWidth="1" />
        <polyline points="16,6.5 23.5,15 16,23.5" fill="none" stroke={s} strokeWidth="1" />
      </>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden>
      {glass}
      {frame}
      {sym}
    </svg>
  )
}

export function SplitIcon({ dir, parts, size = 30 }: { dir: 'v' | 'h'; parts: number; size?: number }) {
  const lines = []
  for (let i = 1; i < parts; i++) {
    const p = 3 + (24 * i) / parts
    lines.push(dir === 'v' ? <line key={i} x1={p} y1="3" x2={p} y2="27" stroke="currentColor" strokeWidth="2" /> : <line key={i} x1="3" y1={p} x2="27" y2={p} stroke="currentColor" strokeWidth="2" />)
  }
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden>
      <rect x="3" y="3" width="24" height="24" rx="1" fill="currentColor" fillOpacity=".08" stroke="currentColor" strokeWidth="1.6" />
      {lines}
    </svg>
  )
}
