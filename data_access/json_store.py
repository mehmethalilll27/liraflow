import json
from pathlib import Path
from tempfile import NamedTemporaryFile


class JsonStore:
    def __init__(self, data_dir: Path | None = None) -> None:
        kok_dizin = Path(__file__).resolve().parent.parent
        self.data_dir = data_dir or (kok_dizin / "data")
        self.data_dir.mkdir(parents=True, exist_ok=True)

        self.firma_path = self.data_dir / "firma_data.json"
        self.fatura_path = self.data_dir / "fatura_data.json"
        self.ayarlar_path = self.data_dir / "ayarlar.json"
        self.kullanici_path = self.data_dir / "kullanici.json"

        self._dosya_yoksa_olustur(self.firma_path, {"firmalar": []})
        self._dosya_yoksa_olustur(self.fatura_path, {"faturalar": []})
        self._dosya_yoksa_olustur(self.kullanici_path, {"kullanicilar": []})
        self._dosya_yoksa_olustur(
            self.ayarlar_path,
            {
                "kullanici_adi": "Abdurrahman Koçak",
                "kullanici_unvan": "Yönetici",
                "varsayilan_odeme_periyodu": 30,
                "varsayilan_vade_gunu": 30,
                "bildirim_gun_siniri": 10,
                "otomatik_gecikti": True,
            },
        )

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

    def get_faturalar(self) -> list[dict]:
        return self._json_oku(self.fatura_path).get("faturalar", [])

    def save_firmalar(self, firmalar: list[dict]) -> None:
        self._json_yaz(self.firma_path, {"firmalar": firmalar})

    def save_faturalar(self, faturalar: list[dict]) -> None:
        self._json_yaz(self.fatura_path, {"faturalar": faturalar})

    def get_ayarlar(self) -> dict:
        return self._json_oku(self.ayarlar_path)

    def save_ayarlar(self, ayarlar: dict) -> None:
        self._json_yaz(self.ayarlar_path, ayarlar)

    def get_kullanicilar(self) -> list[dict]:
        return self._json_oku(self.kullanici_path).get("kullanicilar", [])

    def save_kullanicilar(self, kullanicilar: list[dict]) -> None:
        self._json_yaz(self.kullanici_path, {"kullanicilar": kullanicilar})

