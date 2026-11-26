# PenCAD 6.1: 6.0 üzerine görsel katman

Furkan'ın geliştirdiği **PenCAD 6.0** (`kaynak/ozkanoglu_pencad_60.html`) temel alındı. Bu dosya derlenmiş (sıkıştırılmış) halde geldi; kaynak kodu elimizde yok.
6.1 bu dosyanın üzerine **sadece görsel katman** ekler. Hesap, fiyat, analiz ve kayıt koduna dokunulmaz.

- Çıktı: `release/Ozkanoglu-PenCAD-6.1.html` (çift tıkla aç)
- Yeniden üretmek için:

```bash
python3 v6/build_v61.py
```

## Neler eklendi

| Alan | Değişiklik |
|---|---|
| Cam görselleri | 82 cam tek tek sınıflandırıldı: düz, Sinerji (Low-E), Konfor (solar), üçlü, satina, buzlu (desenli), lamine, akustik lamine, reflekte, renkli, jaluzili. Her tür ayrı renk, yansıma ve doku ile çiziliyor. Isıcamda ara çıta (warm-edge) görünüyor; lamine camlarda kenar çizgisi var. |
| Gerçekçi doğrama | Kasa, kanat ve ortakayıtta ışık-gölge (eğim), gönye çizgileri ve iç conta çizgisi var. |
| REHAU kartela | 44 renk eklendi: MX, PX, PFX ve FX serileri. Her biri kartelanın **gerçek folyo dokusuyla** çiziliyor; damar dikey profilde dikey, yatay profilde yatay akıyor. Mevcut Altın Meşe, Winchester, İrlanda Meşe ve Koyu Meşe de aynı gerçek dokulara bağlandı. |
| 3D | Profillerde gerçek folyo dokusu var, doğru yönde ve tekrar eden şekilde. Cam malzemesi cam türüne göre değişiyor. Ortam yansıması eklendi. Gündüz modunda sahne arka planı açık. |
| Teklif dilleri | Cam adları teklif dilinde yazılıyor (EN, DE, NL, FR, IT, RU, AR). Türkçede Furkan'ın orijinal adları aynen kalıyor. |
| Tema | Ekranın alt ortasında ☀ Gündüz / ☾ Gece / ◐ Oto (07–19 gündüz) düğmeleri ve ◉ Göz koruma (mavi ışık filtresi) var. Seçim `ozk.ui.*` anahtarlarında saklanıyor; Furkan'ın kayıtlarından ayrı. |
| Baskı | Teklifin etrafındaki koyu kenar artık basılmıyor. |

## Güvenlik kuralları (build_v61.py)

- Her yama orijinal metinde **tam beklenen sayıda** eşleşmek zorunda; eşleşmezse derleme durur.
- Her yama `window.OZKV yoksa orijinal davranış` şeklinde yazıldı. Görsel katmandaki her fonksiyon hata yakalar; bir sorun olursa 6.0'ın çizimi aynen görünür.
- REHAU renkleri varsayılan kataloğa **eklenir**. 6.0'ın kendi birleştirme mantığı sayesinde kayıtlı renkler ve fiyatlar korunur.

## Doğrulama (6.0 ↔ 6.1, örnek proje)

- 7 sekmenin tüm metni (Çizim, Teklif, Maliyet, Optimizasyon, Şişecam, Katalog, Projeler) birebir aynı.
- Türkçe teklif (Avrupa detaylı ve kompakt) birebir aynı. Diğer dillerde tek fark cam adlarının çevrilmesi.
- localStorage: proje, ayarlar ve arşiv aynı (rastgele id'ler hariç). Katalogda sadece 44 REHAU rengi eklendi; mevcut 14 rengin hiçbiri değişmedi.

## Dosyalar

```
v6/kaynak/ozkanoglu_pencad_60.html   ← Furkan'ın 6.0'ı (el sürülmez)
v6/gorsel/ozk-visual.js              ← görsel katman (cam, profil, doku, çeviri, tema, 3D)
v6/gorsel/ozk-theme.css              ← gece/gündüz, göz koruma, cam renk değişkenleri
v6/gorsel/rehau_kartela.json         ← 44 REHAU rengi (Renolit + REHAU kodu, TR/EN ad)
v6/gorsel/dokular/pXX.jpg            ← kartela sayfalarından kırpılmış folyo dokuları
v6/build_v61.py                      ← yamaları uygulayan derleyici
```
