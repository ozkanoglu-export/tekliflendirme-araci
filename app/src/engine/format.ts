import type { Catalog, CurrencyCode } from './types'

export const CURRENCY_SYMBOL: Record<CurrencyCode, string> = { EUR: '€', USD: '$', TRY: '₺', GBP: '£', CHF: 'CHF', RUB: '₽' }

const LOCALE: Record<CurrencyCode, string> = { EUR: 'de-DE', USD: 'en-US', TRY: 'tr-TR', GBP: 'en-GB', CHF: 'de-CH', RUB: 'ru-RU' }

/** EUR bazlı tutarı seçili para birimine çevirip biçimlendirir */
export function money(eur: number, currency: CurrencyCode, catalog: Catalog, opts: { decimals?: number } = {}): string {
  const v = eur * (catalog.exchangeRates[currency] ?? 1)
  const d = opts.decimals ?? 2
  const n = v.toLocaleString(LOCALE[currency] ?? 'tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d })
  return currency === 'USD' || currency === 'GBP' ? `${CURRENCY_SYMBOL[currency]}${n}` : `${n} ${CURRENCY_SYMBOL[currency]}`
}

export function num(v: number, d = 2): string {
  return v.toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d })
}

/**
 * Ölçü girişi: "1250", "1250mm", "125cm", "1,25m", "49 1/4\"", "49.25in".
 * Birim yazılmazsa milimetre kabul edilir (eski sürümdeki "300'den küçükse cm" tahmini kaldırıldı).
 */
export function parseDimension(input: string | number): number | null {
  if (typeof input === 'number') return Number.isFinite(input) ? Math.round(input) : null
  const s = input.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!s) return null
  const inch = s.match(/^(\d+(?:[.,]\d+)?)?\s*(?:(\d+)\/(\d+))?\s*(?:"|in|inch|inç)$/)
  if (inch && (inch[1] || inch[2])) {
    const whole = inch[1] ? parseFloat(inch[1].replace(',', '.')) : 0
    const frac = inch[2] ? parseInt(inch[2]) / Math.max(1, parseInt(inch[3])) : 0
    return Math.round((whole + frac) * 25.4)
  }
  const m = s.match(/^(\d+(?:[.,]\d+)?)\s*(mm|cm|m)?$/)
  if (!m) return null
  const v = parseFloat(m[1].replace(',', '.'))
  const unit = m[2] ?? 'mm'
  const mm = unit === 'm' ? v * 1000 : unit === 'cm' ? v * 10 : v
  return Math.round(mm)
}

export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function formatDate(iso: string, lang: string): string {
  const d = new Date(iso + 'T12:00:00')
  if (isNaN(d.getTime())) return iso
  const loc: Record<string, string> = { TR: 'tr-TR', EN: 'en-GB', DE: 'de-DE', IT: 'it-IT', RU: 'ru-RU', FR: 'fr-FR' }
  return d.toLocaleDateString(loc[lang] ?? 'tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })
}
