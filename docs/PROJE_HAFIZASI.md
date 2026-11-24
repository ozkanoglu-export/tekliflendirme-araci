# Özkanoğlu PenCAD Stüdyo — Proje Hafızası (v5)

Bu dosya, projeyi devralacak geliştiriciler ve yapay zekâ araçları (Claude, Antigravity, Cursor) için ana bağlam dosyasıdır.
Eski "Master Memory" dosyasının yerini alır.

## 1. Amaç ve kapsam

- **Kullanıcı:** Özkanoğlu ihracat ve operasyon ekibi. Araç firma içinde kullanılır, dışarıya satılmaz.
- **Ürün:** PVC pencere ve kapı. Sıra: önce **Adopen** serileri eksiksiz oturacak, ardından diğer PVC markaları, en son alüminyum markaları eklenecek.
- **İki ana çıktı:**
  1. Çizerken işi hızlandıran bir stüdyo.
  2. Müşteriye gidecek, anlaşılır ve kaliteli bir A4 teklif.
- **Rakip referansları:** LogiKal (Orgadata/Forterro), Klaes, SchüCal. Fark yaratacağımız alanlar: çok dilli ihracat teklifi ve hız.

## 2. Teknik yapı

- React 19 + TypeScript (strict) + Tailwind 3 + Vite.
- `vite-plugin-singlefile` ile tüm uygulama **tek bir HTML** dosyası olarak çıkar.
- Testler Vitest ile yazılır.
- Veriler localStorage'da tutulur (anahtarlar `ozk.v5.*`). Katalog şeması değişirse `CATALOG_VERSION` artırılır.

```
app/src/
  engine/            ← arayüzden bağımsız, saf TypeScript (testli)
    types.ts         veri modeli (Catalog, Series, Position, Field ağacı, Project)
    catalog.ts       Adopen kataloğu, düşümler, varsayılan ayarlar
    fields.ts        bölme ağacı işlemleri + şablonlar
    geometry.ts      ağaç → mm dikdörtgenler (kasa, ortakayıt, kanat, cam). TEK KAYNAK
    bom.ts           kesim parçaları, cam listesi, maliyet, Uw, proje toplamları
    optimize.ts      6 m boy kesim optimizasyonu (FFD / best-fit, testere payı)
    project.ts       yeni proje/poz, eski PenCAD ve Gemini JSON içe aktarma
    i18n.ts          teklif metinleri, 6 dil
    describe.ts      açılım açıklamaları ("Çift açılım (sağ) + Sabit")
    format.ts        para birimi, tarih, ölçü girişi (mm/cm/m/inç)
  drawing/WindowDrawing.tsx   SVG teknik çizim (stüdyo / kâğıt / küçük resim)
  store/store.tsx             durum yönetimi, geri al/yinele, kalıcı kayıt
  views/                      Studio, Quote, Cost, Catalog, Projects
```

## 3. Poz modeli: bölme ağacı

Bir poz, kasa ölçüsü ve bir **alan ağacından** oluşur. Ağaçtaki her düğüm iki türden biridir:

- **split:** dikey (`v`) veya yatay (`h`) ortakayıtla bölünmüş alan. Her çocuğun eksen ölçüsü ya sabit mm olarak verilir ya da `null` (otomatik) bırakılır.
- **leaf:** bölünmemiş tek alan. Dolgu tipleri:
  - `fixed`: sabit cam
  - `sash`: kanat. Açılım `turn` (tek açılım), `tiltturn` (çift açılım) veya `tilt` (vasistas) olabilir; menteşe yönü sol veya sağ.
  - `door`: kapı
  - `pair`: HOK çift kanat
  - `doorPair`: çift kanat kapı

Alan bazında cam ve aksesuar seti ezilebilir. Örneğin kapı altına panel konabilir ya da bina giriş kilidi seçilebilir.

Sürme (`slide2`) ve kaldır-sür (`liftslide`) serilerinde ağaç kullanılmaz; bunlar sabit formüllerle hesaplanır.

## 4. Düşüm kuralları (Adopen, mm)

Değerler eski PenCAD 4.5 formüllerinden alındı ve testlerle doğrulandı.

| Ölçü | Formül |
|---|---|
| Kasa parçası | W+6, H+6 (45°) |
| Kanat | Kasa kenarından 34 içeride; parça +6 kaynak payı |
| Tek kanat cam | W−190 × H−190 |
| Sabit cam | W−94 × H−94 |
| HOK kanat | (W−80)/2 |
| HOK cam | (W−318)/2 × H−190 |
| HOK ara profil | H−140 (eşikli: H−115) |
| Kapı cam | W−250 × H−250 |
| Kapı cam (eşikli) | W−250 × H−228; kanat H−48 |
| Alüminyum eşik | W−40 |
| Ortakayıt kesimi | Açıklık − 2×42 |
| Perge sürme | Kanat W/2−8 × H−82; cam W/2−140 × H−230 |
| Hebeschiebe | Ortakayıt H−115; sabit cam W/2−94 × H−130; aktif cam W/2−238 × H−274 |

- Pencere kanadı 2000 mm'den yüksekse otomatik olarak kapı kanat profiline geçilir.
- **Kasa yükseltme (35×70):** girilen ölçü toplam ölçüdür; profil kalınlığı (35 mm, katalogdaki `size`) kasa ölçüsünden düşülür.
  "Sadece alt" seçilirse H−35 olur. "4 kenar" seçilirse W−70 × H−70 olur.
  Metraj: alt için toplam genişlik, 4 kenar için dış çevre.
- ⚠ Ortakayıt ekseninden yapılan düşümler (kanat 34, cam 47) eski programın "yatay bölünmüş" mantığından geliyor. Adopen teknik kataloğundan teyit edilmeli. Değerler **Katalog → Düşüm tabloları** ekranından düzenlenebilir.
- Çift kanat kapıda eski program eşikli cam yüksekliği için H−226 kullanıyordu; yeni model tutarlılık için H−228 hesaplıyor (2 mm fark).

## 5. Fiyatlandırma

```
Malzeme  = Σ profil metresi × €/m (beyaz/renkli) × (1 + fire%)
         + Σ cam m² × €/m²
         + aksesuar setleri
         + ek donanım (panjur, eşik, karolaj, kasa yükseltme, sineklik)
Satış/ad = (Malzeme + işçilik/adet + işçilik/m² × alan) / (1 − marj%)   ← 2 haneye yuvarlanır
Proje    = Σ satır + ambalaj (m²) + palet (kademeli) + navlun
           Navlun yalnızca CFR/CIF/DAP/DDP teslimde eklenir; manuel girilen değer otomatiği ezer.
         − iskonto% → net → + KDV% (ihracatta %0)
```

- Varsayılan değerler: marj %0, fire %0. Eski programın rakamlarını birebir verir.
- **Açık soru:** Katalogdaki €/m fiyatları satış listesi mi, alış maliyeti mi? Alış maliyetiyse marj ve işçilik girilmeli.
- Uw hesabı EN ISO 10077-1'in basitleştirilmiş hâliyle yapılır: (Ag·Ug + Af·Uf + lg·Ψ) / A, Ψ = 0,06.

## 6. Görünüm ve logolar

- **Arayüz:** "liquid glass" tarzında. Koyu lacivert zemin üzerinde yumuşak renk ışıkları var; paneller buzlu cam (`.glass-panel`, `.glass-side`, `.glass-bar`, `.glass-modal`, `index.css`).
  Çizim tuvali bilerek koyu ve net tutuldu.
- **Logolar:** Katalog → Firma & logo ekranından yüklenir ve `settings.company` içinde data URL olarak saklanır (yedek JSON'a dahil).
  Büyük görseller otomatik küçültülür.
  - `logo`: açık zemin. Teklif sayfalarında kullanılır.
  - `logoDark`: beyaz logo. Üst barda ve teklifin lacivert başlığında kullanılır; yoksa ana logo beyaz kapsülde gösterilir.
  - `partnerLogos`: teklifin son sayfasındaki "Çözüm ortaklarımız" satırı.

## 6b. Birimler

- Proje başına mm veya inç seçilir.
- İnç modunda birim yazmadan girilebilir (`49 1/4`, `49.25`). mm yazmak için `1250mm` yazılır.
- Çizim, liste ve teklif ölçüleri 1/16" hassasiyetle kesirli inç gösterilir. Teklifte mm karşılığı ve ft² de yazar.
- Hesaplar her zaman tam sayı mm üzerinden yapılır.

## 7. Yol haritası

1. Adopen teknik kataloğu ile ortakayıt düşümlerini, kanat sınırlarını ve gerçek profil yüz ölçülerini doğrulamak.
2. Takviye sacı, çıta ve conta metrajını reçeteye eklemek (veri gerekiyor).
3. Kesim listesini makine formatına çevirmek (CSV hazır; CNC formatı yapılacak).
4. Diğer PVC markaları: `catalog.ts` dosyasına seri ve düşüm tablosu eklemek yeterli.
5. Alüminyum: yeni `SystemKind` türleri ve kg/m bazlı fiyat.
6. Bulut: Supabase (projeler, katalog, kullanıcılar) ve çok kullanıcılı arşiv.
