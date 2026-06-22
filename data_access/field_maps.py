FIRMA_PERSISTED_KEYS = frozenset(
    {
        "firma_id",
        "firma_adi",
        "eposta",
        "telefon",
        "yetkili_kisi",
        "vergi_no",
        "adres",
        "aktif_mi",
        "varsayilan_yon",
        "notlar",
    }
)

FIRMA_COMPUTED_KEYS = frozenset(
    {
        "toplam_harcama",
        "toplam_gelir",
        "acik_gider",
        "acik_gelir",
        "net_pozisyon",
        "firma_tipi",
        "son_hareketler",
        "hareket_adedi",
        "para_birimi",
    }
)

DEFAULT_AYARLAR: dict = {
    "kullanici_adi": "Abdurrahman Koçak",
    "kullanici_unvan": "Yönetici",
    "mevcut_kasa_bakiyesi": 0.0,
    "varsayilan_dashboard_periyodu": 30,
    "adjust_sync_gun": 90,
    "adjust_son_sync": None,
    "veri_kaynagi": "adjust",
    "jwt_oturum_suresi_gun": 1,
}
