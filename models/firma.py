class Firma:
    def __init__(
        self,
        firma_id: int,
        firma_adi: str,
        eposta: str,
        telefon: str,
        yetkili_kisi: str = "",
        vergi_no: str = "",
        adres: str = "",
        aktif_mi: bool = True,
        odeme_periyodu_gun: int = 30,
        varsayilan_yon: str = "GIDER",
        notlar: str = "",
        fatura_no_listesi: list[str] | None = None,
        toplam_borc: float = 0.0,
        toplam_odenen: float = 0.0,
        toplam_geciken: float = 0.0,
    ):
        self.firma_id = firma_id
        self.firma_adi = firma_adi
        self.eposta = eposta
        self.telefon = telefon
        self.yetkili_kisi = yetkili_kisi
        self.vergi_no = vergi_no
        self.adres = adres
        self.aktif_mi = aktif_mi
        self.odeme_periyodu_gun = odeme_periyodu_gun
        self.varsayilan_yon = varsayilan_yon if varsayilan_yon in {"GIDER", "GELIR"} else "GIDER"
        self.notlar = notlar
        self.fatura_no_listesi = fatura_no_listesi or []
        self.toplam_borc = toplam_borc
        self.toplam_odenen = toplam_odenen
        self.toplam_geciken = toplam_geciken

    def to_dict(self) -> dict:
        return {
            "firma_id": self.firma_id,
            "firma_adi": self.firma_adi,
            "eposta": self.eposta,
            "telefon": self.telefon,
            "yetkili_kisi": self.yetkili_kisi,
            "vergi_no": self.vergi_no,
            "adres": self.adres,
            "aktif_mi": self.aktif_mi,
            "odeme_periyodu_gun": self.odeme_periyodu_gun,
            "varsayilan_yon": self.varsayilan_yon,
            "notlar": self.notlar,
            "fatura_no_listesi": self.fatura_no_listesi,
            "toplam_borc": self.toplam_borc,
            "toplam_odenen": self.toplam_odenen,
            "toplam_geciken": self.toplam_geciken,
        }

    @classmethod
    def from_dict(cls, veri: dict) -> "Firma":
        return cls(
            firma_id=veri["firma_id"],
            firma_adi=veri["firma_adi"],
            eposta=veri.get("eposta", ""),
            telefon=veri.get("telefon", ""),
            yetkili_kisi=veri.get("yetkili_kisi", ""),
            vergi_no=veri.get("vergi_no", ""),
            adres=veri.get("adres", ""),
            aktif_mi=veri.get("aktif_mi", True),
            odeme_periyodu_gun=int(veri.get("odeme_periyodu_gun", veri.get("odeme_vadesi_gun", 30))),
            varsayilan_yon=veri.get("varsayilan_yon", "GIDER"),
            notlar=veri.get("notlar", ""),
            fatura_no_listesi=veri.get("fatura_no_listesi", []),
            toplam_borc=veri.get("toplam_borc", 0.0),
            toplam_odenen=veri.get("toplam_odenen", 0.0),
            toplam_geciken=veri.get("toplam_geciken", 0.0),
        )