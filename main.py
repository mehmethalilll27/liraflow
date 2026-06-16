import json
from pathlib import Path

from firma import Firma
from fatura import Fatura


fatura_json_yolu = Path(__file__).with_name("fatura_data.json")
firma_json_yolu = Path(__file__).with_name("firma_data.json")

with fatura_json_yolu.open("r", encoding="utf-8") as file:
    data = json.load(file)
    faturalar = data["faturalar"]

with firma_json_yolu.open("r", encoding="utf-8") as file:
    data = json.load(file)
    firmalar = data["firmalar"]


def _kaydet_faturalar() -> None:
    with fatura_json_yolu.open("w", encoding="utf-8") as file:
        json.dump({"faturalar": faturalar}, file, ensure_ascii=False, indent=2)


def _kaydet_firmalar() -> None:
    with firma_json_yolu.open("w", encoding="utf-8") as file:
        json.dump({"firmalar": firmalar}, file, ensure_ascii=False, indent=2)


def _fatura_firma_eslemesi() -> dict[int, str]:
    return {firma["firma_id"]: firma["firma_adi"] for firma in firmalar}


def _veriyi_zenginlestir_ve_ozetle() -> None:
    firma_adi_haritasi = _fatura_firma_eslemesi()
    fatura_grup: dict[int, list[dict]] = {}

    for fatura in faturalar:
        fatura["firma_adi"] = fatura.get("firma_adi") or firma_adi_haritasi.get(fatura["firma_id"], "")
        fatura.setdefault("olusturma_tarihi", fatura.get("vade_tarihi"))
        fatura.setdefault("guncelleme_tarihi", fatura.get("vade_tarihi"))
        fatura.setdefault("odeme_tarihi", None)
        fatura.setdefault("arsiv_mi", False)
        fatura.setdefault("kategori", "genel")
        fatura.setdefault("oncelik", "orta")
        fatura.setdefault("tahsilat_gecmisi", [])
        fatura_grup.setdefault(fatura["firma_id"], []).append(fatura)

    for firma in firmalar:
        bagli_faturalar = fatura_grup.get(firma["firma_id"], [])
        toplam_borc = sum(
            x["tutar"]
            for x in bagli_faturalar
            if x["durum"] in {"BEKLIYOR", "GECIKTI"} and not x.get("arsiv_mi", False)
        )
        toplam_odenen = sum(x["tutar"] for x in bagli_faturalar if x["durum"] == "ODENDI")
        toplam_geciken = sum(x["tutar"] for x in bagli_faturalar if x["durum"] == "GECIKTI")

        firma.setdefault("yetkili_kisi", "")
        firma.setdefault("vergi_no", "")
        firma.setdefault("adres", "")
        firma.setdefault("aktif_mi", True)
        firma["fatura_no_listesi"] = [x["fatura_no"] for x in bagli_faturalar]
        if "fatura_id_listesi" in firma:
            del firma["fatura_id_listesi"]
        firma["toplam_borc"] = round(toplam_borc, 2)
        firma["toplam_odenen"] = round(toplam_odenen, 2)
        firma["toplam_geciken"] = round(toplam_geciken, 2)

    _kaydet_faturalar()
    _kaydet_firmalar()


def _fatura_nesneleri() -> list[Fatura]:
    return [Fatura.from_dict(fatura_veri) for fatura_veri in faturalar]


def _firma_ada_gore_bul(firma_adi: str) -> dict | None:
    aranan = firma_adi.strip().casefold()
    for firma in firmalar:
        if firma["firma_adi"].strip().casefold() == aranan:
            return firma
    return None


def gecikmis_faturalar():
    bulundu = False
    for fatura in _fatura_nesneleri():
        if fatura.durum == "GECIKTI":
            bulundu = True
            print(f"Firma Adı: {fatura.firma_adi} | Fatura No: {fatura.fatura_no} | Tutar: {fatura.tutar} {fatura.para_birimi}")
    if not bulundu:
        print("Gecikmis fatura bulunamadi.")


def odenecek_faturalar():
    bulundu = False
    for fatura in _fatura_nesneleri():
        if fatura.durum == "BEKLIYOR":
            bulundu = True
            print(f"Firma Adı: {fatura.firma_adi} | Fatura No: {fatura.fatura_no} | Tutar: {fatura.tutar} {fatura.para_birimi}")
    if not bulundu:
        print("Odenecek fatura bulunamadi.")


def odenen_faturalar():
    bulundu = False
    for fatura in _fatura_nesneleri():
        if fatura.durum == "ODENDI":
            bulundu = True
            print(f"Firma Adı: {fatura.firma_adi} | Fatura No: {fatura.fatura_no} | Tutar: {fatura.tutar} {fatura.para_birimi}")
    if not bulundu:
        print("Odenen fatura bulunamadi.")


def toplam_odenecek_tutar():
    toplam = 0.0
    for fatura in _fatura_nesneleri():
        if fatura.durum == "BEKLIYOR":
            toplam += fatura.tutar
    print(f"Toplam Odenecek Tutar: {toplam} TRY")


def tarih_siralama():
    return sorted(_fatura_nesneleri(), key=lambda x: x.vade_tarihi)


def firma_bazli_faturalar():
    firma_adi = input("Firma Adi: ").strip()
    firma_veri = _firma_ada_gore_bul(firma_adi)
    if not firma_veri:
        print("Firma bulunamadi.")
        return

    bulunanlar = [f for f in _fatura_nesneleri() if f.firma_id == firma_veri["firma_id"]]
    if not bulunanlar:
        print("Bu firmaya ait fatura bulunamadi.")
        return

    for fatura in bulunanlar:
        print(f"{fatura.fatura_no} | {fatura.durum} | {fatura.tutar} {fatura.para_birimi} | Vade: {fatura.vade_tarihi}")

def firma_bazli_ozet():
    firma_adi = input("Firma Adi: ").strip()
    firma_veri = _firma_ada_gore_bul(firma_adi)
    if not firma_veri:
        print("Firma bulunamadi.")
        return

    print(f"Firma: {firma_veri['firma_adi']}")
    print(f"Toplam Borc: {firma_veri['toplam_borc']} TRY")
    print(f"Toplam Odenen: {firma_veri['toplam_odenen']} TRY")
    print(f"Toplam Geciken: {firma_veri['toplam_geciken']} TRY")
    print(f"Fatura No Listesi: {firma_veri.get('fatura_no_listesi', [])}")


def firma_ekle():
    firma_id = max((firma["firma_id"] for firma in firmalar), default=0) + 1
    firma_adi = input("Firma Adi: ").strip()
    eposta = input("E-posta: ").strip()
    telefon = input("Telefon: ").strip()
    if not firma_adi:
        print("Firma adi bos olamaz.")
        return

    firma = Firma(
        firma_id=firma_id,
        firma_adi=firma_adi,
        eposta=eposta,
        telefon=telefon,
        aktif_mi=True,
        fatura_no_listesi=[],
    )
    firmalar.append(firma.to_dict())
    _veriyi_zenginlestir_ve_ozetle()
    print("Firma basariyla eklendi.")


_veriyi_zenginlestir_ve_ozetle()

while True:
    try:
        menu = int(
            input(
                "1. Gecikmis Faturalar\n"
                "2. Odenecek Faturalar\n"
                "3. Odenen Faturalar\n"
                "4. Toplam Odenecek Tutar\n"
                "5. Faturalari Tarihe Gore Sirala\n"
                "6. Firma Ekle\n"
                "7. Firma Bazli Faturalar\n"
                "8. Firma Bazli Ozet\n"
                "9. Cikis\n"
            )
        )
    except ValueError:
        print("Lutfen sayi giriniz.")
        continue

    if menu == 1:
        gecikmis_faturalar()
    elif menu == 2:
        odenecek_faturalar()
    elif menu == 3:
        odenen_faturalar()
    elif menu == 4:
        toplam_odenecek_tutar()
    elif menu == 5:
        siralanmis_faturalar = tarih_siralama()
        for fatura in siralanmis_faturalar:
            print(f"Firma Adı: {fatura.firma_adi} | Fatura No: {fatura.fatura_no} | Tutar: {fatura.tutar} {fatura.para_birimi} | Vade Tarihi: {fatura.vade_tarihi}")
    elif menu == 6:
        firma_ekle()
    elif menu == 7:
        firma_bazli_faturalar()
    elif menu == 8:
        firma_bazli_ozet()
    elif menu == 9:
        break
    else:
        print("Gecersiz secim")