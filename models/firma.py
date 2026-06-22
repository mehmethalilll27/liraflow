class Firma:
    def __init__(
        self,
        firma_id: int,
        firma_adi: str,
        eposta: str = "",
        telefon: str = "",
        yetkili_kisi: str = "",
        vergi_no: str = "",
        adres: str = "",
        aktif_mi: bool = True,
        varsayilan_yon: str = "GIDER",
        notlar: str = "",
    ):
        self.firma_id = firma_id
        self.firma_adi = firma_adi
        self.eposta = eposta
        self.telefon = telefon
        self.yetkili_kisi = yetkili_kisi
        self.vergi_no = vergi_no
        self.adres = adres
        self.aktif_mi = aktif_mi
        self.varsayilan_yon = varsayilan_yon if varsayilan_yon in {"GIDER", "GELIR"} else "GIDER"
        self.notlar = notlar

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
            "varsayilan_yon": self.varsayilan_yon,
            "notlar": self.notlar,
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
            varsayilan_yon=veri.get("varsayilan_yon", "GIDER"),
            notlar=veri.get("notlar", ""),
        )
