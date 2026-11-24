import type { AppSettings, Catalog, CasementDeductions, SeriesLimits } from './types'

/** Katalog şeması değiştikçe artırılır; eski localStorage kayıtları buna göre göç ettirilir. */
export const CATALOG_VERSION = 5

/**
 * Adopen kanatlı seriler için düşümler.
 * Kaynak: eski PenCAD 4.5 formülleri (Kasa W+6, Kanat W−68+6, Tek kanat cam W−190,
 * Sabit cam W−94, HOK kanat (W−80)/2+6, HOK cam (W−318)/2, Kapı cam W−250, eşikli H−228).
 * ⚠ Ortakayıt eksen düşümleri eski programdaki "yatay bölünmüş" mantığıyla aynıdır;
 *   Adopen teknik kataloğundan teyit edilmelidir.
 */
export const ADOPEN_CASEMENT_DEDUCTIONS: CasementDeductions = {
  weldAllowance: 6,
  frameToFixedGlass: 47,
  frameToSash: 34,
  mullionAxisToSash: 34,
  mullionAxisToFixedGlass: 47,
  frameToMullionEnd: 42,
  mullionAxisToMullionEnd: 42,
  sashToGlass: 61,
  doorSashToGlass: 91,
  thresholdToSash: 14,
  thresholdSashToGlassBottom: 89,
  thresholdLengthDeduct: 40,
  pairGap: 12,
  pairMeetingToGlass: 58,
  pairMeetingToGlassDoor: 88,
  hokFromSashHeight: 72,
  hokFromSashHeightThreshold: 67,
}

const CASEMENT_LIMITS: SeriesLimits = {
  sashMaxWidth: 1300,
  sashMaxHeight: 2400,
  sashMinWidth: 380,
  sashMinHeight: 380,
  doorProfileAboveHeight: 2000,
  glassMaxArea: 4.5,
}

const SLIDE_LIMITS: SeriesLimits = {
  sashMaxWidth: 3000,
  sashMaxHeight: 2700,
  sashMinWidth: 500,
  sashMinHeight: 600,
  doorProfileAboveHeight: 99999,
  glassMaxArea: 6,
}

export const DEFAULT_CATALOG: Catalog = {
  version: CATALOG_VERSION,
  exchangeRates: { EUR: 1, USD: 1.1, TRY: 38.5, GBP: 0.85, CHF: 0.95, RUB: 105 },
  ratesDate: '2026-11-24',
  colors: {
    WHITE: { key: 'WHITE', code: '.19.00', name: 'Beyaz', tier: 'white', fill: '#ffffff', stroke: '#8b95a5' },
    GOLDEN_OAK: { key: 'GOLDEN_OAK', code: '.303', name: 'Altın Meşe', tier: 'colored', fill: '#b46527', stroke: '#5a2a0c', woodgrain: true },
    ANTHRACITE: { key: 'ANTHRACITE', code: '.305', name: 'Antrasit Gri', tier: 'colored', fill: '#3a4350', stroke: '#141a22' },
    BLACK: { key: 'BLACK', code: '.308', name: 'Mat Siyah', tier: 'colored', fill: '#1f2024', stroke: '#000000' },
  },
  series: {
    ATLANTIK_750: {
      key: 'ATLANTIK_750',
      brand: 'ADOPEN',
      name: 'Atlantik 750',
      shortName: 'ATLANTİK 750',
      kind: 'casement',
      thickness: 70,
      chambers: 5,
      uf: 1.3,
      hardwareBrand: 'ACCADO',
      profiles: {
        frame: { code: 'P.A.75001000.600.0.B', name: 'Kasa Profili', white: 11.31, colored: 13.57, barLength: 6000 },
        winSash: { code: 'P.A.75002200.600.0.B', name: 'Damlalıklı Kanat Profili', white: 12.67, colored: 15.5, barLength: 6000 },
        doorSash: { code: 'P.A.75002100.600.0.B', name: 'Kapı Kanat Profili', white: 15.02, colored: 18.34, barLength: 6000 },
        mullion: { code: 'P.A.75003000.600.0.B', name: 'Ortakayıt Profili', white: 12.29, colored: 15.05, barLength: 6000 },
        hok: { code: 'P.A.75003101.600.0.B', name: 'Çift Kanat Ara Profili', white: 11.9, colored: 14.18, barLength: 6000 },
      },
      deductions: ADOPEN_CASEMENT_DEDUCTIONS,
      faces: { frame: 58, mullion: 76 },
      limits: CASEMENT_LIMITS,
    },
    PASIFIK_888: {
      key: 'PASIFIK_888',
      brand: 'ADOPEN',
      name: 'Pasifik 888',
      shortName: 'PASİFİK 888',
      kind: 'casement',
      thickness: 80,
      chambers: 6,
      uf: 0.9,
      hardwareBrand: 'ACCADO',
      profiles: {
        frame: { code: 'P.A.88801000.600.0.B', name: 'Kasa Profili', white: 13.64, colored: 16.54, barLength: 6000 },
        winSash: { code: 'P.A.88802000.600.0.B', name: 'Pencere Kanat Profili', white: 14.06, colored: 17.35, barLength: 6000 },
        doorSash: { code: 'P.A.88802100.600.0.B', name: 'Kapı Kanat Profili', white: 16.62, colored: 20.27, barLength: 6000 },
        mullion: { code: 'P.A.88803000.600.0.B', name: 'Sabit Ortakayıt Profili', white: 15.19, colored: 18.71, barLength: 6000 },
        hok: { code: 'P.A.88803100.600.0.B', name: 'Çift Kanat Ara Profili', white: 12.04, colored: 13.1, barLength: 6000 },
      },
      deductions: ADOPEN_CASEMENT_DEDUCTIONS,
      faces: { frame: 60, mullion: 80 },
      limits: CASEMENT_LIMITS,
    },
    PERGE_SURME: {
      key: 'PERGE_SURME',
      brand: 'ADOPEN',
      name: 'Perge Çiftli Sürme',
      shortName: 'PERGE SÜRME',
      kind: 'slide2',
      thickness: 70,
      uf: 1.8,
      hardwareBrand: 'ACCADO',
      profiles: {
        frame: { code: 'P.A.23201106.650.0.0', name: 'Sürme Kasa Çift Ray', white: 16.45, colored: 20.15, barLength: 6500 },
        winSash: { code: 'P.A.23202300.650.0.B', name: 'Sürme Kanat Kıl Fitilli', white: 16.45, colored: 20.15, barLength: 6500 },
        doorSash: { code: 'P.A.23202300.650.0.B', name: 'Sürme Kanat Kıl Fitilli', white: 16.45, colored: 20.15, barLength: 6500 },
        mullion: { code: 'P.A.23203000.650.0.B', name: 'Sürme Ortakayıt', white: 14, colored: 17, barLength: 6500 },
        hok: { code: 'P.A.23203100.650.0.B', name: 'Sürme Ara Profil', white: 10, colored: 12, barLength: 6500 },
      },
      deductions: ADOPEN_CASEMENT_DEDUCTIONS,
      faces: { frame: 50, mullion: 70 },
      limits: SLIDE_LIMITS,
    },
    AKDENIZ_HEBESCHIEBE: {
      key: 'AKDENIZ_HEBESCHIEBE',
      brand: 'ADOPEN',
      name: 'Akdeniz Hebeschiebe',
      shortName: 'AKDENİZ HS',
      kind: 'liftslide',
      thickness: 185,
      uf: 1.5,
      hardwareBrand: 'ACCADO',
      profiles: {
        frame: { code: 'P.A.93001000.600.0.0', name: 'Hebeschiebe Kasa', white: 20, colored: 24, barLength: 6000 },
        winSash: { code: 'P.A.93002301.600.0.B', name: 'Hebeschiebe Kanat', white: 22.5, colored: 27, barLength: 6000 },
        doorSash: { code: 'P.A.93002301.600.0.B', name: 'Hebeschiebe Kanat', white: 22.5, colored: 27, barLength: 6000 },
        mullion: { code: 'P.A.86003000.600.0.B', name: '800 Seri Ortakayıt', white: 18, colored: 21, barLength: 6000 },
        hok: { code: 'P.A.93003100.600.0.B', name: 'Hebeschiebe Ara Profil', white: 15, colored: 18, barLength: 6000 },
      },
      deductions: ADOPEN_CASEMENT_DEDUCTIONS,
      faces: { frame: 64, mullion: 90 },
      limits: SLIDE_LIMITS,
    },
  },
  glasses: {
    DC4164SN: { key: 'DC4164SN', name: '4+16+4 Isıcam Sinerji (Low-E)', ug: 1.0, price: 51.29 },
    DC4124SN: { key: 'DC4124SN', name: '4+12+4 Isıcam Sinerji (Sürme)', ug: 1.3, price: 51.29 },
    DC4164DC: { key: 'DC4164DC', name: '4+16+4 Standart Düz Isıcam', ug: 2.7, price: 47.28 },
    DC4164KF: { key: 'DC4164KF', name: '4+16+4 Isıcam Konfor (Solar Low-E)', ug: 1.0, price: 55.3 },
    ST4164SN: { key: 'ST4164SN', name: '4+16+4 Satina (Buzlu) Sinerji', ug: 1.0, price: 60.53, frosted: true },
    DCTMPR: { key: 'DCTMPR', name: '4+16+4 Çift Taraf Temperli Isıcam', ug: 1.1, price: 59.31 },
    SN4124LM: { key: 'SN4124LM', name: '44.2+12+4 Sinerji Lamine Güvenlik Camı', ug: 1.0, price: 83.89 },
    SN4164TP146SN: { key: 'SN4164TP146SN', name: '4+16+4+16+4 Üçlü Cam Çift Sinerji', ug: 0.5, price: 96.13 },
    JZ4204DC: { key: 'JZ4204DC', name: '4+20+4 Mıknatıslı Jaluzili Isıcam', ug: 1.1, price: 192.68 },
    PNL58114S: { key: 'PNL58114S', name: '24 mm Düz Sandviç Panel', ug: 1.2, price: 150, panel: true },
    PNL04101S: { key: 'PNL04101S', name: 'Dekoratif Kapı Paneli 04101s', ug: 0.9, price: 450, panel: true },
  },
  hardware: {
    VASISTAS: { key: 'VASISTAS', name: 'Vasistas Menteşe Seti', price: 9.49 },
    TEK_CIFT_ACILIM: { key: 'TEK_CIFT_ACILIM', name: 'Tek Kanat Çift Açılım Güvenlikli Set', price: 30.91 },
    KAPI_LOK: { key: 'KAPI_LOK', name: 'Tek Kanat Kapı Kilitli Barelli Set', price: 43.74 },
    KAPI_CIFT_ACILIM_MENTESE: { key: 'KAPI_CIFT_ACILIM_MENTESE', name: 'Tek Kanat Kapı Kilitli Set (Çift Açılım)', price: 47.67 },
    HOK_SET: { key: 'HOK_SET', name: 'Çift Kanat HOK Çift Açılım Levyeli Set', price: 52.3 },
    HOK_KAPI_SET: { key: 'HOK_KAPI_SET', name: 'Çift Kanat HOK Kapı Kilitli Set', price: 74.17 },
    BINA_GIRIS_3KANCALI: { key: 'BINA_GIRIS_3KANCALI', name: 'Bina Giriş 3 Kancalı Güvenlik Kilidi', price: 500 },
    SURME_PERGE_SET: { key: 'SURME_PERGE_SET', name: 'Perge Çiftli Sürme Kol Seti', price: 92.72 },
    HEBESCHIEBE_160KG: { key: 'HEBESCHIEBE_160KG', name: 'Akdeniz Hebeschiebe 160 kg Set', price: 1500 },
  },
  extras: {
    ALU_THRESHOLD_20MM: { key: 'ALU_THRESHOLD_20MM', name: '20 mm Alüminyum Düşük Eşik', unit: 'Mt', price: 100 },
    SHUTTER_MONO_195: { key: 'SHUTTER_MONO_195', name: '195 mm Monoblok Motorlu Panjur', unit: 'M2', price: 110 },
    GRID_MUNTIN: { key: 'GRID_MUNTIN', name: 'Cam İçi Karolaj', unit: 'Mt', price: 13.63 },
    FRAME_EXT_35X70: { key: 'FRAME_EXT_35X70', name: '35x70 Kasa Yükseltme Profili', unit: 'Mt', price: 5.61, colored: 6.87 },
    FLYSCREEN_SABIT: { key: 'FLYSCREEN_SABIT', name: 'Sabit Sineklik', unit: 'Mt', price: 19.02 },
    FLYSCREEN_MENTESELI: { key: 'FLYSCREEN_MENTESELI', name: 'Menteşeli Sineklik', unit: 'Mt', price: 19.02 },
    FLYSCREEN_PILELI: { key: 'FLYSCREEN_PILELI', name: 'Pileli Sineklik', unit: 'Mt', price: 34.87 },
  },
}

export const DEFAULT_SETTINGS: AppSettings = {
  company: {
    name: 'ÖZKANOĞLU',
    legalName: 'ÖZKANOĞLU İNŞAAT TAAHHÜT VE TİCARET LTD. ŞTİ.',
    slogan: 'HAYATA PENCERE AÇ',
    address: 'Yapraklı Bulvarı Şht. A.Kadir Acar Sok. No: 8 / ÇANKIRI — TÜRKİYE',
    phone: '444 0 884 · +90 376 212 20 23',
    email: 'info@ozkanoglu.com.tr',
    web: 'www.ozkanoglu.com.tr',
    bankName: 'YAPI VE KREDİ BANKASI A.Ş. — Çankırı Şubesi',
    bankAccountName: 'ÖZKANOĞLU İNŞAAT TAAHHÜT LTD. ŞTİ.',
    iban: 'TR50 0006 7010 0000 0029 1132 63',
    swift: 'YAPITRISXXX',
  },
  exportRules: {
    packagingPerM2: 15,
    palletBase: 400,
    palletBaseArea: 30,
    palletStepArea: 20,
    palletStepPrice: 200,
    freightPerBlock: 1000,
    freightBlockArea: 30,
  },
  cut: { kerf: 4, barTrim: 0, reusableOffcut: 800 },
  symbolConvention: 'din',
  psiGlass: 0.06,
}

/** Deep clone — katalog/ayar nesnelerini güvenle kopyalamak için */
export function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}
