<div align="center">

<sub>OG FORK’U · ETKİLEŞİMLİ MALZEME EĞİTİMİ</sub>

# Faz Atlası

### Faz diyagramından mikroyapının içine.

Fe–C dengesini incele, bileşen hesabının izini sür.<br>
Aynı yapıyı 3B kesitten atomik referans hücresine kadar keşfet.

[![Sürüm v1.2.1](https://img.shields.io/badge/s%C3%BCr%C3%BCm-v1.2.1-526e60?style=flat-square)](https://github.com/gulOguzhanSkry/faz-atlasi/releases/tag/v1.2.1)
[![Kod lisansı MIT](https://img.shields.io/badge/kod-MIT-a77850?style=flat-square)](LICENSE)
![Türkçe ve İngilizce](https://img.shields.io/badge/diller-TR%20%2F%20EN-657f99?style=flat-square)
![Şematik araştırma prototipi](https://img.shields.io/badge/model-%C5%9Fematik%20prototip-85719c?style=flat-square)

**[Atlası aç ↗](https://guloguzhanskry.github.io/faz-atlasi/?lang=tr)** &nbsp; · &nbsp;
[English](README.md) &nbsp; · &nbsp;
[Tanıtımı izle](https://guloguzhanskry.github.io/faz-atlasi/gorseller/mikroyapi-sogume.mp4)

[![En yüksek 384 tane ayrıntısında, hesaplanmış sementit kütle paylarıyla sekiz Fe–C mikroyapısı](web/gorseller/readme-microstructures.webp)](web/gorseller/readme-microstructures.webp)

<sub>384 tane · 512² dokular · kaynaktan hesaplanan sekiz durum · çevrimdışı şematik render; arayüz ekran görüntüsü veya ölçülmüş mikrograf değildir</sub>

</div>

---

## Bir nokta. Üç inceleme ölçeği.

| **01 / Denge** | **02 / Mikroyapı** | **03 / Atomik referans** |
| :--- | :--- | :--- |
| Hesaplanmış Fe–Fe₃C diyagramında karbon ve sıcaklık seç. Fazları, her fazın karbonunu ve kütle paylarını oku. | Perlit, birincil/ikincil sementit ve ledeburit kökenlerini ayır. Ortak 3B hacmi kesip farklı görünümlerini karşılaştır. | YMK östenit, HMK ferrit ve sementit referans hücrelerini incele. Karbonun örnek arayer konumlarını keşfet. |

**Dört adımda dene:** karbonu **%0,45** seç, ötektoid sıcaklığının altına in, **3B mikroyapıyı aç**, ardından kesitte **faz renkleri** ile **dağlanmış görünümü** karşılaştır. Tam değişmez sıcaklıkta tekil olmayan faz miktarlarını belirlemek için **ξ dönüşüm ilerlemesini** seç.

## Bu fork’ta neler eklendi?

- **İzlenebilir bileşen hesabı** — kaynak verinin değişmez bileşimleri, her bileşenin iç faz dökümü ve kaldıraç kuralı hesabı.
- **Diyagramda ikinci bir okuma katmanı** — faz sınırlarından ayrı çizilen P/S/E/C bileşim referansları ve seçilebilir yavaş soğuma bileşen bölgeleri.
- **Yeniden kullanılabilir 3B inceleyici** — yüzen giriş, korunan kamera ve seçim, kesit düzlemleri, faz/bileşen/tane renkleri ve atomik referans görünümü.
- **Ortak 2B kesit** — küpün kendi kimlik haritası, göreli büyütme, temsili Nital görünümü, deterministik optik etkiler ve bilgi şeritli PNG çıktısı.
- **Yeniden üretilebilir tanıtım** — aynı kaynak hesap ve geometriden üretilmiş, iki dilde kısa bir soğuma akışı.

Özgün proje zaten yavaş soğuma bileşen tahminleri içeriyor. Bu fork onların açıklamasını, seçili denge durumuyla bağlantısını ve görsel incelemesini geliştiriyor; bu kavramları ilk kez getirdiğini iddia etmiyor.

### Küçük ekranda geniş çalışma alanı

Mobilde diyagram, okunmayacak kadar küçültülmek yerine geniş çalışma alanını korur. **Gezin** ve **Nokta seç** modları arasında geçiş yap; sürükleyerek gezin, iki parmakla yakınlaştır. **Görünümü kilitle** ile bir noktayı incelerken kadrajı sabitle. Yakınlaştırma düğmeleri, yön kontrolleri, **1:1 görünüm** ve **Diyagramı sığdır**, hareketlere açık alternatifler sunar. Karbon ve sıcaklık girişleri dönüştürülen diyagramın dışında kalır. Masaüstü yerleşimi korunur.

<details>
<summary><strong>Görsel ve teknik kanıtları incele</strong></summary>

| İnceleme | İçerik |
| :--- | :--- |
| [Aynı hacim, üç görünüm](web/gorseller/readme-display-modes.webp) | En yüksek ayrıntıda sekiz hesap durumunun faz küpleri, bileşen küpleri ve dağlanmış kesitleri. |
| [Kesit karşılaştırma paftası](web/gorseller/kesit-paftasi.png) | Yedi bileşim, üç görünüm ve üç göreli büyütme. |
| [Bağımsız kabul kontrolleri](docs/INDEPENDENT_ACCEPTANCE.md) | Korunum, değişmez ilerlemesi, geometri, ortak kesit kimlikleri ve kalan kabul sınırları. |
| [3B inceleyici](docs/STAGE3_DELIVERY.md) · [Kesit ve animasyon](docs/STAGE3B4_DELIVERY.md) | Mimari, kontroller, yeniden üretilebilir varlıklar ve açık kapsam. |
| [Kaynak iz karşılaştırması](hesap/rapor/og/TRACE_COMPARISON.md) | Yayındaki faz verisinin neden sessizce değiştirilmediği. |
| [Portfolyo bağlantısı](docs/PORTFOLIO_INTEGRATION.md) | OG portfolyosuyla paylaşılan, sürümü sabitlenmiş hesap kaynağı. |

</details>

## Modeli doğru okumak

> **Denge payları hesaplanır. Uzaydaki yerleşim şematiktir.**

İkili referans **metastabil Fe–Fe₃C**, 400–1600 °C ve yaklaşık 1 bar koşullarındadır. Bileşen kökeni, noktaya sıcaklığı artırarak gelinse bile sıvıdan yavaş soğuma geçmişini varsayar. Perlit ve ledeburit ayrı termodinamik fazlar değil, mikroyapı bileşenleridir.

Soğuma kinetiği, fiziksel tane boyutu, lamel aralığı, grafit, beynit ve martenzit tahmin edilmez. Bir kesitin alan payı, numunenin kütle veya hacim payına zorla eşitlenmez; atom hücreleri referans çizimleridir. Özgün atlasın alaşımlı kesitleri korunur; yeni ikili mikroyapı katmanı alaşımlı durumlarda kapalıdır. Sayısal korunum, bağımsız deneysel doğrulama değildir. [Kapsam ve yöntem →](docs/OG_ADDITIONS.md)

## Bilgisayarında çalıştır

Depoyu indir veya klonla; ardından kendi dosyalarını içeren `web/` klasörünü sun:

```sh
python -m http.server 8731 --directory web
```

**[localhost:8731](http://localhost:8731/?lang=tr)** adresini aç. Çalışma sırasında derleme, CDN veya hesap gerekmez. Dosyalar bilgisayarındayken internet bağlantısı olmadan kullanılabilir. Sonradan yüklenen 3B ES modülleri için yerel HTTP sunucusu gerekir; HTML dosyasına çift tıklamak tüm özellikleri açan yöntem değildir.

Yalnız geliştirme ve otomatik kontroller için:

```sh
npm ci --ignore-scripts
npm test
```

İsteğe bağlı sayısal araştırma araçları [hesap/og](hesap/og/README.md) içinde anlatılır. Çıktıları, yayında kullanılan veri setinden ayrı tutulur.

## Kaynağı açıkça belirtilen bir temel

**Özgün Faz Atlası:** [acarcemal](https://github.com/acarcemal/faz-atlasi) — hesaplanmış diyagram, çelik kütüphanesi, alaşımlı kesitler ve özgün arayüz. **Fork eklemeleri:** Oğuzhan Gül / OG — bileşen–durum bağlantısı, diyagram katmanı, ortak 3B/2B inceleyici ve araştırma/entegrasyon araçları. Ayrıntılı özgün özellikler ve hesap yöntemleri [kaynak projenin belgelerinde](https://github.com/acarcemal/faz-atlasi/tree/e9b2fce0b604502b94e620104fa6533e1e78bd82) bulunur.

- **CALPHAD:** pycalphad, R. Otis ve Z.-K. Liu; ikili değerlendirme Fei & Brosh (2014), `cfe_broshe.tdb`.
- **Alaşım verisi:** MatCalc `mc_fe v2.062`, E. Povoden-Karadeniz ve A. Jacob, TU Wien. Türetilmiş izoplet verilerinin [ODbL 1.0 bildirimi](NOTICE) korunur.
- **Metalurjik yorum:** [Bhadeshia, çelik mikroyapıları](https://www.phase-trans.msm.cam.ac.uk/2008/Steel_Microstructure/SM.html) ve [Yescas-Gonzalez & Bhadeshia, dökme demirler](https://www.phase-trans.msm.cam.ac.uk/2001/adi/cast.iron.html).

Kod **[MIT lisanslıdır](LICENSE)**; veri koşulları ayrıdır. Özgün yazar ve üçüncü taraf bildirimleri korunmuştur. Atıflar için [NOTICE](NOTICE), dağıtılan Three.js lisansı ve [atomik kaynak notları](docs/STAGE3_DELIVERY.md) incelenebilir.

<div align="center"><sub>Hesabı görünür, sınırlarını okunur kılmak için.</sub></div>
