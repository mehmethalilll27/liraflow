"""Dashboard için tutarlı demo verisi üretir. Bugün: 2026-06-18"""
from __future__ import annotations

import json
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
BUGUN = date(2026, 6, 18)


def vade(gun: int) -> str:
    return (BUGUN + timedelta(days=gun)).isoformat()


def olusturma(gun: int) -> str:
    return (BUGUN + timedelta(days=gun - 15)).isoformat()


def fatura(
    fatura_id: int,
    firma_id: int,
    firma_adi: str,
    fatura_no: str,
    tutar: float,
    vade_gun: int,
    durum: str,
    yon: str,
    notlar: str,
    kategori: str = "genel",
    oncelik: str = "orta",
    odeme_tarihi: str | None = None,
    tahsilat_gecmisi: list | None = None,
) -> dict:
    vt = vade(vade_gun)
    return {
        "fatura_id": fatura_id,
        "firma_id": firma_id,
        "firma_adi": firma_adi,
        "fatura_no": fatura_no,
        "tutar": round(tutar, 2),
        "para_birimi": "TRY",
        "vade_tarihi": vt,
        "durum": durum,
        "notlar": notlar,
        "olusturma_tarihi": olusturma(vade_gun),
        "guncelleme_tarihi": BUGUN.isoformat(),
        "odeme_tarihi": odeme_tarihi,
        "arsiv_mi": False,
        "kategori": kategori,
        "oncelik": oncelik,
        "yon": yon,
        "tahsilat_gecmisi": tahsilat_gecmisi or [],
    }


FATURALAR = [
    # --- GİDER: gecikmiş ---
    fatura(1, 2, "Anadolu Lojistik", "FTR-2026-0001", 9200, -8, "GECIKTI", "GIDER", "Nakliye hizmet bedeli", "lojistik", "yuksek"),
    fatura(2, 11, "Sakarya Makina", "FTR-2026-0002", 11200, -5, "GECIKTI", "GIDER", "Makina bakım hizmeti", "bakim", "yuksek"),
    fatura(3, 6, "Istanbul Yazilim", "FTR-2026-0003", 15800, -2, "GECIKTI", "GIDER", "Geliştirme sprint bedeli", "yazilim", "yuksek"),
    # --- GİDER: yaklaşan (7 gün içi) ---
    fatura(4, 8, "Konya Tarim", "FTR-2026-0004", 8700, 2, "BEKLIYOR", "GIDER", "Gübre ve ekipman alımı", "tarim", "yuksek"),
    fatura(5, 1, "Marmara Teknoloji", "FTR-2026-0005", 18500, 4, "BEKLIYOR", "GIDER", "Yazılım lisans yenileme", "yazilim", "yuksek"),
    fatura(6, 15, "Antalya Turizm", "FTR-2026-0006", 17400, 6, "BEKLIYOR", "GIDER", "Sezon öncesi rezervasyon hizmeti", "hizmet", "orta"),
    fatura(7, 12, "Kayseri Mobilya", "FTR-2026-0007", 7600, 7, "BEKLIYOR", "GIDER", "Mobilya aksesuar alımı", "tedarik", "orta"),
    # --- GİDER: 8-30 gün ---
    fatura(8, 5, "Akdeniz Insaat", "FTR-2026-0008", 22300, 12, "BEKLIYOR", "GIDER", "Şantiye malzeme alımı", "insaat", "orta"),
    fatura(9, 3, "Ege Dis Ticaret", "FTR-2026-0009", 12750, 14, "BEKLIYOR", "GIDER", "İhracat operasyon desteği", "lojistik", "dusuk"),
    fatura(10, 10, "Izmir Kimya", "FTR-2026-0010", 19600, 18, "BEKLIYOR", "GIDER", "Kimyasal hammadde alımı", "kimya", "dusuk"),
    fatura(11, 7, "Bursa Otomotiv", "FTR-2026-0011", 38500, 20, "BEKLIYOR", "GIDER", "Parça tedarik ödemesi", "otomotiv", "orta"),
    fatura(12, 16, "Trabzon Denizcilik", "FTR-2026-0012", 33600, 25, "BEKLIYOR", "GIDER", "Liman operasyon bedeli", "lojistik", "dusuk"),
    fatura(13, 13, "Eskisehir Enerji", "FTR-2026-0013", 29900, 30, "BEKLIYOR", "GIDER", "Enerji ekipman kurulumu", "enerji", "orta"),
    fatura(26, 14, "Adana Plastik", "FTR-2026-0026", 78500, 3, "BEKLIYOR", "GIDER", "Hammadde ve kalıp alımı", "uretim", "yuksek"),
    fatura(27, 10, "Izmir Kimya", "FTR-2026-0027", 45200, 42, "BEKLIYOR", "GIDER", "Yıllık kimyasal stok anlaşması", "kimya", "orta"),
    fatura(28, 7, "Bursa Otomotiv", "FTR-2026-0028", 52800, 72, "BEKLIYOR", "GIDER", "Yedek parça sezon siparişi", "otomotiv", "dusuk"),
    # --- GİDER: ödendi ---
    fatura(
        14, 4, "Karadeniz Gida", "FTR-2026-0014", 6400, -12, "ODENDI", "GIDER", "Gıda tedarik faturası", "gida", "orta",
        odeme_tarihi="2026-06-08",
        tahsilat_gecmisi=[{"baslik": "Ödeme Onaylandı", "aciklama": "Havale ile ödendi", "tarih": "2026-06-08"}],
    ),
    fatura(
        15, 9, "Gaziantep Tekstil", "FTR-2026-0015", 14100, -20, "ODENDI", "GIDER", "Kumaş sevkiyat faturası", "tekstil", "orta",
        odeme_tarihi="2026-05-28",
        tahsilat_gecmisi=[{"baslik": "Ödeme Onaylandı", "aciklama": "EFT ile ödendi", "tarih": "2026-05-28"}],
    ),
    # --- GELİR: gecikmiş tahsilat ---
    fatura(16, 18, "Atlas Danismanlik", "FTR-2026-0016", 42000, -10, "GECIKTI", "GELIR", "Q2 danışmanlık projesi", "danismanlik", "yuksek"),
    fatura(17, 19, "Nova Perakende", "FTR-2026-0017", 28500, -4, "GECIKTI", "GELIR", "Mağaza yazılım entegrasyonu", "yazilim", "yuksek"),
    # --- GELİR: yaklaşan tahsilat ---
    fatura(18, 20, "Zenith Medya", "FTR-2026-0018", 18500, 1, "BEKLIYOR", "GELIR", "Dijital reklam kampanyası", "pazarlama", "yuksek"),
    fatura(19, 17, "Rotate LAB", "FTR-2026-0019", 22000, 5, "BEKLIYOR", "GELIR", "Laboratuvar analiz paketi", "hizmet", "orta"),
    fatura(20, 21, "Orion Lojistik", "FTR-2026-0020", 26500, 9, "BEKLIYOR", "GELIR", "Depo yönetim sistemi lisansı", "yazilim", "yuksek"),
    fatura(21, 18, "Atlas Danismanlik", "FTR-2026-0021", 18500, 15, "BEKLIYOR", "GELIR", "Strateji workshop bedeli", "danismanlik", "orta"),
    fatura(22, 19, "Nova Perakende", "FTR-2026-0022", 15800, 22, "BEKLIYOR", "GELIR", "POS bakım sözleşmesi", "bakim", "dusuk"),
    fatura(23, 20, "Zenith Medya", "FTR-2026-0023", 14200, 28, "BEKLIYOR", "GELIR", "Sosyal medya yönetimi", "pazarlama", "orta"),
    fatura(29, 21, "Orion Lojistik", "FTR-2026-0029", 38500, 48, "BEKLIYOR", "GELIR", "WMS modül genişletme", "yazilim", "orta"),
    fatura(30, 18, "Atlas Danismanlik", "FTR-2026-0030", 56000, 80, "BEKLIYOR", "GELIR", "Yıllık retainer sözleşmesi", "danismanlik", "dusuk"),
    # --- GELİR: tahsil edildi ---
    fatura(
        24, 21, "Orion Lojistik", "FTR-2026-0024", 19500, -15, "ODENDI", "GELIR", "Kurulum ve eğitim bedeli", "hizmet", "orta",
        odeme_tarihi="2026-06-05",
        tahsilat_gecmisi=[{"baslik": "Ödeme Onaylandı", "aciklama": "Müşteri havale ile ödedi", "tarih": "2026-06-05"}],
    ),
    fatura(
        25, 17, "Rotate LAB", "FTR-2026-0025", 12800, -25, "ODENDI", "GELIR", "Kalite kontrol raporu", "hizmet", "dusuk",
        odeme_tarihi="2026-05-24",
        tahsilat_gecmisi=[{"baslik": "Ödeme Onaylandı", "aciklama": "Tam tahsilat", "tarih": "2026-05-24"}],
    ),
]

YENI_FIRMALAR = [
    {
        "firma_id": 18,
        "firma_adi": "Atlas Danismanlik",
        "eposta": "muhasebe@atlasdanismanlik.com",
        "telefon": "5321000018",
        "yetkili_kisi": "Selin Arslan",
        "vergi_no": "1234567890",
        "adres": "Levent, İstanbul",
        "aktif_mi": True,
        "odeme_periyodu_gun": 30,
        "fatura_no_listesi": [],
        "toplam_borc": 0,
        "toplam_odenen": 0,
        "toplam_geciken": 0,
    },
    {
        "firma_id": 19,
        "firma_adi": "Nova Perakende",
        "eposta": "finans@novaperakende.com",
        "telefon": "5321000019",
        "yetkili_kisi": "Burak Yıldız",
        "vergi_no": "2345678901",
        "adres": "Çankaya, Ankara",
        "aktif_mi": True,
        "odeme_periyodu_gun": 15,
        "fatura_no_listesi": [],
        "toplam_borc": 0,
        "toplam_odenen": 0,
        "toplam_geciken": 0,
    },
    {
        "firma_id": 20,
        "firma_adi": "Zenith Medya",
        "eposta": "odeme@zenithmedya.com",
        "telefon": "5321000020",
        "yetkili_kisi": "Deniz Korkmaz",
        "vergi_no": "3456789012",
        "adres": "Alsancak, İzmir",
        "aktif_mi": True,
        "odeme_periyodu_gun": 30,
        "fatura_no_listesi": [],
        "toplam_borc": 0,
        "toplam_odenen": 0,
        "toplam_geciken": 0,
    },
    {
        "firma_id": 21,
        "firma_adi": "Orion Lojistik",
        "eposta": "tahsilat@orionlojistik.com",
        "telefon": "5321000021",
        "yetkili_kisi": "Emre Çetin",
        "vergi_no": "4567890123",
        "adres": "Gebze, Kocaeli",
        "aktif_mi": True,
        "odeme_periyodu_gun": 45,
        "fatura_no_listesi": [],
        "toplam_borc": 0,
        "toplam_odenen": 0,
        "toplam_geciken": 0,
    },
]


def main() -> None:
    with open(DATA / "firma_data.json", encoding="utf-8") as f:
        firma_veri = json.load(f)

    mevcut_idler = {x["firma_id"] for x in firma_veri["firmalar"]}
    for firma in YENI_FIRMALAR:
        if firma["firma_id"] not in mevcut_idler:
            firma_veri["firmalar"].append(firma)

    with open(DATA / "firma_data.json", "w", encoding="utf-8") as f:
        json.dump(firma_veri, f, ensure_ascii=False, indent=2)

    with open(DATA / "fatura_data.json", "w", encoding="utf-8") as f:
        json.dump({"faturalar": FATURALAR}, f, ensure_ascii=False, indent=2)

    with open(DATA / "ayarlar.json", encoding="utf-8") as f:
        ayarlar = json.load(f)
    ayarlar["mevcut_kasa_bakiyesi"] = 35000.0
    ayarlar["bildirim_gun_siniri"] = 7
    with open(DATA / "ayarlar.json", "w", encoding="utf-8") as f:
        json.dump(ayarlar, f, ensure_ascii=False, indent=2)

    import sys
    sys.path.insert(0, str(ROOT))
    from services.cashflow_service import CashflowService

    svc = CashflowService()
    svc.sync_all()
    d = svc.get_nakit_dashboard(30)
    print("Demo veri yüklendi.")
    print(f"  Gelen (bekleyen): {d['gelen']['bekleyen_toplam']:,.0f} TRY")
    print(f"  Giden (bekleyen): {d['giden']['bekleyen_toplam']:,.0f} TRY")
    print(f"  Kasa:             {d['mevcut_kasa']:,.0f} TRY")
    print(f"  Bulmam gereken:   {d['bulunmasi_gereken']:,.0f} TRY")
    print(f"  Yaklaşan ödeme:   {len(d['yaklasan_odemeler'])} adet")
    print(f"  Yaklaşan tahsilat:{len(d['yaklasan_tahsilatlar'])} adet")
    print(f"  Hareketler (30g): {len(d['yaklasan_hareketler'])} adet")


if __name__ == "__main__":
    main()
