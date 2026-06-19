"""
Panel test verisi — yuvarlak sayılar, kolay kontrol.

Çalıştır: python scripts/seed_panel_test.py

Başlangıç (30 gün):
  Kasa:           60.000 ₺
  Giden (açık):  100.000 ₺  → TEST-ODEME-001
  Gelen (açık):   40.000 ₺  → TEST-TAHSIL-001
  Bulmam gereken:      0 ₺  (100.000 − 40.000 − 60.000)

Ödeme/tahsilat sonrası bulmam gereken genelde AYNI kalır
(giden ve kasa birlikte hareket eder). Kasa / gelen / giden kartları değişir.
"""
from __future__ import annotations

import json
import sys
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
BUGUN = date.today()


def vade(gun: int) -> str:
    return (BUGUN + timedelta(days=gun)).isoformat()


def main() -> None:
    firmalar = {
        "firmalar": [
            {
                "firma_id": 1,
                "firma_adi": "Test Tedarikci A.Ş.",
                "eposta": "test@tedarikci.com",
                "telefon": "5320000001",
                "yetkili_kisi": "Test Yetkili",
                "vergi_no": "",
                "adres": "",
                "aktif_mi": True,
                "odeme_periyodu_gun": 30,
                "varsayilan_yon": "GIDER",
                "notlar": "Panel test — gider firması",
            },
            {
                "firma_id": 2,
                "firma_adi": "Test Musteri Ltd.",
                "eposta": "test@musteri.com",
                "telefon": "5320000002",
                "yetkili_kisi": "Test Müşteri",
                "vergi_no": "",
                "adres": "",
                "aktif_mi": True,
                "odeme_periyodu_gun": 30,
                "varsayilan_yon": "GELIR",
                "notlar": "Panel test — gelir firması",
            },
        ]
    }

    bugun_str = BUGUN.isoformat()
    faturalar = {
        "faturalar": [
            {
                "fatura_id": 1,
                "firma_id": 1,
                "firma_adi": "Test Tedarikci A.Ş.",
                "fatura_no": "TEST-ODEME-001",
                "tutar": 100000.0,
                "odenen_tutar": 0,
                "para_birimi": "TRY",
                "vade_tarihi": vade(10),
                "durum": "BEKLIYOR",
                "notlar": "Panel test — 100K gider, ödeyince kasa düşer",
                "olusturma_tarihi": bugun_str,
                "guncelleme_tarihi": bugun_str,
                "odeme_tarihi": None,
                "arsiv_mi": False,
                "kategori": "test",
                "oncelik": "yuksek",
                "yon": "GIDER",
                "tahsilat_gecmisi": [
                    {
                        "baslik": "Fatura Oluşturuldu",
                        "aciklama": "Panel test gider faturası",
                        "tarih": bugun_str,
                    }
                ],
            },
            {
                "fatura_id": 2,
                "firma_id": 2,
                "firma_adi": "Test Musteri Ltd.",
                "fatura_no": "TEST-TAHSIL-001",
                "tutar": 40000.0,
                "odenen_tutar": 0,
                "para_birimi": "TRY",
                "vade_tarihi": vade(15),
                "durum": "BEKLIYOR",
                "notlar": "Panel test — 40K gelir, tahsil edince kasa artar",
                "olusturma_tarihi": bugun_str,
                "guncelleme_tarihi": bugun_str,
                "odeme_tarihi": None,
                "arsiv_mi": False,
                "kategori": "test",
                "oncelik": "orta",
                "yon": "GELIR",
                "tahsilat_gecmisi": [
                    {
                        "baslik": "Fatura Oluşturuldu",
                        "aciklama": "Panel test gelir faturası",
                        "tarih": bugun_str,
                    }
                ],
            },
        ]
    }

    with open(DATA / "firma_data.json", "w", encoding="utf-8") as f:
        json.dump(firmalar, f, ensure_ascii=False, indent=2)

    with open(DATA / "fatura_data.json", "w", encoding="utf-8") as f:
        json.dump(faturalar, f, ensure_ascii=False, indent=2)

    ayarlar_path = DATA / "ayarlar.json"
    with open(ayarlar_path, encoding="utf-8") as f:
        ayarlar = json.load(f)
    ayarlar["mevcut_kasa_bakiyesi"] = 60000.0
    ayarlar["bildirim_gun_siniri"] = 14
    with open(ayarlar_path, "w", encoding="utf-8") as f:
        json.dump(ayarlar, f, ensure_ascii=False, indent=2)

    sys.path.insert(0, str(ROOT))
    from services.cashflow_service import CashflowService

    svc = CashflowService()
    svc.sync_all()
    d = svc.get_nakit_dashboard(30)

    print("=" * 56)
    print("PANEL TEST VERİSİ YÜKLENDİ")
    print("=" * 56)
    print(f"  Kasa:             {d['mevcut_kasa']:>12,.0f} TRY")
    print(f"  Giden (30g):      {d['giden']['donem_toplam']:>12,.0f} TRY")
    print(f"  Gelen (30g):      {d['gelen']['donem_toplam']:>12,.0f} TRY")
    print(f"  Bulmam gereken:   {d['bulunmasi_gereken']:>12,.0f} TRY")
    print()
    print("TEST ADIMLARI:")
    print("  1) Paneli aç — yukarıdaki rakamları gör")
    print("  2) TEST-ODEME-001 - 30.000 TL odeme kaydet")
    print("     -> Kasa: 30.000 | Giden: 70.000 | Bulmam: 0 (ayni)")
    print("  3) TEST-TAHSIL-001 - 40.000 TL tahsilat kaydet")
    print("     -> Kasa: 70.000 | Gelen: 0 | Bulmam: 0 (ayni)")
    print("  4) TEST-ODEME-001 kalan 70.000 ode")
    print("     -> Kasa: 0 | Giden: 0 | Bulmam: 0")
    print("=" * 56)

    # Simülasyon
    print("\nSimülasyon (otomatik):")
    d0 = svc.get_nakit_dashboard(30)
    svc.odeme_kaydet("TEST-ODEME-001", 30000)
    d1 = svc.get_nakit_dashboard(30)
    svc.odeme_kaydet("TEST-TAHSIL-001", 40000)
    d2 = svc.get_nakit_dashboard(30)
    svc.odeme_kaydet("TEST-ODEME-001", 70000)
    d3 = svc.get_nakit_dashboard(30)

    def satir(etiket, d):
        print(
            f"  {etiket}: kasa={d['mevcut_kasa']:,.0f}  "
            f"giden={d['giden']['donem_toplam']:,.0f}  "
            f"gelen={d['gelen']['donem_toplam']:,.0f}  "
            f"bulmam={d['bulunmasi_gereken']:,.0f}"
        )

    satir("Başlangıç", d0)
    satir("30K gider ödendi", d1)
    satir("40K tahsilat", d2)
    satir("70K gider kapatıldı", d3)

    # Veriyi tekrar sıfırla (simülasyon dosyayı değiştirdi)
    with open(DATA / "fatura_data.json", "w", encoding="utf-8") as f:
        json.dump(faturalar, f, ensure_ascii=False, indent=2)
    ayarlar["mevcut_kasa_bakiyesi"] = 60000.0
    with open(ayarlar_path, "w", encoding="utf-8") as f:
        json.dump(ayarlar, f, ensure_ascii=False, indent=2)
    svc.sync_all()
    print("\nVeri tekrar başlangıç haline getirildi — panelden test edebilirsin.")


if __name__ == "__main__":
    main()
