"""Adjust olmadan paneli test etmek için örnek hareket verisi yükler."""

from datetime import date, timedelta

from data_access import get_store
from services.adjust_sync_service import AdjustSyncService


def main() -> None:
    store = get_store()
    sync = AdjustSyncService(store=store)
    bugun = date.today()

    ornekler = [
        ("AppLovin", "Summer Campaign", 12400.0, "GIDER", 0),
        ("AppLovin", "Retargeting", 3200.0, "GIDER", 2),
        ("Unity Ads", "US Install", 8900.0, "GIDER", 5),
        ("Google Ads", "Brand Search", 5600.0, "GIDER", 3),
        ("AppLovin", "IAP Revenue", 18200.0, "GELIR", 0),
        ("Unity Ads", "Ad Revenue", 9400.0, "GELIR", 5),
    ]

    firmalar = store.get_firmalar()
    hareketler = []

    for partner, kampanya, tutar, yon, gun_offset in ornekler:
        gun = (bugun - timedelta(days=gun_offset)).isoformat()
        firmalar, hareket_listesi = sync._satirdan_hareketler(
            {
                "day": gun,
                "partner_name": partner,
                "campaign": kampanya,
                "network_cost": tutar if yon == "GIDER" else 0,
                "all_revenue": tutar if yon == "GELIR" else 0,
                "installs": 120,
            },
            firmalar,
            "USD",
        )
        hareketler.extend(hareket_listesi)

    store.upsert_adjust_hareketler(hareketler)
    ayarlar = store.get_ayarlar()
    ayarlar["veri_kaynagi"] = "adjust"
    ayarlar["adjust_son_sync"] = bugun.isoformat()
    store.save_ayarlar(ayarlar)

    print(f"Tamam: {len(hareketler)} örnek hareket yüklendi.")


if __name__ == "__main__":
    main()
