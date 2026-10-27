# Karanlık Çağ

Tamamen ASCII karakterlerle çizilen, karanlık ortaçağ temalı, tek oyunculu bir MMORPG.
Köyden başlayıp Kara Orman, Lanetli Mezarlık ve Ejder Kayalıkları'ndan geçerek Ölüm Kapısı'na ilerle.
Her geçidin bir bekçisi var; son boss Azrail'i yenince portaldan çık.

**Oyna:** https://adecust.github.io/karanlik-cag/

## Kontroller
- **WASD / ok tuşları:** hareket, **Shift:** koşma
- **Sol tık / Boşluk:** temel saldırı, **1-2-3:** yetenekler
- **Q / E:** iksirler, **Esc:** duraklat (efekt ve müzik sesi ayarı burada), **M:** sessiz

## Yerelde çalıştırma
3B modeller ES modülleriyle yüklendiği için dosyayı doğrudan açmak yerine yerel sunucu gerekir:

```
node serve.js
```

Ardından http://localhost:8080 adresini aç (Windows'ta `BASLAT.bat`).

## Teknik
- WebGL glif atlası ile ASCII ızgara çizici
- Three.js ile canlı 3B figürler, her karede ASCII'ye çevrilir
- Rüzgârda eğilen ve ayak altında ezilen çimen, dalga denklemiyle su
- Gerçek zamanlı üretilen özgün müzik: keşifte sakin ambiyans, boss savaşında rock

## Lisanslar
3B modeller: KayKit (Kay Lousberg) ve Quaternius, CC0. Witch modeli CC-BY.
Ayrıntılar: `assets/models/CREDITS.txt`.
