from datetime import date, timedelta

from data_access.json_store import JsonStore
from models.firma import Firma
from models.fatura import Fatura


class CashflowService:
    def __init__(self, store: JsonStore | None = None) -> None:
        self.store = store or JsonStore()

    def _firma_adi_haritasi(self, firmalar: list[dict]) -> dict[int, str]:
        return {firma["firma_id"]: firma["firma_adi"] for firma in firmalar}

    def _firma_periyot_haritasi(self, firmalar: list[dict]) -> dict[int, int]:
        harita = {}
        for firma in firmalar:
            gun = firma.get("odeme_periyodu_gun", firma.get("odeme_vadesi_gun", 30))
            if gun == 10:
                gun = 15
            if gun not in {15, 30, 45}:
                gun = 30
            harita[firma["firma_id"]] = int(gun)
        return harita

    def _periyot_normalize(self, gun: int) -> int:
        if gun == 10:
            return 15
        if gun in {15, 30, 45}:
            return gun
        return 30

    def get_ayarlar(self) -> dict:
        return self.store.get_ayarlar()

    def update_ayarlar(self, yeni_ayarlar: dict) -> dict:
        mevcut = self.get_ayarlar()
        izinli = {
            "kullanici_adi",
            "kullanici_unvan",
            "varsayilan_odeme_periyodu",
            "varsayilan_vade_gunu",
            "bildirim_gun_siniri",
            "otomatik_gecikti",
            "mevcut_kasa_bakiyesi",
        }
        for anahtar, deger in yeni_ayarlar.items():
            if anahtar in izinli:
                mevcut[anahtar] = deger
        if "varsayilan_odeme_periyodu" in yeni_ayarlar:
            mevcut["varsayilan_vade_gunu"] = mevcut["varsayilan_odeme_periyodu"]
        periyot = mevcut.get("varsayilan_odeme_periyodu", mevcut.get("varsayilan_vade_gunu", 30))
        periyot = self._periyot_normalize(int(periyot))
        mevcut["varsayilan_odeme_periyodu"] = periyot
        mevcut["varsayilan_vade_gunu"] = periyot
        mevcut["bildirim_gun_siniri"] = int(mevcut.get("bildirim_gun_siniri", 10))
        if "mevcut_kasa_bakiyesi" in yeni_ayarlar:
            mevcut["mevcut_kasa_bakiyesi"] = round(float(mevcut.get("mevcut_kasa_bakiyesi", 0)), 2)
        self.store.save_ayarlar(mevcut)
        return mevcut

    def _gecmis_ekle(self, fatura: dict, baslik: str, aciklama: str) -> None:
        gecmis = fatura.setdefault("tahsilat_gecmisi", [])
        gecmis.insert(
            0,
            {
                "baslik": baslik,
                "aciklama": aciklama,
                "tarih": date.today().isoformat(),
            },
        )

    def _kalan_gun_hesapla(self, vade_tarihi: str, durum: str) -> int | None:
        if durum in {"ODENDI", "IPTAL"}:
            return None
        vade = date.fromisoformat(vade_tarihi)
        return (vade - date.today()).days

    def _hesapla_oncelik(self, fatura: dict, periyot_gun: int) -> str:
        if fatura["durum"] == "GECIKTI":
            return "yuksek"
        kalan = self._kalan_gun_hesapla(fatura["vade_tarihi"], fatura["durum"])
        if kalan is not None and kalan <= 5:
            return "yuksek"
        if periyot_gun == 15:
            return "yuksek" if (kalan is not None and kalan <= 15) else "orta"
        if periyot_gun == 30:
            if kalan is not None and kalan <= 10:
                return "yuksek"
            return "orta"
        return "dusuk"

    def _fatura_sira_skoru(self, fatura: dict) -> tuple:
        durum_sira = {"GECIKTI": 0, "BEKLIYOR": 1, "ODENDI": 2, "IPTAL": 3}
        oncelik_sira = {"yuksek": 0, "orta": 1, "dusuk": 2}
        durum = fatura["durum"]
        if durum in {"ODENDI", "IPTAL"}:
            vade = fatura.get("vade_tarihi", "")
            vade_key = -date.fromisoformat(vade).toordinal() if vade else 0
            return (
                durum_sira.get(durum, 5),
                0,
                0,
                0,
                0,
                vade_key,
            )
        kalan = fatura.get("kalan_gun")
        kalan_sira = 999 if kalan is None else kalan
        periyot_sira = {15: 0, 30: 1, 45: 2}.get(fatura.get("odeme_periyodu_gun", 30), 1)
        vade = fatura.get("vade_tarihi", "")
        vade_key = date.fromisoformat(vade).toordinal() if vade else 0
        return (
            durum_sira.get(durum, 5),
            oncelik_sira.get(fatura.get("oncelik", "orta"), 1),
            kalan_sira,
            periyot_sira,
            fatura.get("tutar", 0) * -1,
            vade_key,
        )

    def _odeme_sira_skoru(self, fatura: dict) -> tuple:
        return self._fatura_sira_skoru(fatura)

    def _fatura_zenginlestir(self, fatura: dict, firma_periyot_haritasi: dict[int, int]) -> dict:
        sonuc = dict(fatura)
        periyot = firma_periyot_haritasi.get(fatura["firma_id"], 30)
        sonuc["odeme_periyodu_gun"] = periyot
        sonuc["kalan_gun"] = self._kalan_gun_hesapla(fatura["vade_tarihi"], fatura["durum"])
        if fatura["durum"] in {"BEKLIYOR", "GECIKTI"}:
            sonuc["oncelik"] = self._hesapla_oncelik(fatura, periyot)
        return sonuc

    def _faturalari_odeme_sirasina_gore(self, faturalar: list[dict]) -> list[dict]:
        return self._faturalari_listeye_hazirla(faturalar)

    def _faturalari_listeye_hazirla(self, faturalar: list[dict]) -> list[dict]:
        sirali = sorted(faturalar, key=self._fatura_sira_skoru)
        for sira_no, fatura in enumerate(sirali, start=1):
            fatura["liste_sira_no"] = sira_no
            fatura["odeme_sira_no"] = 0
            fatura["tahsilat_sira_no"] = 0
        return sirali

    def _firma_finans_ozet(self, bagli_faturalar: list[dict]) -> dict:
        def acik_mi(f: dict) -> bool:
            return f["durum"] in {"BEKLIYOR", "GECIKTI"} and not f.get("arsiv_mi", False)

        def yon(f: dict) -> str:
            return f.get("yon", "GIDER")

        acik_gider = round(
            sum(x["tutar"] for x in bagli_faturalar if acik_mi(x) and yon(x) == "GIDER"),
            2,
        )
        acik_gelir = round(
            sum(x["tutar"] for x in bagli_faturalar if acik_mi(x) and yon(x) == "GELIR"),
            2,
        )
        geciken_gider = round(
            sum(
                x["tutar"]
                for x in bagli_faturalar
                if x["durum"] == "GECIKTI" and not x.get("arsiv_mi", False) and yon(x) == "GIDER"
            ),
            2,
        )
        geciken_gelir = round(
            sum(
                x["tutar"]
                for x in bagli_faturalar
                if x["durum"] == "GECIKTI" and not x.get("arsiv_mi", False) and yon(x) == "GELIR"
            ),
            2,
        )
        odenen_gider = round(
            sum(x["tutar"] for x in bagli_faturalar if x["durum"] == "ODENDI" and yon(x) == "GIDER"),
            2,
        )
        tahsil_gelir = round(
            sum(x["tutar"] for x in bagli_faturalar if x["durum"] == "ODENDI" and yon(x) == "GELIR"),
            2,
        )

        yonlar = {
            yon(x)
            for x in bagli_faturalar
            if x["durum"] != "IPTAL" and not x.get("arsiv_mi", False)
        }
        if not yonlar:
            firma_tipi = "BOS"
        elif yonlar == {"GIDER"}:
            firma_tipi = "TEDARIKCI"
        elif yonlar == {"GELIR"}:
            firma_tipi = "MUSTERI"
        else:
            firma_tipi = "KARMA"

        son = sorted(bagli_faturalar, key=lambda x: x.get("vade_tarihi", ""), reverse=True)[:5]
        son_faturalar = [
            {
                "fatura_no": x["fatura_no"],
                "tutar": x["tutar"],
                "para_birimi": x.get("para_birimi", "TRY"),
                "vade_tarihi": x["vade_tarihi"],
                "durum": x["durum"],
                "yon": yon(x),
            }
            for x in son
        ]

        return {
            "acik_gider": acik_gider,
            "acik_gelir": acik_gelir,
            "geciken_gider": geciken_gider,
            "geciken_gelir": geciken_gelir,
            "odenen_gider": odenen_gider,
            "tahsil_gelir": tahsil_gelir,
            "net_pozisyon": round(acik_gelir - acik_gider, 2),
            "firma_tipi": firma_tipi,
            "son_faturalar": son_faturalar,
            "toplam_borc": acik_gider,
            "toplam_odenen": round(odenen_gider + tahsil_gelir, 2),
            "toplam_geciken": round(geciken_gider + geciken_gelir, 2),
        }

    def sync_all(self) -> tuple[list[dict], list[dict]]:
        firmalar = self.store.get_firmalar()
        faturalar = self.store.get_faturalar()
        ayarlar = self.get_ayarlar()
        varsayilan_periyot = self._periyot_normalize(
            int(ayarlar.get("varsayilan_odeme_periyodu", ayarlar.get("varsayilan_vade_gunu", 30)))
        )
        otomatik_gecikti = bool(ayarlar.get("otomatik_gecikti", True))

        firma_adi_haritasi = self._firma_adi_haritasi(firmalar)
        firma_fatura_haritasi: dict[int, list[dict]] = {}
        bugun = date.today()

        for fatura in faturalar:
            fatura["firma_adi"] = fatura.get("firma_adi") or firma_adi_haritasi.get(fatura["firma_id"], "")
            fatura.setdefault("olusturma_tarihi", fatura.get("vade_tarihi"))
            fatura.setdefault("guncelleme_tarihi", fatura.get("vade_tarihi"))
            fatura.setdefault("odeme_tarihi", None)
            fatura.setdefault("arsiv_mi", False)
            fatura.setdefault("kategori", "genel")
            fatura.setdefault("oncelik", "orta")
            fatura.setdefault("yon", "GIDER")
            fatura.setdefault("tahsilat_gecmisi", [])

            if (
                otomatik_gecikti
                and fatura["durum"] == "BEKLIYOR"
                and not fatura.get("arsiv_mi", False)
            ):
                vade = date.fromisoformat(fatura["vade_tarihi"])
                if vade < bugun:
                    fatura["durum"] = "GECIKTI"
                    fatura["guncelleme_tarihi"] = bugun.isoformat()
                    self._gecmis_ekle(fatura, "Gecikti", "Vade tarihi geçti, otomatik işaretlendi.")

            firma_fatura_haritasi.setdefault(fatura["firma_id"], []).append(fatura)

        for firma in firmalar:
            bagli_faturalar = firma_fatura_haritasi.get(firma["firma_id"], [])
            ozet = self._firma_finans_ozet(bagli_faturalar)

            firma.setdefault("yetkili_kisi", "")
            firma.setdefault("vergi_no", "")
            firma.setdefault("adres", "")
            firma.setdefault("aktif_mi", True)
            firma.setdefault("varsayilan_yon", "GIDER")
            firma.setdefault("notlar", "")
            firma.setdefault("odeme_periyodu_gun", varsayilan_periyot)
            if "odeme_vadesi_gun" in firma and "odeme_periyodu_gun" not in firma:
                firma["odeme_periyodu_gun"] = self._periyot_normalize(int(firma.pop("odeme_vadesi_gun")))
            firma["odeme_periyodu_gun"] = self._periyot_normalize(int(firma.get("odeme_periyodu_gun", 30)))
            firma.pop("odeme_vadesi_gun", None)
            firma["fatura_no_listesi"] = [x["fatura_no"] for x in bagli_faturalar]
            firma.pop("fatura_id_listesi", None)
            firma.update(ozet)

        firma_periyot_haritasi = self._firma_periyot_haritasi(firmalar)
        for fatura in faturalar:
            if fatura["durum"] in {"BEKLIYOR", "GECIKTI"} and not fatura.get("arsiv_mi", False):
                periyot = firma_periyot_haritasi.get(fatura["firma_id"], 30)
                fatura["oncelik"] = self._hesapla_oncelik(fatura, periyot)

        self.store.save_firmalar(firmalar)
        self.store.save_faturalar(faturalar)
        return firmalar, faturalar

    def list_firmalar(self) -> list[dict]:
        firmalar, _ = self.sync_all()
        return firmalar

    def list_faturalar(
        self,
        durum: str | None = None,
        firma_adi: str | None = None,
        yon: str | None = None,
    ) -> list[dict]:
        firmalar, faturalar = self.sync_all()
        firma_periyot_haritasi = self._firma_periyot_haritasi(firmalar)
        sonuc = [
            self._fatura_zenginlestir(Fatura.from_dict(x).to_dict(), firma_periyot_haritasi)
            for x in faturalar
            if not x.get("arsiv_mi", False)
        ]

        if durum:
            durum = durum.upper()
            sonuc = [x for x in sonuc if x["durum"] == durum]

        if firma_adi:
            hedef = firma_adi.strip().casefold()
            sonuc = [
                x
                for x in sonuc
                if hedef in x["firma_adi"].strip().casefold()
            ]

        if yon:
            yon = yon.upper()
            sonuc = [x for x in sonuc if x.get("yon", "GIDER") == yon]

        return self._faturalari_odeme_sirasina_gore(sonuc)

    def get_firma_by_name(self, firma_adi: str) -> dict | None:
        firmalar, _ = self.sync_all()
        hedef = firma_adi.strip().casefold()
        for firma in firmalar:
            if firma["firma_adi"].strip().casefold() == hedef:
                return firma
        return None

    def get_firma_faturalar(self, firma_adi: str) -> list[dict]:
        return self.list_faturalar(firma_adi=firma_adi)

    def get_firma_ozet(self, firma_adi: str) -> dict | None:
        return self.get_firma_by_name(firma_adi)

    def add_firma(
        self,
        firma_adi: str,
        eposta: str,
        telefon: str,
        yetkili_kisi: str = "",
        vergi_no: str = "",
        adres: str = "",
        odeme_periyodu_gun: int | None = None,
        odeme_vadesi_gun: int | None = None,
        varsayilan_yon: str = "GIDER",
        notlar: str = "",
    ) -> dict:
        ayarlar = self.get_ayarlar()
        periyot = odeme_periyodu_gun if odeme_periyodu_gun is not None else odeme_vadesi_gun
        if periyot is None:
            periyot = int(ayarlar.get("varsayilan_odeme_periyodu", ayarlar.get("varsayilan_vade_gunu", 30)))
        periyot = self._periyot_normalize(int(periyot))

        firmalar, _ = self.sync_all()
        if self.get_firma_by_name(firma_adi):
            raise ValueError("Bu isimde firma zaten var.")

        yon = varsayilan_yon.upper()
        if yon not in {"GIDER", "GELIR"}:
            yon = "GIDER"

        yeni_id = max((x["firma_id"] for x in firmalar), default=0) + 1
        firma = Firma(
            firma_id=yeni_id,
            firma_adi=firma_adi.strip(),
            eposta=eposta.strip(),
            telefon=telefon.strip(),
            yetkili_kisi=yetkili_kisi.strip(),
            vergi_no=vergi_no.strip(),
            adres=adres.strip(),
            aktif_mi=True,
            odeme_periyodu_gun=periyot,
            varsayilan_yon=yon,
            notlar=notlar.strip(),
            fatura_no_listesi=[],
        )
        firmalar.append(firma.to_dict())
        self.store.save_firmalar(firmalar)
        self.sync_all()
        return firma.to_dict()

    def update_firma(self, firma_adi: str, guncellemeler: dict) -> dict:
        firmalar, _ = self.sync_all()
        hedef = self.get_firma_by_name(firma_adi)
        if not hedef:
            raise ValueError("Firma bulunamadi.")

        yeni_ad = guncellemeler.get("firma_adi", hedef["firma_adi"]).strip()
        if yeni_ad.casefold() != firma_adi.strip().casefold():
            if self.get_firma_by_name(yeni_ad):
                raise ValueError("Bu isimde baska firma var.")

        alanlar = {
            "firma_adi": yeni_ad,
            "eposta": guncellemeler.get("eposta", hedef.get("eposta", "")).strip(),
            "telefon": guncellemeler.get("telefon", hedef.get("telefon", "")).strip(),
            "yetkili_kisi": guncellemeler.get("yetkili_kisi", hedef.get("yetkili_kisi", "")).strip(),
            "vergi_no": guncellemeler.get("vergi_no", hedef.get("vergi_no", "")).strip(),
            "adres": guncellemeler.get("adres", hedef.get("adres", "")).strip(),
        }
        if "odeme_periyodu_gun" in guncellemeler or "odeme_vadesi_gun" in guncellemeler:
            ham = guncellemeler.get("odeme_periyodu_gun", guncellemeler.get("odeme_vadesi_gun"))
            alanlar["odeme_periyodu_gun"] = self._periyot_normalize(int(ham))
            alanlar.pop("odeme_vadesi_gun", None)
        if "aktif_mi" in guncellemeler:
            alanlar["aktif_mi"] = bool(guncellemeler["aktif_mi"])
        if "varsayilan_yon" in guncellemeler:
            yon = str(guncellemeler["varsayilan_yon"]).upper()
            alanlar["varsayilan_yon"] = yon if yon in {"GIDER", "GELIR"} else "GIDER"
        if "notlar" in guncellemeler:
            alanlar["notlar"] = str(guncellemeler["notlar"]).strip()

        for firma in firmalar:
            if firma["firma_id"] == hedef["firma_id"]:
                firma.update(alanlar)
                hedef = firma
                break

        _, faturalar = self.sync_all()
        for fatura in faturalar:
            if fatura["firma_id"] == hedef["firma_id"]:
                fatura["firma_adi"] = hedef["firma_adi"]

        self.store.save_firmalar(firmalar)
        self.store.save_faturalar(faturalar)
        self.sync_all()
        return hedef

    def get_genel_ozet(self) -> dict:
        faturalar = self.list_faturalar()
        ayarlar = self.get_ayarlar()
        gun_siniri = int(ayarlar.get("bildirim_gun_siniri", 10))
        bugun = date.today()
        son_gun = bugun + timedelta(days=gun_siniri)

        bekleyen = [x for x in faturalar if x["durum"] == "BEKLIYOR"]
        geciken = [x for x in faturalar if x["durum"] == "GECIKTI"]
        odenen = [x for x in faturalar if x["durum"] == "ODENDI"]

        yaklasan = []
        for fatura in bekleyen:
            vade = date.fromisoformat(fatura["vade_tarihi"])
            if bugun <= vade <= son_gun:
                yaklasan.append(fatura)

        geciken_firma_sayisi = len({x["firma_id"] for x in geciken})

        return {
            "fatura_adedi": len(faturalar),
            "bekleyen_adedi": len(bekleyen),
            "geciken_adedi": len(geciken),
            "odenen_adedi": len(odenen),
            "yaklasan_adedi": len(yaklasan),
            "geciken_firma_sayisi": geciken_firma_sayisi,
            "bildirim_gun_siniri": gun_siniri,
            "toplam_odenecek": round(sum(x["tutar"] for x in bekleyen), 2),
            "yaklasan_odenecek": round(sum(x["tutar"] for x in yaklasan), 2),
            "toplam_geciken": round(sum(x["tutar"] for x in geciken), 2),
            "toplam_odenen": round(sum(x["tutar"] for x in odenen), 2),
        }

    def _fatura_donemde_mi(self, fatura: dict, bugun: date, donem_son: date) -> bool:
        if fatura["durum"] not in {"BEKLIYOR", "GECIKTI"}:
            return False
        if fatura["durum"] == "GECIKTI":
            return True
        vade = date.fromisoformat(fatura["vade_tarihi"])
        return bugun <= vade <= donem_son

    def _yon_ozet_hesapla(
        self,
        faturalar: list[dict],
        yon: str,
        bugun: date,
        bildirim_son: date,
        donem_son: date,
    ) -> dict:
        hedef = [x for x in faturalar if x.get("yon", "GIDER") == yon]
        bekleyen = [x for x in hedef if x["durum"] == "BEKLIYOR"]
        geciken = [x for x in hedef if x["durum"] == "GECIKTI"]
        tamamlanan = [x for x in hedef if x["durum"] == "ODENDI"]
        acik = bekleyen + geciken

        yaklasan = []
        for fatura in bekleyen:
            vade = date.fromisoformat(fatura["vade_tarihi"])
            if bugun <= vade <= bildirim_son:
                yaklasan.append(fatura)

        donem_ici = []
        donem_faturalar = []
        for fatura in acik:
            vade = date.fromisoformat(fatura["vade_tarihi"])
            if fatura["durum"] == "GECIKTI":
                donem_faturalar.append(fatura)
            elif bugun <= vade <= donem_son:
                donem_ici.append(fatura)
                donem_faturalar.append(fatura)

        return {
            "bekleyen": round(sum(x["tutar"] for x in bekleyen), 2),
            "geciken": round(sum(x["tutar"] for x in geciken), 2),
            "bekleyen_toplam": round(sum(x["tutar"] for x in acik), 2),
            "tamamlanan": round(sum(x["tutar"] for x in tamamlanan), 2),
            "yaklasan": round(sum(x["tutar"] for x in yaklasan), 2),
            "yaklasan_adedi": len(yaklasan),
            "geciken_adedi": len(geciken),
            "bekleyen_adedi": len(bekleyen),
            "donem_ici": round(sum(x["tutar"] for x in donem_ici), 2),
            "donem_ici_adedi": len(donem_ici),
            "donem_toplam": round(sum(x["tutar"] for x in donem_faturalar), 2),
            "donem_adedi": len(donem_faturalar),
            "donem_geciken": round(sum(x["tutar"] for x in geciken), 2),
            "donem_geciken_adedi": len(geciken),
        }

    def get_nakit_dashboard(self, gun: int = 30) -> dict:
        faturalar = self.list_faturalar()
        ayarlar = self.get_ayarlar()
        mevcut_kasa = round(float(ayarlar.get("mevcut_kasa_bakiyesi", 0)), 2)
        gun_siniri = int(ayarlar.get("bildirim_gun_siniri", 10))
        bugun = date.today()
        bildirim_son = bugun + timedelta(days=gun_siniri)
        donem_son = bugun + timedelta(days=max(1, gun))

        gelen = self._yon_ozet_hesapla(faturalar, "GELIR", bugun, bildirim_son, donem_son)
        giden = self._yon_ozet_hesapla(faturalar, "GIDER", bugun, bildirim_son, donem_son)

        net_durum = round(gelen["donem_toplam"] + mevcut_kasa - giden["donem_toplam"], 2)
        bulunmasi_gereken = round(
            max(0, giden["donem_toplam"] - gelen["donem_toplam"] - mevcut_kasa), 2
        )

        hareketler = []
        for fatura in faturalar:
            if not self._fatura_donemde_mi(fatura, bugun, donem_son):
                continue
            hareketler.append(
                {
                    "fatura_no": fatura["fatura_no"],
                    "firma_adi": fatura["firma_adi"],
                    "tutar": fatura["tutar"],
                    "para_birimi": fatura.get("para_birimi", "TRY"),
                    "vade_tarihi": fatura["vade_tarihi"],
                    "durum": fatura["durum"],
                    "yon": fatura.get("yon", "GIDER"),
                    "kalan_gun": fatura.get("kalan_gun"),
                }
            )
        hareketler.sort(key=lambda x: (0 if x["durum"] == "GECIKTI" else 1, x["vade_tarihi"]))

        def _yaklasan_liste(yon: str, limit: int = 8) -> list[dict]:
            aday = [
                x
                for x in faturalar
                if x.get("yon", "GIDER") == yon and self._fatura_donemde_mi(x, bugun, donem_son)
            ]
            aday.sort(
                key=lambda x: (
                    0 if x["durum"] == "GECIKTI" else 1,
                    x.get("kalan_gun") if x.get("kalan_gun") is not None else 999,
                    x["vade_tarihi"],
                )
            )
            return [
                {
                    "fatura_no": x["fatura_no"],
                    "firma_adi": x["firma_adi"],
                    "tutar": x["tutar"],
                    "para_birimi": x.get("para_birimi", "TRY"),
                    "vade_tarihi": x["vade_tarihi"],
                    "durum": x["durum"],
                    "kalan_gun": x.get("kalan_gun"),
                }
                for x in aday[:limit]
            ]

        return {
            "mevcut_kasa": mevcut_kasa,
            "donem_gun": gun,
            "bildirim_gun_siniri": gun_siniri,
            "gelen": gelen,
            "giden": giden,
            "bulunmasi_gereken": bulunmasi_gereken,
            "net_durum": net_durum,
            "yaklasan_hareketler": hareketler,
            "yaklasan_odemeler": _yaklasan_liste("GIDER"),
            "yaklasan_tahsilatlar": _yaklasan_liste("GELIR"),
        }

    def get_bildirimler(self) -> dict:
        ayarlar = self.get_ayarlar()
        gun_siniri = int(ayarlar.get("bildirim_gun_siniri", 10))
        faturalar = self.list_faturalar()
        bugun = date.today()
        son_gun = bugun + timedelta(days=gun_siniri)

        yaklasan = []
        geciken = []
        for fatura in faturalar:
            if fatura["durum"] == "GECIKTI":
                geciken.append(fatura)
            elif fatura["durum"] == "BEKLIYOR":
                vade = date.fromisoformat(fatura["vade_tarihi"])
                if bugun <= vade <= son_gun:
                    yaklasan.append(fatura)

        return {
            "yaklasan": yaklasan,
            "geciken": geciken,
            "toplam": len(yaklasan) + len(geciken),
        }

    def get_fatura_by_no(self, fatura_no: str) -> dict | None:
        firmalar, faturalar = self.sync_all()
        firma_periyot_haritasi = self._firma_periyot_haritasi(firmalar)
        hedef = fatura_no.strip()
        for fatura in faturalar:
            if fatura["fatura_no"] == hedef:
                return self._fatura_zenginlestir(Fatura.from_dict(fatura).to_dict(), firma_periyot_haritasi)
        return None

    def _vade_hesapla(self, olusturma_tarihi: str | None = None, gun: int = 30) -> str:
        baslangic = date.fromisoformat(olusturma_tarihi) if olusturma_tarihi else date.today()
        return (baslangic + timedelta(days=gun)).isoformat()

    def add_fatura(
        self,
        firma_adi: str,
        tutar: float,
        vade_tarihi: str | None = None,
        durum: str = "BEKLIYOR",
        notlar: str = "",
        para_birimi: str = "TRY",
        kategori: str = "genel",
        oncelik: str = "orta",
        odeme_periyodu_gun: int | None = None,
        yon: str = "GIDER",
    ) -> dict:
        self.sync_all()
        firma = self.get_firma_by_name(firma_adi)
        if not firma:
            raise ValueError("Firma bulunamadi.")

        if odeme_periyodu_gun is not None:
            periyot = self._periyot_normalize(int(odeme_periyodu_gun))
            self.update_firma(firma_adi, {"odeme_periyodu_gun": periyot})
            firma = self.get_firma_by_name(firma_adi) or firma

        bugun = date.today().isoformat()
        if not vade_tarihi:
            vade_tarihi = self._vade_hesapla(bugun)

        periyot = self._periyot_normalize(int(firma.get("odeme_periyodu_gun", 30)))

        _, faturalar = self.sync_all()
        yeni_id = max((x["fatura_id"] for x in faturalar), default=0) + 1
        yil = date.today().year
        mevcut_nolar = {x["fatura_no"] for x in faturalar}
        sira = yeni_id
        fatura_no = f"FTR-{yil}-{sira:04d}"
        while fatura_no in mevcut_nolar:
            sira += 1
            fatura_no = f"FTR-{yil}-{sira:04d}"

        durum = durum.upper()
        if durum not in {"BEKLIYOR", "GECIKTI", "ODENDI", "IPTAL"}:
            raise ValueError("Gecersiz durum.")
        yon = (yon or firma.get("varsayilan_yon", "GIDER")).upper()
        if yon not in {"GIDER", "GELIR"}:
            raise ValueError("Gecersiz yon.")

        fatura_dict = {
            "fatura_id": yeni_id,
            "firma_id": firma["firma_id"],
            "firma_adi": firma["firma_adi"],
            "fatura_no": fatura_no,
            "tutar": round(float(tutar), 2),
            "para_birimi": para_birimi,
            "vade_tarihi": vade_tarihi,
            "durum": durum,
            "notlar": notlar.strip(),
            "olusturma_tarihi": bugun,
            "guncelleme_tarihi": bugun,
            "odeme_tarihi": None,
            "arsiv_mi": False,
            "kategori": kategori,
            "oncelik": self._hesapla_oncelik({"durum": durum, "vade_tarihi": vade_tarihi}, periyot),
            "yon": yon,
            "tahsilat_gecmisi": [
                {
                    "baslik": "Fatura Oluşturuldu",
                    "aciklama": f"Vade: {vade_tarihi} — {periyot} günde bir ödeme",
                    "tarih": bugun,
                }
            ],
        }
        faturalar.append(fatura_dict)
        self.store.save_faturalar(faturalar)
        self.sync_all()
        sonuc = self.get_fatura_by_no(fatura_no)
        return sonuc or fatura_dict

    def update_fatura_durum(self, fatura_no: str, durum: str, odeme_tarihi: str | None = None) -> dict:
        durum = durum.upper()
        if durum not in {"BEKLIYOR", "GECIKTI", "ODENDI", "IPTAL"}:
            raise ValueError("Gecersiz durum.")

        _, faturalar = self.sync_all()
        hedef = None
        for fatura in faturalar:
            if fatura["fatura_no"] == fatura_no:
                hedef = fatura
                break
        if not hedef:
            raise ValueError("Fatura bulunamadi.")

        eski_durum = hedef["durum"]
        hedef["durum"] = durum
        hedef["guncelleme_tarihi"] = date.today().isoformat()
        if durum == "ODENDI":
            hedef["odeme_tarihi"] = odeme_tarihi or date.today().isoformat()
            self._gecmis_ekle(
                hedef,
                "Ödeme Onaylandı",
                f"Durum {eski_durum} → ODENDI olarak güncellendi.",
            )
        else:
            self._gecmis_ekle(
                hedef,
                "Durum Güncellendi",
                f"Durum {eski_durum} → {durum} olarak değiştirildi.",
            )

        self.store.save_faturalar(faturalar)
        self.sync_all()
        return self.get_fatura_by_no(fatura_no) or hedef

    def odeme_kaydet(
        self,
        fatura_no: str,
        tutar: float,
        odeme_tarihi: str | None = None,
        kanal: str = "",
        notlar: str = "",
    ) -> dict:
        _, faturalar = self.sync_all()
        hedef = None
        for fatura in faturalar:
            if fatura["fatura_no"] == fatura_no:
                hedef = fatura
                break
        if not hedef:
            raise ValueError("Fatura bulunamadi.")

        odeme_tarihi = odeme_tarihi or date.today().isoformat()
        kanal_metin = f" ({kanal})" if kanal else ""
        not_metin = f" — {notlar}" if notlar else ""
        yon = hedef.get("yon", "GIDER")
        eylem = "Tahsilat" if yon == "GELIR" else "Ödeme"
        self._gecmis_ekle(
            hedef,
            f"{eylem} Kaydı",
            f"{tutar:.2f} TRY {eylem.lower()} kaydedildi{kanal_metin}{not_metin}",
        )
        hedef["odeme_tarihi"] = odeme_tarihi
        hedef["guncelleme_tarihi"] = date.today().isoformat()

        if float(tutar) >= float(hedef["tutar"]):
            hedef["durum"] = "ODENDI"
            self._gecmis_ekle(hedef, "Tam Ödeme", "Fatura tamamen ödendi olarak işaretlendi.")
        else:
            hedef["durum"] = "BEKLIYOR"
            kalan = float(hedef["tutar"]) - float(tutar)
            self._gecmis_ekle(hedef, "Kısmi Ödeme", f"Kalan tutar: {kalan:.2f} TRY")

        self.store.save_faturalar(faturalar)
        self.sync_all()
        return self.get_fatura_by_no(fatura_no) or hedef

    def fatura_arsivle(self, fatura_no: str) -> dict:
        _, faturalar = self.sync_all()
        hedef = None
        for fatura in faturalar:
            if fatura["fatura_no"] == fatura_no:
                hedef = fatura
                break
        if not hedef:
            raise ValueError("Fatura bulunamadi.")
        hedef["arsiv_mi"] = True
        hedef["guncelleme_tarihi"] = date.today().isoformat()
        self._gecmis_ekle(hedef, "Arşivlendi", "Fatura arşive alındı.")
        self.store.save_faturalar(faturalar)
        self.sync_all()
        return hedef

    def fatura_sil(self, fatura_no: str) -> None:
        _, faturalar = self.sync_all()
        yeni_liste = [x for x in faturalar if x["fatura_no"] != fatura_no]
        if len(yeni_liste) == len(faturalar):
            raise ValueError("Fatura bulunamadi.")
        self.store.save_faturalar(yeni_liste)
        self.sync_all()
