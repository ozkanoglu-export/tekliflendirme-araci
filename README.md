# Özkanoğlu PenCAD Stüdyo 5

PVC pencere, kapı ve sürme sistemleri için **çizim → reçete → kesim → teklif** aracı.
Şimdilik Adopen serileriyle çalışıyor (Atlantik 750, Pasifik 888, Perge Sürme, Akdeniz Hebeschiebe).

## Kullanım

`release/Ozkanoglu-PenCAD-Studyo.html` dosyasını çift tıklayıp Chrome veya Edge ile açın. Sunucu ya da kurulum gerekmez.
Veriler tarayıcıda saklanır. Yedek almak için **Projeler → Tüm arşiv + katalog** seçeneğini kullanın.

| Ekran | Ne yapar |
|---|---|
| Çizim Stüdyosu | Şablonla poz açılır. Çizimde alana tıklanır; kanat tipi seçilir, bölünür, birleştirilir, ölçü verilir. Geri al: Ctrl+Z |
| Müşteri Teklifi | 6 dilde A4 teklif hazırlar (TR, EN, DE, IT, RU, FR): teslim şekli, iskonto, hedef fiyat, banka, onay bloğu. PDF için Ctrl+P |
| Maliyet & Kesim | Poz maliyeti, kâr, 6 m boy kesim optimizasyonu, cam sipariş listesi, aksesuar listesi, CSV |
| Katalog & Fiyat | Profil, cam ve aksesuar fiyatları, toplu zam, kur, ihracat masrafları, firma ve banka bilgileri, düşüm tabloları |
| Projeler | Teklif arşivi, revizyon, JSON yedek, Gemini / eski PenCAD JSON içe aktarma |

## Geliştirme

```bash
cd app
npm install
npm run dev      # canlı geliştirme
npm test         # hesap motoru testleri
npm run build    # dist/index.html (tek dosya)
```

Mimari ve iş kuralları için: [docs/PROJE_HAFIZASI.md](docs/PROJE_HAFIZASI.md)
