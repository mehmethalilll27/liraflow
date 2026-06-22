from datetime import date, timedelta

from data_access import get_store
from models.firma import Firma


class CashflowService:
    def __init__(self, store=None) -> None:
        self.store = store or get_store()

    def get_ayarlar(self) -> dict:
        return self.store.get_ayarlar()

    def update_ayarlar(self, yeni_ayarlar: dict) -> dict:
        mevcut = self.get_ayarlar()
        izinli = {
            "kullanici_adi",
            "kullanici_unvan",
            "mevcut_kasa_bakiyesi",
            "varsayilan_dashboard_periyodu",
            "adjust_sync_gun",
        }
        for anahtar, deger in yeni_ayarlar.items():
            if anahtar in izinli:
                mevcut[anahtar] = deger
        if "mevcut_kasa_bakiyesi" in yeni_ayarlar:
            mevcut["mevcut_kasa_bakiyesi"] = round(float(mevcut.get("mevcut_kasa_bakiyesi", 0)), 2)
        if "varsayilan_dashboard_periyodu" in yeni_ayarlar:
            gun = int(mevcut.get("varsayilan_dashboard_periyodu", 30))
            mevcut["varsayilan_dashboard_periyodu"] = max(1, min(365, gun))
        self.store.save_ayarlar(mevcut)
        return mevcut

    def _store_upsert_firma(self, firma: dict) -> None:
        if hasattr(self.store, "upsert_firma"):
            self.store.upsert_firma(firma)
        else:
            self.store.save_firmalar([firma])

    def _adjust_hareketleri_al(self) -> list[dict]:
        if not hasattr(self.store, "get_adjust_hareketler"):
            return []
        return self.store.get_adjust_hareketler()

    def list_hareketler(
        self,
        gun: int | None = None,
        yon: str | None = None,
        partner: str | None = None,
    ) -> list[dict]:
        hareketler = self._adjust_hareketleri_al()
        bugun = date.today()

        if gun is not None:
            gun = max(1, min(365, int(gun)))
            baslangic = bugun - timedelta(days=gun - 1)
            hareketler = [
                h for h in hareketler if date.fromisoformat(str(h["tarih"])[:10]) >= baslangic
            ]

        if yon:
            hedef_yon = yon.strip().upper()
            hareketler = [h for h in hareketler if h.get("yon", "GIDER") == hedef_yon]

        if partner:
            hedef = partner.strip().casefold()
            hareketler = [
                h
                for h in hareketler
                if hedef in (h.get("partner_adi") or "").casefold()
                or hedef in (h.get("firma_adi") or "").casefold()
                or hedef in (h.get("kampanya") or "").casefold()
            ]

        return sorted(
            hareketler,
            key=lambda x: (str(x.get("tarih", "")), x.get("partner_adi", "")),
            reverse=True,
        )

    def _firmalari_adjust_ile_zenginlestir(self, firmalar: list[dict]) -> list[dict]:
        hareketler = self._adjust_hareketleri_al()
        istatistik: dict[int, dict] = {}

        for hareket in hareketler:
            firma_id = hareket.get("firma_id")
            if firma_id is None:
                continue
            kayit = istatistik.setdefault(
                firma_id,
                {
                    "toplam_harcama": 0.0,
                    "toplam_gelir": 0.0,
                    "hareket_adedi": 0,
                    "son_hareketler": [],
                    "para_birimi": hareket.get("para_birimi", "USD"),
                },
            )
            tutar = float(hareket.get("tutar", 0))
            if hareket.get("yon") == "GELIR":
                kayit["toplam_gelir"] += tutar
            else:
                kayit["toplam_harcama"] += tutar
            kayit["hareket_adedi"] += 1
            kayit["son_hareketler"].append(
                {
                    "tarih": str(hareket.get("tarih", ""))[:10],
                    "tutar": tutar,
                    "yon": hareket.get("yon", "GIDER"),
                    "kampanya": hareket.get("kampanya", ""),
                    "para_birimi": hareket.get("para_birimi", "USD"),
                }
            )

        sonuc: list[dict] = []
        for firma in firmalar:
            zengin = dict(firma)
            ozet = istatistik.get(firma["firma_id"], {})
            harcama = round(float(ozet.get("toplam_harcama", 0)), 2)
            gelir = round(float(ozet.get("toplam_gelir", 0)), 2)
            hareket_adedi = int(ozet.get("hareket_adedi", 0))

            if hareket_adedi == 0:
                continue

            zengin["toplam_harcama"] = harcama
            zengin["toplam_gelir"] = gelir
            zengin["acik_gider"] = harcama
            zengin["acik_gelir"] = gelir
            zengin["net_pozisyon"] = round(gelir - harcama, 2)
            zengin["hareket_adedi"] = hareket_adedi
            zengin["para_birimi"] = ozet.get("para_birimi", "USD")

            yonlar: set[str] = set()
            if harcama > 0:
                yonlar.add("GIDER")
            if gelir > 0:
                yonlar.add("GELIR")
            if yonlar == {"GIDER"}:
                zengin["firma_tipi"] = "TEDARIKCI"
            elif yonlar == {"GELIR"}:
                zengin["firma_tipi"] = "MUSTERI"
            else:
                zengin["firma_tipi"] = "KARMA"

            son = sorted(
                ozet.get("son_hareketler", []),
                key=lambda x: x.get("tarih", ""),
                reverse=True,
            )[:5]
            zengin["son_hareketler"] = son
            sonuc.append(zengin)

        sonuc.sort(
            key=lambda x: (x.get("toplam_harcama", 0) + x.get("toplam_gelir", 0)),
            reverse=True,
        )
        return sonuc

    def list_firmalar(self) -> list[dict]:
        firmalar = self.store.get_firmalar()
        return self._firmalari_adjust_ile_zenginlestir(firmalar)

    def get_firma_by_name(self, firma_adi: str) -> dict | None:
        hedef = firma_adi.strip().casefold()
        for firma in self.list_firmalar():
            if firma["firma_adi"].strip().casefold() == hedef:
                return firma
        return None

    def get_firma_ozet(self, firma_adi: str) -> dict | None:
        return self.get_firma_by_name(firma_adi)

    def add_firma(
        self,
        firma_adi: str,
        eposta: str = "",
        telefon: str = "",
        yetkili_kisi: str = "",
        vergi_no: str = "",
        adres: str = "",
        notlar: str = "",
        **_,
    ) -> dict:
        firmalar = self.store.get_firmalar()
        hedef_ad = firma_adi.strip().casefold()
        for mevcut in firmalar:
            if mevcut["firma_adi"].strip().casefold() == hedef_ad:
                raise ValueError("Bu isimde partner zaten var.")

        yeni_id = max((x["firma_id"] for x in firmalar), default=0) + 1
        firma = Firma(
            firma_id=yeni_id,
            firma_adi=firma_adi.strip(),
            eposta=eposta.strip(),
            telefon=telefon.strip(),
            yetkili_kisi=yetkili_kisi.strip(),
            vergi_no=vergi_no.strip(),
            adres=adres.strip(),
            notlar=notlar.strip() or "Manuel partner",
        )
        firma_dict = firma.to_dict()
        self._store_upsert_firma(firma_dict)
        return self.get_firma_by_name(firma_adi) or firma_dict

    def update_firma(self, firma_adi: str, guncellemeler: dict) -> dict:
        firmalar = self.store.get_firmalar()
        hedef = None
        for firma in firmalar:
            if firma["firma_adi"].strip().casefold() == firma_adi.strip().casefold():
                hedef = firma
                break
        if not hedef:
            raise ValueError("Partner bulunamadi.")

        yeni_ad = guncellemeler.get("firma_adi", hedef["firma_adi"]).strip()
        if yeni_ad.casefold() != firma_adi.strip().casefold():
            for firma in firmalar:
                if firma["firma_adi"].strip().casefold() == yeni_ad.casefold():
                    raise ValueError("Bu isimde baska partner var.")

        alanlar = {
            "firma_adi": yeni_ad,
            "eposta": guncellemeler.get("eposta", hedef.get("eposta", "")).strip(),
            "telefon": guncellemeler.get("telefon", hedef.get("telefon", "")).strip(),
            "yetkili_kisi": guncellemeler.get("yetkili_kisi", hedef.get("yetkili_kisi", "")).strip(),
            "vergi_no": guncellemeler.get("vergi_no", hedef.get("vergi_no", "")).strip(),
            "adres": guncellemeler.get("adres", hedef.get("adres", "")).strip(),
        }
        if "aktif_mi" in guncellemeler:
            alanlar["aktif_mi"] = bool(guncellemeler["aktif_mi"])
        if "notlar" in guncellemeler:
            alanlar["notlar"] = str(guncellemeler["notlar"]).strip()

        hedef.update(alanlar)
        self._store_upsert_firma(hedef)
        return self.get_firma_by_name(yeni_ad) or hedef

    def _partner_ozet_listesi(
        self, hareketler: list[dict], yon: str, para_birimi: str, limit: int = 8
    ) -> list[dict]:
        harita: dict[str, dict] = {}
        for hareket in hareketler:
            if hareket.get("yon") != yon:
                continue
            ad = (hareket.get("partner_adi") or hareket.get("firma_adi") or "Bilinmeyen").strip()
            kayit = harita.setdefault(
                ad,
                {
                    "firma_adi": ad,
                    "tutar": 0.0,
                    "hareket_adedi": 0,
                    "para_birimi": hareket.get("para_birimi", para_birimi),
                    "son_tarih": "",
                },
            )
            kayit["tutar"] += float(hareket.get("tutar", 0))
            kayit["hareket_adedi"] += 1
            tarih = str(hareket.get("tarih", ""))[:10]
            if tarih > kayit["son_tarih"]:
                kayit["son_tarih"] = tarih

        sirali = sorted(harita.values(), key=lambda x: x["tutar"], reverse=True)[:limit]
        for kayit in sirali:
            kayit["tutar"] = round(kayit["tutar"], 2)
            kayit["tarih"] = kayit.pop("son_tarih")
        return sirali

    def get_nakit_dashboard(self, gun: int = 30) -> dict:
        return self.get_adjust_dashboard(gun=gun)

    def get_adjust_dashboard(self, gun: int = 30) -> dict:
        gun = max(1, min(365, gun))
        hareketler = self.list_hareketler(gun=gun)
        ayarlar = self.get_ayarlar()
        mevcut_kasa = round(float(ayarlar.get("mevcut_kasa_bakiyesi", 0)), 2)
        para_birimi = (
            hareketler[0].get("para_birimi", "USD") if hareketler else ayarlar.get("adjust_para_birimi", "USD")
        )

        gelir_kayitlari = [h for h in hareketler if h.get("yon") == "GELIR"]
        gider_kayitlari = [h for h in hareketler if h.get("yon") == "GIDER"]
        gelir_toplam = round(sum(float(h.get("tutar", 0)) for h in gelir_kayitlari), 2)
        gider_toplam = round(sum(float(h.get("tutar", 0)) for h in gider_kayitlari), 2)
        net_durum = round(mevcut_kasa + gelir_toplam - gider_toplam, 2)

        partner_gider = self._partner_ozet_listesi(gider_kayitlari, "GIDER", para_birimi)
        partner_gelir = self._partner_ozet_listesi(gelir_kayitlari, "GELIR", para_birimi)

        son_hareketler = [
            {
                "adjust_key": h.get("adjust_key", ""),
                "firma_adi": h.get("partner_adi") or h.get("firma_adi", ""),
                "tutar": float(h.get("tutar", 0)),
                "para_birimi": h.get("para_birimi", para_birimi),
                "tarih": str(h.get("tarih", ""))[:10],
                "yon": h.get("yon", "GIDER"),
                "kampanya": h.get("kampanya", ""),
            }
            for h in hareketler[:25]
        ]

        def _yon_blok(toplam: float, adet: int, partner_adet: int) -> dict:
            return {
                "donem_toplam": toplam,
                "donem_adedi": adet,
                "partner_adedi": partner_adet,
            }

        return {
            "kaynak": "adjust",
            "mevcut_kasa": mevcut_kasa,
            "donem_gun": gun,
            "para_birimi": para_birimi,
            "son_sync": ayarlar.get("adjust_son_sync"),
            "tablo_hazir": (
                self.store.adjust_tablo_hazir_mi()
                if hasattr(self.store, "adjust_tablo_hazir_mi")
                else True
            ),
            "gelen": _yon_blok(gelir_toplam, len(gelir_kayitlari), len(partner_gelir)),
            "giden": _yon_blok(gider_toplam, len(gider_kayitlari), len(partner_gider)),
            "bulunmasi_gereken": round(max(0.0, gider_toplam - gelir_toplam - mevcut_kasa), 2),
            "net_durum": net_durum,
            "yaklasan_hareketler": son_hareketler,
            "yaklasan_odemeler": partner_gider,
            "yaklasan_tahsilatlar": partner_gelir,
        }

    def get_bildirimler(self) -> dict:
        return {"yaklasan": [], "geciken": [], "toplam": 0, "kaynak": "adjust"}
