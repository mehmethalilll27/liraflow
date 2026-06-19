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
        "odeme_periyodu_gun",
        "varsayilan_yon",
        "notlar",
    }
)

FIRMA_COMPUTED_KEYS = frozenset(
    {
        "fatura_no_listesi",
        "acik_gider",
        "acik_gelir",
        "geciken_gider",
        "geciken_gelir",
        "odenen_gider",
        "tahsil_gelir",
        "net_pozisyon",
        "firma_tipi",
        "son_faturalar",
        "toplam_borc",
        "toplam_odenen",
        "toplam_geciken",
        "odeme_vadesi_gun",
        "fatura_id_listesi",
    }
)

FATURA_COMPUTED_KEYS = frozenset(
    {
        "liste_sira_no",
        "odeme_sira_no",
        "tahsilat_sira_no",
        "kalan_gun",
        "kalan_tutar",
    }
)

DEFAULT_AYARLAR: dict = {
    "kullanici_adi": "Abdurrahman Koçak",
    "kullanici_unvan": "Yönetici",
    "varsayilan_odeme_periyodu": 30,
    "varsayilan_vade_gunu": 30,
    "bildirim_gun_siniri": 10,
    "otomatik_gecikti": True,
    "mevcut_kasa_bakiyesi": 0.0,
    "varsayilan_dashboard_periyodu": 30,
    "varsayilan_firma_yon": "GIDER",
    "varsayilan_kategori": "genel",
    "jwt_oturum_suresi_gun": 1,
}
