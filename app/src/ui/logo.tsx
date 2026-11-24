import { BrandMark } from '../App'
import type { CompanyInfo } from '../engine/types'
import { cx } from './kit'

/** Görsel dosyasını data URL'e çevirir; büyük görselleri küçültür (localStorage için) */
export async function fileToLogo(file: File, maxW = 900, maxH = 360): Promise<string> {
  if (file.size > 8 * 1024 * 1024) throw new Error('Dosya 8 MB üstü')
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result))
    r.onerror = () => rej(new Error('Dosya okunamadı'))
    r.readAsDataURL(file)
  })
  if (file.type === 'image/svg+xml') return dataUrl
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image()
    i.onload = () => res(i)
    i.onerror = () => rej(new Error('Görsel açılamadı'))
    i.src = dataUrl
  })
  const k = Math.min(1, maxW / img.width, maxH / img.height)
  if (k === 1 && file.size < 300 * 1024) return dataUrl
  const c = document.createElement('canvas')
  c.width = Math.round(img.width * k)
  c.height = Math.round(img.height * k)
  const ctx = c.getContext('2d')
  if (!ctx) return dataUrl
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, c.width, c.height)
  return c.toDataURL('image/png')
}

/**
 * Koyu zeminde firma logosu: beyaz/koyu-zemin logosu varsa doğrudan,
 * yoksa açık logo beyaz bir cam kapsülde, hiç yoksa marka işareti + isim.
 */
export function LogoOnDark({ co, height = 30, className }: { co: CompanyInfo; height?: number; className?: string }) {
  if (co.logoDark) return <img src={co.logoDark} alt={co.name} style={{ height }} className={cx('w-auto object-contain', className)} />
  if (co.logo)
    return (
      <span className={cx('inline-flex items-center rounded-lg bg-white/95 px-2 py-1 shadow-[0_4px_14px_-6px_rgba(0,0,0,0.5)]', className)}>
        <img src={co.logo} alt={co.name} style={{ height: height - 8 }} className="w-auto object-contain" />
      </span>
    )
  return null
}

/** Açık zeminde (beyaz kâğıt) firma logosu; yoksa marka işareti + isim */
export function LogoOnLight({ co, height = 24, className }: { co: CompanyInfo; height?: number; className?: string }) {
  if (co.logo) return <img src={co.logo} alt={co.name} style={{ height }} className={cx('w-auto object-contain', className)} />
  return (
    <span className={cx('flex items-center gap-2.5', className)}>
      <BrandMark size={height} />
      <span className="font-extrabold tracking-[0.16em] text-[#002b5c]" style={{ fontSize: height * 0.55 }}>
        {co.name}
      </span>
    </span>
  )
}
