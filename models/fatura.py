from datetime import datetime, date


class Fatura:
    def __init__(
        self,
        fatura_id: int,
        firma_id: int,
        firma_adi: str,
        fatura_no: str,
        tutar: float,
        para_birimi: str,
        vade_tarihi: date | str,
        durum: str,
        notlar: str = "",
        olusturma_tarihi: date | str | None = None,
        guncelleme_tarihi: date | str | None = None,
        odeme_tarihi: date | str | None = None,
        arsiv_mi: bool = False,
        kategori: str = "genel",
        oncelik: str = "orta",
        tahsilat_gecmisi: list[dict] | None = None,
    ):
        self.fatura_id = fatura_id
        self.firma_id = firma_id
        self.firma_adi = firma_adi
        self.fatura_no = fatura_no
        self.tutar = tutar
        self.para_birimi = para_birimi
        self.vade_tarihi = self._parse_tarih(vade_tarihi)
        self.durum = durum
        self.notlar = notlar
        self.olusturma_tarihi = self._parse_optional_tarih(olusturma_tarihi)
        self.guncelleme_tarihi = self._parse_optional_tarih(guncelleme_tarihi)
        self.odeme_tarihi = self._parse_optional_tarih(odeme_tarihi)
        self.arsiv_mi = arsiv_mi
        self.kategori = kategori
        self.oncelik = oncelik
        self.tahsilat_gecmisi = tahsilat_gecmisi or []

    @staticmethod
    def _parse_tarih(vade_tarihi: date | str) -> date:
        if isinstance(vade_tarihi, date):
            return vade_tarihi
        return datetime.strptime(vade_tarihi, "%Y-%m-%d").date()

    @staticmethod
    def _parse_optional_tarih(tarih: date | str | None) -> date | None:
        if tarih is None or tarih == "":
            return None
        if isinstance(tarih, date):
            return tarih
        return datetime.strptime(tarih, "%Y-%m-%d").date()

    def to_dict(self) -> dict:
        return {
            "fatura_id": self.fatura_id,
            "firma_id": self.firma_id,
            "firma_adi": self.firma_adi,
            "fatura_no": self.fatura_no,
            "tutar": self.tutar,
            "para_birimi": self.para_birimi,
            "vade_tarihi": self.vade_tarihi.isoformat(),
            "durum": self.durum,
            "notlar": self.notlar,
            "olusturma_tarihi": self.olusturma_tarihi.isoformat() if self.olusturma_tarihi else None,
            "guncelleme_tarihi": self.guncelleme_tarihi.isoformat() if self.guncelleme_tarihi else None,
            "odeme_tarihi": self.odeme_tarihi.isoformat() if self.odeme_tarihi else None,
            "arsiv_mi": self.arsiv_mi,
            "kategori": self.kategori,
            "oncelik": self.oncelik,
            "tahsilat_gecmisi": self.tahsilat_gecmisi,
        }

    @classmethod
    def from_dict(cls, veri: dict) -> "Fatura":
        return cls(
            fatura_id=veri["fatura_id"],
            firma_id=veri["firma_id"],
            firma_adi=veri.get("firma_adi", ""),
            fatura_no=veri["fatura_no"],
            tutar=veri["tutar"],
            para_birimi=veri["para_birimi"],
            vade_tarihi=veri["vade_tarihi"],
            durum=veri["durum"],
            notlar=veri.get("notlar", ""),
            olusturma_tarihi=veri.get("olusturma_tarihi"),
            guncelleme_tarihi=veri.get("guncelleme_tarihi"),
            odeme_tarihi=veri.get("odeme_tarihi"),
            arsiv_mi=veri.get("arsiv_mi", False),
            kategori=veri.get("kategori", "genel"),
            oncelik=veri.get("oncelik", "orta"),
            tahsilat_gecmisi=veri.get("tahsilat_gecmisi", []),
        )