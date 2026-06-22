import json
from pathlib import Path
from tempfile import NamedTemporaryFile

from data_access.field_maps import DEFAULT_AYARLAR


class JsonStore:
    def __init__(self, data_dir: Path | None = None) -> None:
        kok_dizin = Path(__file__).resolve().parent.parent
        self.data_dir = data_dir or (kok_dizin / "data")
        self.data_dir.mkdir(parents=True, exist_ok=True)

        self.firma_path = self.data_dir / "firma_data.json"
        self.ayarlar_path = self.data_dir / "ayarlar.json"
        self.kullanici_path = self.data_dir / "kullanici.json"
        self.hareket_path = self.data_dir / "adjust_hareketler.json"

        self._dosya_yoksa_olustur(self.firma_path, {"firmalar": []})
        self._dosya_yoksa_olustur(self.kullanici_path, {"kullanicilar": []})
        self._dosya_yoksa_olustur(self.hareket_path, {"hareketler": []})
        self._dosya_yoksa_olustur(self.ayarlar_path, dict(DEFAULT_AYARLAR))

    def _dosya_yoksa_olustur(self, path: Path, varsayilan_veri: dict) -> None:
        if not path.exists():
            self._json_yaz(path, varsayilan_veri)

    def _json_oku(self, path: Path) -> dict:
        with path.open("r", encoding="utf-8") as file:
            return json.load(file)

    def _json_yaz(self, path: Path, veri: dict) -> None:
        with NamedTemporaryFile("w", encoding="utf-8", delete=False, dir=str(path.parent)) as temp_file:
            json.dump(veri, temp_file, ensure_ascii=False, indent=2)
            temp_path = Path(temp_file.name)
        temp_path.replace(path)

    def get_firmalar(self) -> list[dict]:
        return self._json_oku(self.firma_path).get("firmalar", [])

    def save_firmalar(self, firmalar: list[dict]) -> None:
        self._json_yaz(self.firma_path, {"firmalar": firmalar})

    def get_ayarlar(self) -> dict:
        data = self._json_oku(self.ayarlar_path)
        merged = dict(DEFAULT_AYARLAR)
        merged.update(data)
        return merged

    def save_ayarlar(self, ayarlar: dict) -> None:
        self._json_yaz(self.ayarlar_path, ayarlar)

    def get_kullanicilar(self) -> list[dict]:
        return self._json_oku(self.kullanici_path).get("kullanicilar", [])

    def save_kullanicilar(self, kullanicilar: list[dict]) -> None:
        self._json_yaz(self.kullanici_path, {"kullanicilar": kullanicilar})

    def get_adjust_hareketler(self) -> list[dict]:
        return self._json_oku(self.hareket_path).get("hareketler", [])

    def upsert_adjust_hareketler(self, hareketler: list[dict]) -> None:
        mevcut = {h["adjust_key"]: h for h in self.get_adjust_hareketler()}
        for hareket in hareketler:
            mevcut[hareket["adjust_key"]] = hareket
        sirali = sorted(
            mevcut.values(),
            key=lambda x: (x.get("tarih", ""), x.get("partner_adi", "")),
            reverse=True,
        )
        self._json_yaz(self.hareket_path, {"hareketler": sirali})

    def adjust_tablo_hazir_mi(self) -> bool:
        return True
