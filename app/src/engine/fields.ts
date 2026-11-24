import type { Field, LeafField, LeafFill, SashOpening, Hinge, SplitField } from './types'

let counter = 0
export function uid(prefix = 'f'): string {
  counter = (counter + 1) % 1_000_000
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`
}

export function leaf(fill: LeafFill = 'fixed', opening: SashOpening = 'tiltturn', hinge: Hinge = 'right', extra: Partial<LeafField> = {}): LeafField {
  return { kind: 'leaf', id: uid(), fill, opening, hinge, ...extra }
}

export function split(dir: 'v' | 'h', children: Array<{ size: number | null; field: Field }>): SplitField {
  return { kind: 'split', id: uid(), dir, children }
}

export function findField(root: Field, id: string): Field | null {
  if (root.id === id) return root
  if (root.kind === 'split') {
    for (const c of root.children) {
      const f = findField(c.field, id)
      if (f) return f
    }
  }
  return null
}

export function findParent(root: Field, id: string): { parent: SplitField; index: number } | null {
  if (root.kind !== 'split') return null
  for (let i = 0; i < root.children.length; i++) {
    if (root.children[i].field.id === id) return { parent: root, index: i }
    const r = findParent(root.children[i].field, id)
    if (r) return r
  }
  return null
}

/** Ağaçta id'si verilen alanı değiştirir (immutable). */
export function replaceField(root: Field, id: string, fn: (f: Field) => Field): Field {
  if (root.id === id) return fn(root)
  if (root.kind === 'split') {
    let changed = false
    const children = root.children.map((c) => {
      const nf = replaceField(c.field, id, fn)
      if (nf !== c.field) changed = true
      return nf === c.field ? c : { ...c, field: nf }
    })
    return changed ? { ...root, children } : root
  }
  return root
}

/** Bir alanı n eşit parçaya böler. İlk parça mevcut dolguyu korur, diğerleri sabit cam olur. */
export function splitField(root: Field, id: string, dir: 'v' | 'h', parts: number): Field {
  const n = Math.max(2, Math.min(8, Math.round(parts)))
  return replaceField(root, id, (f) => {
    const first: Field = f.kind === 'leaf' ? { ...f, id: uid() } : f
    const children = [{ size: null, field: first }]
    for (let i = 1; i < n; i++) children.push({ size: null, field: leaf('fixed') })
    return split(dir, children)
  })
}

/** Alanı kaldırır; komşuları genişler. Ebeveynde tek çocuk kalırsa ebeveyn çözülür. */
export function removeField(root: Field, id: string): Field {
  const p = findParent(root, id)
  if (!p) return root
  const children = p.parent.children.filter((_, i) => i !== p.index)
  if (children.length === 1) {
    const only = children[0].field
    return replaceField(root, p.parent.id, () => only)
  }
  return replaceField(root, p.parent.id, (f) => ({ ...(f as SplitField), children }))
}

export function setChildSize(root: Field, splitId: string, index: number, size: number | null): Field {
  return replaceField(root, splitId, (f) => {
    if (f.kind !== 'split') return f
    const children = f.children.map((c, i) => (i === index ? { ...c, size } : c))
    return { ...f, children }
  })
}

export function collectLeaves(root: Field): LeafField[] {
  if (root.kind === 'leaf') return [root]
  return root.children.flatMap((c) => collectLeaves(c.field))
}

/** Yeni id'lerle derin kopya (poz kopyalama için) */
export function cloneTree(root: Field): Field {
  if (root.kind === 'leaf') return { ...root, id: uid() }
  return { ...root, id: uid(), children: root.children.map((c) => ({ size: c.size, field: cloneTree(c.field) })) }
}

/* ---------- Hazır şablonlar ---------- */

export type TemplateKey =
  | 'fixed'
  | 'tiltturn'
  | 'turn'
  | 'tilt'
  | 'hok'
  | 'two'
  | 'three'
  | 'transom'
  | 'fixedTransom'
  | 'door'
  | 'doorPair'
  | 'entrance'
  | 'balcony'

export interface TemplateDef {
  key: TemplateKey
  label: string
  hint: string
  build: (w: number, h: number) => Field
  w: number
  h: number
}

export const TEMPLATES: TemplateDef[] = [
  { key: 'tiltturn', label: 'Çift Açılım', hint: 'Tek kanat vasistas + açılım', w: 900, h: 1300, build: () => leaf('sash', 'tiltturn', 'right') },
  { key: 'turn', label: 'Tek Açılım', hint: 'Sadece yana açılır', w: 800, h: 1300, build: () => leaf('sash', 'turn', 'left') },
  { key: 'tilt', label: 'Vasistas', hint: 'Üstten içe devrilir', w: 800, h: 600, build: () => leaf('sash', 'tilt', 'right') },
  { key: 'fixed', label: 'Sabit', hint: 'Açılmayan cam', w: 1000, h: 1400, build: () => leaf('fixed') },
  { key: 'hok', label: 'Çift Kanat HOK', hint: 'Orta kayıtsız Fransız', w: 1400, h: 1500, build: () => leaf('pair', 'tiltturn', 'right') },
  {
    key: 'two',
    label: '2 Bölmeli',
    hint: 'Ortakayıtlı iki kanat',
    w: 1400,
    h: 1400,
    build: () => split('v', [{ size: null, field: leaf('sash', 'turn', 'left') }, { size: null, field: leaf('sash', 'tiltturn', 'right') }]),
  },
  {
    key: 'three',
    label: '3 Bölmeli',
    hint: 'Kanat · Sabit · Kanat',
    w: 2100,
    h: 1400,
    build: () =>
      split('v', [
        { size: null, field: leaf('sash', 'tiltturn', 'left') },
        { size: null, field: leaf('fixed') },
        { size: null, field: leaf('sash', 'tiltturn', 'right') },
      ]),
  },
  {
    key: 'transom',
    label: 'Üstü Vasistas',
    hint: 'Üst vasistas, alt sabit',
    w: 1000,
    h: 1800,
    build: (_w, h) => split('h', [{ size: Math.round(h * 0.35), field: leaf('sash', 'tilt') }, { size: null, field: leaf('fixed') }]),
  },
  {
    key: 'fixedTransom',
    label: 'Üstü Sabit',
    hint: 'Üst sabit, alt çift açılım',
    w: 1000,
    h: 2000,
    build: (_w, h) => split('h', [{ size: Math.round(h * 0.25), field: leaf('fixed') }, { size: null, field: leaf('sash', 'tiltturn', 'right') }]),
  },
  { key: 'door', label: 'Balkon Kapısı', hint: 'Tek kanat dilli kilitli', w: 900, h: 2150, build: () => leaf('door', 'turn', 'right') },
  { key: 'doorPair', label: 'Çift Kanat Kapı', hint: 'Veranda / bina giriş', w: 1600, h: 2200, build: () => leaf('doorPair', 'turn', 'right') },
  {
    key: 'entrance',
    label: 'Giriş Kapısı',
    hint: 'Panelli, 3 kancalı kilit',
    w: 1000,
    h: 2200,
    build: () => leaf('door', 'turn', 'right', { glass: 'PNL04101S', hardware: 'BINA_GIRIS_3KANCALI' }),
  },
  {
    key: 'balcony',
    label: 'Kapı + Pencere',
    hint: 'Balkon kapısı yanında pencere',
    w: 2000,
    h: 2200,
    build: () =>
      split('v', [
        { size: 850, field: leaf('door', 'turn', 'left') },
        { size: null, field: split('h', [{ size: null, field: leaf('sash', 'tiltturn', 'right') }, { size: 700, field: leaf('fixed') }]) },
      ]),
  },
]
