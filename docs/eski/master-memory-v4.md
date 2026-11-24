# Özkanoğlu PenCAD & Teklif Stüdyosu — Master Bağlam ve Hafıza Dosyası

Bu belge, **Özkanoğlu PenCAD & Teklif Stüdyosu** uygulamasının mimarisini, iş mantığını, teknik hesaplama motorunu ve geliştirme yol haritasını tam detaylarıyla tanımlayan ana sistem hafızasıdır. Claude, Antigravity, Cursor veya diğer gelişmiş AI sistemlerinde projeyi devralmak ve profesyonelleştirmek için tasarlanmıştır.

---

## 1. Proje Özeti ve Temel Vizyon

* **Proje Adı:** Özkanoğlu PenCAD & Teklif Stüdyosu
* **Sektör:** Alüminyum, Cam Balkon, Giyotin Cam, Otomatik Tente & Cephe Sistemleri Sanayi
* **Temel Amacı:** 
  1. Müşteri ölçülerine ve tercihlerine göre anlık **2D CAD teknik çizimlerini ve kesit analizlerini** görselleştirmek.
  2. Doğru malzeme reçetesi (BOM - Bill of Materials) çıkararak **fire payı, işçilik, aksesuar ve cam/profil maliyetlerini** hatasız hesaplamak.
  3. Müşteri odaklı, kurumsal ve baskıya hazır **profesyonel PDF teklif belgeleri ve teknik raporlar** oluşturmak.
  4. Atölye imalatçıları için hassas **kesim listeleri (Optimization & Cut Lists)** sunmak.

---

## 2. Teknik Mimari ve Mevcut Teknoloji Stack'i

* **Frontend Framework:** React (Tailwind CSS, Lucide React Icon Kütüphanesi)
* **Görselleştirme Motoru:** HTML5 Canvas / Responsive SVG tabanlı interaktif 2D CAD Render motoru (Ölçülendirme çizgileri, panel simülasyonu, yakınlaşma/kaydırma desteği).
* **Veri Yönetimi:** React State & LocalStorage (Proje kaydetme, şablon saklama ve teklif geçmişi yönetimi).
* **Raporlama:** Dynamic HTML-to-PDF / Print CSS formatlı teklif motoru.

---

## 3. Matematiksel & İş Mantığı Hesaplama Motoru (Business Logic)

Sistem aşağıdaki parametrelere dayanarak anlık maliyet ve ölçü hesabı gerçekleştirir:

### A. Geometrik ve Panel Dağılım Hesapları
* **En ($W$) ve Boy ($H$):** Milimetre ($mm$) cinsinden alınır, metrekare ($m^2$) hesabı $m^2 = \frac{W}{1000} \times \frac{H}{1000}$ olarak yapılır.
* **Kanat Dağılımı:** Toplam genişliğe göre panel sayısı $N = \lceil W / W_{max} \rceil$ algoritması ile tespit edilir. Kanat biniş payları (Overlap Allowance) eklenerek net cam genişliği bulunur:
  $$\text{Cam Genişliği} = \frac{W + (\text{Kanat Sayısı} - 1) \times \text{Biniş Payı}}{\text{Kanat Sayısı}}$$

### B. Maliyet ve Reçete (BOM) Motoru
$$\text{Toplam Maliyet} = (\text{Cam Maliyeti}) + (\text{Profil Maliyeti}) + (\text{Aksesuar/Fitil Maliyeti}) + (\text{Motor/Otomasyon}) + (\text{İşçilik & Fire})$$
* **Cam Hesabı:** $\text{Alan } (m^2) \times \text{Cam Tipi Birim Fiyatı} \times (\text{Temperli/Isıcam Çarpanı})$
* **Profil Hesabı:** Kasa, Kanat, Alt/Üst Ray uzunlukları (Çevre $L = 2(W+H)$ bazlı metre tül / $mtull$) $\times$ Alüminyum $\text{Kg/m}$ $\times$ $\text{Kg Fiyatı}$.
* **Kâr ve Teklif Hesabı:** 
  $$\text{Satış Fiyatı} = \frac{\text{Net Maliyet}}{1 - (\text{Kâr Marjı \%} / 100)} \times (1 - \text{İskonto \%})$$

---

## 4. Modül & Özellik Listesi (Feature Architecture)

1. **İnteraktif CAD Tuvali (Canvas Engine):**
   - Anlık en/boy dinamik boyutlandırma.
   - Kanat açılım yönleri, sabit cam gösterimleri, motor yönü çizimleri.
   - Mimari standartlarda teknik ölçülendirme (Dimension Lines, Arrows).
   - Cam rengi (Şeffaf, Füme, Yeşil, Mavi, Bronz) ve Profil Rengi (RAL Kodları: 9016 Beyaz, 7016 Antrasit, Ahşap Kaplama vb.) kaplamaları.

2. **Dinamik Konfigüratör:**
   - Sistem Türleri: Isıcamlı Katlanır Cam Balkon, Giyotin Cam (Motorlu), Sürme Cam (Eşikli/Eşiksiz), Bioklimatik Pergola, Zip Perde.
   - Malzeme Tercihleri: Cam Kalınlığı ($8mm, 10mm, 4+12+4mm$), Profil Serisi (Ekstra Ağır Tip, Standart).
   - Ekstra Aksesuarlar: Mıknatıslı fitil, Rüzgar kilidi, Somfy/Becker Motor, Yağmur sensörü.

3. **Teklif & Müşteri Yönetim Paneli:**
   - Müşteri Adı, Firma, Adres, İletişim, Geçerlilik Tarihi.
   - Şirket Logosu, Kurumsal Renk Paleti ve Şartname/Garanti Sözleşmesi metinleri.
   - Tek Satırlı İskonto, KDV Dahil/Hariç ve Para Birimi (TRY, EUR, USD) desteği.

4. **Atölye İmalat ve Kesim Listesi (Workshop Mode):**
   - Alüminyum profil kesim açıları ($45^\circ / 90^\circ$).
   - Cam sipariş ölçüleri ($mm$ hassasiyetinde).
   - Aksesuar sarfiyat listesi (Teker seti, kilit, silikon sayısı).

---

## 5. Claude ve Antigravity İçin Geliştirme Yol Haritası (Prompting Guidance)

Bu hafıza dosyasını Claude veya Antigravity projelerinde kullanırken aşağıdaki yönlendirmelerle sistemi profesyonelleştirebilirsiniz:

### Adım 1: Mimari Dönüşüm (Modularization & Clean Code)
* **Hedef:** Tek dosyalı yapıyı `components/`, `engine/`, `services/`, `types/` klasör yapısına bölmek.
* **Komut İstemi Örneği:** *"Bu hafıza dosyasındaki PenCAD mimarisini clean architecture prensiplerine göre TypeScript tabanlı modüler React bileşenlerine ayır."*

### Adım 2: 3D CAD Görselleştirme (Three.js Entegrasyonu)
* **Hedef:** 2D Canvas çizimini Three.js/React Three Fiber ile interaktif 3D balkona dönüştürmek.
* **Komut İstemi Örneği:** *"Hafıza dosyasında belirtilen kanat ve profil hesaplarına uygun olarak Three.js üzerinde 3D açılır-kapanır cam balkon simülasyonu yaz."*

### Adım 3: Fire ve Profil Kesim Optimizasyonu (Bin-Packing Algorithm)
* **Hedef:** 6 metrelik standart alüminyum profillerden minimum fire verecek 1D kesim optimizasyon algoritması eklemek.
* **Komut İstemi Örneği:** *"PenCAD profil kesim listeleri için First-Fit Decreasing (FFD) veya Simüle Edilmiş Tavlama algoritması kullanarak kesim optimizasyon servisi oluştur."*

### Adım 4: Cloud Backend Entegrasyonu (Supabase / Firebase)
* **Hedef:** PostgreSQL veritabanı ile teklif saklama, PDF linki oluşturma ve kullanıcı oturumu açma.
* **Komut İstemi Örneği:** *"Teklif stüdyosu için Supabase PostgreSQL veri şemasını (Projects, Quotations, Products, Customers) tasarla ve Row Level Security (RLS) politikalarını oluştur."*

---

## 6. Veri Modeli (TypeScript Interfaces)

```typescript
export interface SystemConfig {
  id: string;
  systemType: 'folding_glass' | 'guillotine' | 'sliding' | 'pergola';
  width: number; // mm
  height: number; // mm
  panelCount: number;
  glassType: '8mm_toughened' | '10mm_toughened' | '4_12_4_insulated';
  glassColor: 'clear' | 'smoke' | 'green' | 'bronze';
  profileColor: string; // RAL Code or Preset
  motorized: boolean;
  motorBrand?: 'somfy' | 'becker' | 'local';
  accessories: Array<{ id: string; name: string; quantity: number; unitPrice: number }>;
}

export interface QuoteCalculation {
  rawMaterialCost: number;
  laborCost: number;
  wasteCost: number;
  subtotal: number;
  marginPercent: number;
  discountPercent: number;
  vatPercent: number;
  finalPrice: number;
  currency: 'TRY' | 'USD' | 'EUR';
}
```

---

*Bu belge Özkanoğlu PenCAD projesinin ana referans hafızasıdır. Geliştirme araçlarına bağlam aktarımı için doğrudan bu metni kullanabilirsiniz.*