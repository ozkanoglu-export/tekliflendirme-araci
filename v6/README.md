# PenCAD 6.2: 6.0 üzerine katman

Furkan'ın geliştirdiği **PenCAD 6.0** (`kaynak/ozkanoglu_pencad_60.html`) temel alındı. Dosya derlenmiş halde geliyor; kaynak kodu elimizde yok.
6.2 bu dosyanın üzerine bir katman ekler. Hesap, fiyat, analiz ve kayıt koduna dokunulmaz. Tek istisna montaj bedeli: yalnızca kutucuk işaretliyse toplama eklenir.

- Çıktı: `release/Ozkanoglu-PenCAD-6.2.html` (çift tıkla aç)
- Antigravity yeni bir 6.0 verdiğinde: dosyayı `kaynak/` içine koyup aşağıdaki komutu çalıştır. Yamalar desenle eşleştiği için değişken adları değişse de tutar. Tutmazsa derleme hangi yamada durduğunu söyler.

```bash
python3 v6/build.py
```

## Neler var

| Alan | Ne yapar |
|---|---|
| Görsel katman | Gerçekçi cam türleri, 44 REHAU kartela rengi ve gerçek folyo dokuları (2D + 3D), gece / gündüz / oto, göz koruma, liquid glass arayüz |
| Teklif | ABT yazısı kaldırıldı. Çizen kişi profilden gelir (👤 düğmesi: ad, telefon, e-posta). Yeni adres: Fatih Mah. … No: 8/A Merkez. Vinesso logosu "by ÖZKANOĞLU" ile, "ihracat markamız" yazısı kaldırıldı. |
| Premium teklif | Antetli kâğıt her basılı sayfada (Müşteri Teklifi → Montaj kutusundaki "Antetli kâğıt" ile kapatılabilir). "Kullanılan Profil Sistemleri & Ürün Detayları" bölümünde kesit görselleri (ozkanoglu.com.tr / adopen.com.tr) ve teknik değerler var, kullanılan camların tablosu da yer alır. |
| Montaj + dahil / hariç | Montaj bedeli girişi ve kutucuğu var (nakliye gibi). Şartların sonunda iki satır yazılır: "Fiyata dahildir: …" ve "Fiyata dahil değildir: …". İhracatta (KDV %0) alıcı ülke KDV'si her zaman "dahil değil" olarak yazılır. |
| Verilen teklifler | Müşteri Teklifi → "✔ Teklif Verildi — Kayda Al" düğmesi var. Birim fiyatı olmayan poz varsa kayıt alınmaz. Projeler'de ayrı panelde arama, detay (birim fiyatlar) ve "Aç" yapılabilir, JSON olarak indirilebilir. Kayıtlar `ozk.issuedQuotes` anahtarında, Furkan'ın arşivinden ayrı tutulur. |
| Favoriler | Renk, cam, profil serisi, donanım, panjur ve sineklik renk seçimlerinin yanında ★ var. Hızlı renk düğmelerinde minik ★ bulunur. Favoriler listenin en üstüne çıkar. 🎨 ile eklenen renkler "Çok Kullanılan"da görünür. |
| 3D | Camlar katman katman: her cam levhası, aradaki boşluk, warm-edge ara çıta ve lamine PVB ayrı görünür. Kollar gerçekçi (rozet, boyun, kavrama). HOK'ta pasif kanatta levye var. Açılış sırası: aktif kanadın kolu döner, kanat açılır, levye kalkar, pasif kanat açılır. Çift açılımlı kanatlar için "Vasistas" kaydırma çubuğu eklendi. |
| Müşteri 3D teklifi | Müşteri Teklifi → "📱 Müşteri 3D Teklifi İndir". Telefonda veya bilgisayarda açılan tek bir HTML dosyası üretir: 3D döndürme, kanat açma, çizim ve profil detayları. **Birim fiyat, maliyet ve katalog içermez.** İnternetsiz de açılır. |
| AI ölçü okuma | ✨ düğmesi: PDF, çizim fotoğrafı veya e-posta metni yüklenir. Claude (claude-opus-5-5) pozları çıkarır ve iki bağımsız okuma karşılaştırılır. Uyuşmayan ya da emin olunmayan ölçü, "kontrol ettim" işaretlenmeden projeye girmez. Profil, renk, cam, panjur ve sineklik onay ekranında düzenlenir. Sonra "Yeni proje olarak aç" (eski proje arşive kaydedilir) ya da "Mevcut projeye ekle" seçilir. |

| Alüminyum eşik | 20 mm alüminyum düşük eşik pencerelere de atılabilir (sürmeler hariç). Pencerelerde ancak kullanıcı seçince devreye girer; eski kayıtlar etkilenmez (`ozkWinThr`). Çizimde ve teklifte metal profil ve "ALU EŞİK 20 mm" etiketiyle görünür. |
| Profil / varyant | Alt çubuktaki 🧱 Profil düğmesi: tüm pozların profil sistemi tek seferde değişir ("Tüm pozları değiştir") ya da "＋ Varyant olarak ekle" ile varyant açılır. Pozlar bütün varyantlarda ortaktır; hangi varyantta çizilirse çizilsin diğerlerine de geçer. Varyant yalnızca profil sistemi ve cam seçimini tutar. Alt çubuğun üstündeki şeritte her varyantın fiyatı görünür, tıklayınca geçilir. "⋯" ile varyantlar yönetilir (teklife alternatif olarak ekle / sil). İşaretli varyantlar teklifte "Alternatif Profil Sistemleri" tablosunda fiyatlarıyla yer alır. Varyantlar projenin içinde saklanır (`ozkVariants`). |
| Aksesuar kapakları | Menteşe kapakları (pencere 2, kapı 3) ve alt kasadaki tahliye delik kapakları aksesuar/kol rengindedir. 2D'de menteşe kapakları açılış yönüne göre içeriden ya da dışarıdan görünür; tahliye kapakları dış görünümde (teklifte "Dışarıdan bakış") görünür. 3D'de ikisi de vardır. Alüminyum eşikli kasada tahliye kapağı konmaz. |
| Alt çubuk | Sade tutuldu: tema (tıkla: gündüz / gece / oto), göz koruma, kullanıcı, ✨ AI, 🧱 Profil ve ⚙ Araçlar (tüm camlar, renk ekle, varyantları yönet). |
| Tüm camlar | ⚙ Araçlar → "Tüm camları değiştir" projedeki bütün camları tek seferde değiştirir. Yalnızca belirli bir camı kullanan pozlar da seçilebilir. Bölmeye özel camlar ve birleşik pozların birimleri de değişir; panel dolguları değişmez. |

AI okuma üç yolla çalışır. **Google Gemini (ücretsiz, varsayılan):** aistudio.google.com'dan alınan ücretsiz anahtarla otomatik okur; varsayılan model `gemini-flash-latest`. Ücretsiz kullanımda Google, gönderilen içeriği ürünlerini geliştirmek için kullanabilir. **claude.ai ile:** ✨ → "Komutu kopyala". Komut, müşteri dosyasıyla birlikte claude.ai'de yeni bir sohbete yapıştırılır, gelen cevap programa geri yapıştırılır. İkinci bir sohbetteki cevap da yapıştırılırsa ölçüler karşılaştırılır. **Otomatik yol:** Anthropic API anahtarı gerekir (ücretli). Anahtar yalnızca o bilgisayarda (`ozk.ai.key`) saklanır. OIE ERP'ye taşınınca istekler sunucu üzerinden yapılmalı, anahtar tarayıcıda durmamalı.

## Güvenlik kuralları (build.py)

- Her yama orijinal metinde **tam beklenen sayıda** eşleşmek zorunda; eşleşmezse derleme durur.
- Her yama `window.OZKV yoksa orijinal davranış` şeklinde yazıldı. Katmandaki her fonksiyon hata yakalar.
- REHAU renkleri varsayılan kataloğa **eklenir**; kayıtlı renkler ve fiyatlar korunur.

## Doğrulama (6.0 ↔ 6.2, örnek proje)

- Maliyet, Optimizasyon, Şişecam ve Katalog sekmeleri birebir aynı. Çizim, Teklif ve Projeler'deki tüm fiyat ve sayı satırları aynı. Farklar yalnızca yeni düğmeler, ☆ işaretleri, yeni bölümler ve cam adlarının teklif diline çevrilmesi.
- Kayıtlarda yalnızca iki beklenen fark var:
  - adres güncellendi;
  - boş ya da "ABT CAD" olan çizen alanı giriş yapan kişiye çevrildi.
- Arşiv aynı. Katalogda yalnızca 44 renk eklendi.

## Dosyalar

```
v6/kaynak/ozkanoglu_pencad_60.html   ← Furkan'ın 6.0'ı (el sürülmez)
v6/build.py                          ← yamaları uygulayan derleyici
v6/gorsel/ozk-visual.js              ← katman (görsel, teklif, favori, 3D, müşteri 3D, AI)
v6/gorsel/ozk-theme.css              ← tema, liquid glass, teklif ve AI stilleri
v6/gorsel/rehau_kartela.json         ← 44 REHAU rengi
v6/gorsel/dokular/pXX.jpg            ← folyo dokuları
v6/gorsel/varliklar/                 ← antet, profil kesit görselleri
v6/gorsel/vendor/ozk3.min.js         ← three.js r187 (müşteri 3D görüntüleyici, MIT)
v6/gorsel/vendor/ozkai.min.js        ← @anthropic-ai/sdk 1.14.0 tarayıcı paketi (MIT)
```
