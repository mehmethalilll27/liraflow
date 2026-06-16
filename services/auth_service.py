import bcrypt
import jwt
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path

from data_access.json_store import JsonStore

SECRET_DOSYA = Path(__file__).resolve().parent.parent / "data" / "auth_secret.txt"
ALGORITHM = "HS256"
TOKEN_SAAT = 24


class AuthService:
    def __init__(self, store: JsonStore | None = None) -> None:
        self.store = store or JsonStore()
        self._varsayilan_kullanici_olustur()

    def _secret_al(self) -> str:
        if SECRET_DOSYA.exists():
            return SECRET_DOSYA.read_text(encoding="utf-8").strip()
        secret = secrets.token_urlsafe(48)
        SECRET_DOSYA.write_text(secret, encoding="utf-8")
        return secret

    @staticmethod
    def sifre_hashle(sifre: str) -> str:
        return bcrypt.hashpw(sifre.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    @staticmethod
    def sifre_dogrula(sifre: str, sifre_hash: str) -> bool:
        return bcrypt.checkpw(sifre.encode("utf-8"), sifre_hash.encode("utf-8"))

    def _varsayilan_kullanici_olustur(self) -> None:
        kullanicilar = self.store.get_kullanicilar()
        if kullanicilar:
            return
        self.store.save_kullanicilar(
            [
                {
                    "kullanici_adi": "abdurrahman",
                    "ad_soyad": "Abdurrahman Koçak",
                    "unvan": "Yönetici",
                    "sifre_hash": self.sifre_hashle("liraflow123"),
                }
            ]
        )

    def kullanici_bul(self, kullanici_adi: str) -> dict | None:
        hedef = kullanici_adi.strip().casefold()
        for kullanici in self.store.get_kullanicilar():
            if kullanici["kullanici_adi"].casefold() == hedef:
                return kullanici
        return None

    def giris_yap(self, kullanici_adi: str, sifre: str) -> dict:
        kullanici = self.kullanici_bul(kullanici_adi)
        if not kullanici or not self.sifre_dogrula(sifre, kullanici["sifre_hash"]):
            raise ValueError("Kullanıcı adı veya şifre hatalı.")

        token = jwt.encode(
            {
                "sub": kullanici["kullanici_adi"],
                "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_SAAT),
            },
            self._secret_al(),
            algorithm=ALGORITHM,
        )
        return {
            "token": token,
            "kullanici": {
                "kullanici_adi": kullanici["kullanici_adi"],
                "ad_soyad": kullanici["ad_soyad"],
                "unvan": kullanici["unvan"],
            },
        }

    def token_dogrula(self, token: str) -> dict:
        try:
            payload = jwt.decode(token, self._secret_al(), algorithms=[ALGORITHM])
        except jwt.PyJWTError as exc:
            raise ValueError("Geçersiz veya süresi dolmuş oturum.") from exc

        kullanici = self.kullanici_bul(payload.get("sub", ""))
        if not kullanici:
            raise ValueError("Kullanıcı bulunamadı.")
        return {
            "kullanici_adi": kullanici["kullanici_adi"],
            "ad_soyad": kullanici["ad_soyad"],
            "unvan": kullanici["unvan"],
        }

    def sifre_guncelle(self, kullanici_adi: str, eski_sifre: str, yeni_sifre: str) -> None:
        kullanici = self.kullanici_bul(kullanici_adi)
        if not kullanici or not self.sifre_dogrula(eski_sifre, kullanici["sifre_hash"]):
            raise ValueError("Mevcut şifre hatalı.")
        if len(yeni_sifre) < 6:
            raise ValueError("Yeni şifre en az 6 karakter olmalı.")

        kullanicilar = self.store.get_kullanicilar()
        for kayit in kullanicilar:
            if kayit["kullanici_adi"] == kullanici["kullanici_adi"]:
                kayit["sifre_hash"] = self.sifre_hashle(yeni_sifre)
                break
        self.store.save_kullanicilar(kullanicilar)
