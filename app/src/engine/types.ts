/* ==========================================================================
   Özkanoğlu PenCAD — Çekirdek veri modeli
   Tüm ölçüler milimetre (mm), tüm katalog fiyatları EUR bazlıdır.
   ========================================================================== */

export type CurrencyCode = 'EUR' | 'USD' | 'TRY' | 'GBP' | 'CHF' | 'RUB'
export type LangCode = 'TR' | 'EN' | 'DE' | 'IT' | 'RU' | 'FR'
export type ColorTier = 'white' | 'colored'

/* ---------- Katalog ---------- */

export type ProfileRole = 'frame' | 'winSash' | 'doorSash' | 'mullion' | 'hok'

export interface ProfileItem {
  code: string
  name: string
  /** EUR / metre, beyaz */
  white: number
  /** EUR / metre, renkli (folyo kaplı) */
  colored: number
  /** Boy uzunluğu (mm). Adopen kodundaki .600 = 6,00 m, .650 = 6,50 m */
  barLength: number
}

/** Sistem tipi: kanatlı (tree ile serbest bölme), çift raylı sürme veya kaldır-sür. */
export type SystemKind = 'casement' | 'slide2' | 'liftslide'

/**
 * Düşüm tablosu. "Kenar" = kasa dış kenarı veya ortakayıt ekseni.
 * Değerler Adopen eski PenCAD formüllerinden türetilmiştir; seri kataloğundan teyit edilmelidir.
 */
export interface CasementDeductions {
  /** Kesim payı (kaynak payı), parça başına toplam (+3/uç) */
  weldAllowance: number
  /** Kasa kenarı → sabit cam kenarı (her taraf) */
  frameToFixedGlass: number
  /** Kasa kenarı → kanat dış kenarı (her taraf) */
  frameToSash: number
  /** Ortakayıt ekseni → kanat dış kenarı */
  mullionAxisToSash: number
  /** Ortakayıt ekseni → sabit cam kenarı */
  mullionAxisToFixedGlass: number
  /** Kasa kenarı → ortakayıt ucu (kesim boyu için) */
  frameToMullionEnd: number
  /** Ortakayıt ekseni → dik ortakayıt ucu (T birleşim) */
  mullionAxisToMullionEnd: number
  /** Pencere kanadı dış kenarı → cam kenarı */
  sashToGlass: number
  /** Kapı kanadı dış kenarı → cam kenarı */
  doorSashToGlass: number
  /** Alüminyum düşük eşikte alt kenar → kanat */
  thresholdToSash: number
  /** Eşikli kapıda kanat alt kenarı → cam */
  thresholdSashToGlassBottom: number
  /** Alüminyum eşik boyu = kasa genişliği − bu değer */
  thresholdLengthDeduct: number
  /** Çift kanat (HOK): iki kanat arası toplam boşluk */
  pairGap: number
  /** HOK birleşim tarafında kanat → cam (pencere) */
  pairMeetingToGlass: number
  /** HOK birleşim tarafında kanat → cam (kapı) */
  pairMeetingToGlassDoor: number
  /** HOK ara profil boyu = kanat yüksekliği − bu değer */
  hokFromSashHeight: number
  /** Eşikli HOK ara profil düşümü */
  hokFromSashHeightThreshold: number
}

/** Çizim için görünür yüzey genişlikleri (mm) */
export interface DrawFaces {
  frame: number
  mullion: number
}

export interface SeriesLimits {
  sashMaxWidth: number
  sashMaxHeight: number
  sashMinWidth: number
  sashMinHeight: number
  /** Bu yükseklikten büyük pencere kanadı otomatik kapı kanat profiline geçer */
  doorProfileAboveHeight: number
  glassMaxArea: number
}

export interface Series {
  key: string
  brand: string
  name: string
  shortName: string
  kind: SystemKind
  thickness: number
  chambers?: number
  uf: number
  hardwareBrand: string
  profiles: Record<ProfileRole, ProfileItem>
  deductions: CasementDeductions
  faces: DrawFaces
  limits: SeriesLimits
}

export interface ProfileColor {
  key: string
  code: string
  name: string
  tier: ColorTier
  fill: string
  stroke: string
  /** Ahşap desenli folyo mu (çizimde damar dokusu) */
  woodgrain?: boolean
}

export interface GlassItem {
  key: string
  name: string
  ug: number
  /** EUR / m² */
  price: number
  /** Panel (opak dolgu) ise true */
  panel?: boolean
  /** Satina / buzlu gibi opak cam */
  frosted?: boolean
}

export interface HardwareItem {
  key: string
  name: string
  price: number
}

export type ExtraUnit = 'Mt' | 'M2' | 'Adet' | 'EUR'
export interface ExtraItem {
  key: string
  name: string
  unit: ExtraUnit
  price: number
  /** Renkli profil için farklı fiyat */
  colored?: number
}

export interface Catalog {
  version: number
  exchangeRates: Record<CurrencyCode, number>
  ratesDate: string
  colors: Record<string, ProfileColor>
  series: Record<string, Series>
  glasses: Record<string, GlassItem>
  hardware: Record<string, HardwareItem>
  extras: Record<string, ExtraItem>
}

/* ---------- Poz (çizim) modeli ---------- */

export type SashOpening = 'turn' | 'tiltturn' | 'tilt'
export type Hinge = 'left' | 'right'
export type LeafFill = 'fixed' | 'sash' | 'door' | 'pair' | 'doorPair'

export interface LeafField {
  kind: 'leaf'
  id: string
  fill: LeafFill
  /** Sadece 'sash' için */
  opening: SashOpening
  /** Kanat menteşe tarafı. Pair için: aktif (kollu) kanadın menteşesi değil, aktif kanadın bulunduğu taraf */
  hinge: Hinge
  /** Pozun cam tipini bu alan için ezer (ör. kapı altı panel) */
  glass?: string
  /** Aksesuar setini ezer (ör. bina giriş kilidi) */
  hardware?: string
}

export interface SplitChild {
  /** Eksen ölçüsü (mm). null = kalan alanı eşit paylaşır */
  size: number | null
  field: Field
}

export interface SplitField {
  kind: 'split'
  id: string
  /** 'v' = dikey ortakayıt(lar) ile yan yana; 'h' = yatay kayıt ile üst üste */
  dir: 'v' | 'h'
  children: SplitChild[]
}

export type Field = LeafField | SplitField

export type ThresholdType = 'none' | 'alu20'
export type FlyscreenType = 'NONE' | 'SABIT' | 'MENTESELI' | 'PILELI_YATAY' | 'PILELI_DIKEY'

export interface Position {
  id: string
  title: string
  qty: number
  /** Toplam genişlik (mm) */
  width: number
  /** Toplam yükseklik (mm) — panjur 'subtract' modunda kutu dahil */
  height: number
  series: string
  color: string
  glass: string
  root: Field
  /** Sürme sistemlerde hareketli / aktif kanat tarafı */
  activeSide: Hinge
  shutter: { enabled: boolean; mode: 'subtract' | 'add' }
  threshold: ThresholdType
  flyscreen: FlyscreenType
  muntin: boolean
  frameExt: boolean
  note?: string
}

export type Incoterm = 'EXW' | 'FCA' | 'FOB' | 'CFR' | 'CIF' | 'DAP' | 'DDP'

export interface Customer {
  name: string
  company: string
  address: string
  country: string
  contact: string
  phone: string
  email: string
}

export interface Commercial {
  currency: CurrencyCode
  language: LangCode
  incoterm: Incoterm
  incotermPlace: string
  discountPercent: number
  /** Satış fiyatı üzerinden kâr marjı (%) — fiyat = maliyet / (1 − marj) */
  marginPercent: number
  /** Profil fire payı (%) */
  wastePercent: number
  /** Ek işçilik/genel gider (EUR / poz adedi) */
  laborPerUnit: number
  /** Ek işçilik/genel gider (EUR / m²) */
  laborPerM2: number
  vatPercent: number
  validityDays: number
  showBank: boolean
  /** Manuel tutar girilirse otomatik hesap ezilir (EUR) */
  freightOverride: number | null
  palletOverride: number | null
  packagingOverride: number | null
}

export interface Project {
  id: string
  quoteNo: string
  date: string
  revision: number
  projectName: string
  drawnBy: string
  customer: Customer
  commercial: Commercial
  positions: Position[]
  updatedAt: string
}

/* ---------- Ayarlar ---------- */

export interface CompanyInfo {
  name: string
  legalName: string
  slogan: string
  address: string
  phone: string
  email: string
  web: string
  bankName: string
  bankAccountName: string
  iban: string
  swift: string
}

export interface ExportCostRules {
  packagingPerM2: number
  palletBase: number
  palletBaseArea: number
  palletStepArea: number
  palletStepPrice: number
  freightPerBlock: number
  freightBlockArea: number
}

export interface CutSettings {
  kerf: number
  barTrim: number
  /** Bu boydan uzun artıklar stoğa (kullanılabilir artık) sayılır */
  reusableOffcut: number
}

export type SymbolConvention = 'din' | 'classic'

export interface AppSettings {
  company: CompanyInfo
  exportRules: ExportCostRules
  cut: CutSettings
  symbolConvention: SymbolConvention
  psiGlass: number
}
