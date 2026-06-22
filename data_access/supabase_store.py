from __future__ import annotations

import time
from typing import Any

from supabase import Client, create_client

try:
    from postgrest.exceptions import APIError as PostgrestAPIError
except ImportError:  # pragma: no cover
    PostgrestAPIError = Exception

from config import settings
from data_access.field_maps import DEFAULT_AYARLAR, FIRMA_PERSISTED_KEYS

CHUNK_SIZE = 50
MAX_RETRIES = 3
ADJUST_TABLO_UYARI = (
    "adjust_hareketler tablosu Supabase'de yok. "
    "Supabase Dashboard → SQL Editor → supabase/migrate_adjust.sql dosyasını çalıştırın."
)


def _adjust_tablo_eksik_mi(exc: Exception) -> bool:
    if isinstance(exc, PostgrestAPIError):
        payload = exc.args[0] if exc.args and isinstance(exc.args[0], dict) else {}
        if payload.get("code") == "PGRST205":
            return True
    metin = str(exc).casefold()
    return "adjust_hareketler" in metin and ("pgrst205" in metin or "could not find the table" in metin)


def _rls_hatasi_mi(exc: Exception) -> bool:
    if isinstance(exc, PostgrestAPIError):
        payload = exc.args[0] if exc.args and isinstance(exc.args[0], dict) else {}
        if payload.get("code") == "42501":
            return True
    return "row-level security" in str(exc).casefold()


RLS_UYARI = (
    "Supabase RLS yazmayı engelliyor. Çözüm (birini yapın):\n"
    "1) Supabase Dashboard → SQL Editor → supabase/fix_rls.sql dosyasını çalıştırın\n"
    "2) .env içindeki SUPABASE_SERVICE_KEY değerini service_role secret ile değiştirin "
    "(publishable/anon anahtar backend için uygun değil)"
)


def _supabase_anahtar_uyarisi() -> str | None:
    anahtar = settings.SUPABASE_SERVICE_KEY.casefold()
    if "publishable" in anahtar or anahtar.startswith("sb_publishable_"):
        return (
            "SUPABASE_SERVICE_KEY publishable (anon) anahtar gibi görünüyor. "
            "Yazma hatalarında service_role secret kullanın veya fix_rls.sql çalıştırın."
        )
    return None


class SupabaseStore:
    def __init__(self, client: Client | None = None) -> None:
        self._adjust_tablo_var: bool | None = None
        if client is not None:
            self._client = client
            return
        if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
            raise RuntimeError(
                "Supabase yapılandırması eksik. .env dosyasında SUPABASE_URL ve "
                "SUPABASE_SERVICE_KEY tanımlayın."
            )
        self._client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        uyar = _supabase_anahtar_uyarisi()
        if uyar:
            import warnings

            warnings.warn(uyar, stacklevel=2)

    @staticmethod
    def _chunks(items: list[dict], size: int = CHUNK_SIZE) -> list[list[dict]]:
        return [items[i : i + size] for i in range(0, len(items), size)]

    def _execute(self, request_builder):
        last_error: Exception | None = None
        for attempt in range(MAX_RETRIES):
            try:
                return request_builder.execute()
            except Exception as exc:
                last_error = exc
                if attempt < MAX_RETRIES - 1:
                    time.sleep(0.25 * (attempt + 1))
                    continue
                raise last_error from exc
        raise last_error  # pragma: no cover

    @staticmethod
    def _firma_to_row(firma: dict) -> dict:
        row: dict[str, Any] = {}
        for key in FIRMA_PERSISTED_KEYS:
            if key not in firma:
                continue
            value = firma[key]
            if key == "aktif_mi":
                row[key] = bool(value)
            else:
                row[key] = value
        row.setdefault("eposta", "")
        row.setdefault("telefon", "")
        row.setdefault("yetkili_kisi", "")
        row.setdefault("vergi_no", "")
        row.setdefault("adres", "")
        row.setdefault("aktif_mi", True)
        row.setdefault("varsayilan_yon", "GIDER")
        row.setdefault("notlar", "")
        return row

    def _upsert_rows(self, table: str, rows: list[dict], on_conflict: str) -> None:
        for chunk in self._chunks(rows):
            if chunk:
                self._execute(self._client.table(table).upsert(chunk, on_conflict=on_conflict))

    def get_firmalar(self) -> list[dict]:
        response = self._execute(self._client.table("firmalar").select("*").order("firma_id"))
        return response.data or []

    def save_firmalar(self, firmalar: list[dict]) -> None:
        rows = [self._firma_to_row(firma) for firma in firmalar if firma.get("firma_id") is not None]
        if rows:
            self._upsert_rows("firmalar", rows, "firma_id")

    def upsert_firma(self, firma: dict) -> None:
        self._upsert_rows("firmalar", [self._firma_to_row(firma)], "firma_id")

    def replace_all_firmalar(self, firmalar: list[dict]) -> None:
        rows = [self._firma_to_row(firma) for firma in firmalar if firma.get("firma_id") is not None]
        ids = {row["firma_id"] for row in rows}
        if rows:
            self._upsert_rows("firmalar", rows, "firma_id")
        mevcut = self._execute(self._client.table("firmalar").select("firma_id")).data or []
        silinecek = [item["firma_id"] for item in mevcut if item.get("firma_id") not in ids]
        for chunk in self._chunks([{"firma_id": i} for i in silinecek], 50):
            id_list = [item["firma_id"] for item in chunk]
            if id_list:
                self._execute(self._client.table("firmalar").delete().in_("firma_id", id_list))

    def get_ayarlar(self) -> dict:
        response = self._execute(self._client.table("ayarlar").select("data").eq("id", 1).limit(1))
        rows = response.data or []
        if not rows:
            self.save_ayarlar(dict(DEFAULT_AYARLAR))
            return dict(DEFAULT_AYARLAR)
        data = rows[0].get("data") or {}
        merged = dict(DEFAULT_AYARLAR)
        merged.update(data)
        return merged

    def save_ayarlar(self, ayarlar: dict) -> None:
        self._execute(self._client.table("ayarlar").upsert({"id": 1, "data": ayarlar}, on_conflict="id"))

    def get_kullanicilar(self) -> list[dict]:
        response = self._execute(self._client.table("kullanicilar").select("*").order("id"))
        kullanicilar = []
        for row in response.data or []:
            kullanicilar.append(
                {
                    "kullanici_adi": row["kullanici_adi"],
                    "ad_soyad": row.get("ad_soyad", ""),
                    "unvan": row.get("unvan", ""),
                    "sifre_hash": row["sifre_hash"],
                }
            )
        return kullanicilar

    def save_kullanicilar(self, kullanicilar: list[dict]) -> None:
        mevcut = self._execute(self._client.table("kullanicilar").select("kullanici_adi")).data or []
        mevcut_adlar = {row["kullanici_adi"] for row in mevcut}
        yeni_adlar = {k["kullanici_adi"] for k in kullanicilar}

        for ad in mevcut_adlar - yeni_adlar:
            self._execute(self._client.table("kullanicilar").delete().eq("kullanici_adi", ad))

        for kullanici in kullanicilar:
            self._execute(
                self._client.table("kullanicilar").upsert(
                    {
                        "kullanici_adi": kullanici["kullanici_adi"],
                        "ad_soyad": kullanici.get("ad_soyad", ""),
                        "unvan": kullanici.get("unvan", ""),
                        "sifre_hash": kullanici["sifre_hash"],
                    },
                    on_conflict="kullanici_adi",
                )
            )

    @staticmethod
    def _hareket_to_row(hareket: dict) -> dict:
        return {
            "hareket_id": int(hareket["hareket_id"]),
            "adjust_key": hareket["adjust_key"],
            "partner_adi": hareket.get("partner_adi", ""),
            "firma_id": hareket.get("firma_id"),
            "firma_adi": hareket.get("firma_adi", ""),
            "kampanya": hareket.get("kampanya", ""),
            "app_adi": hareket.get("app_adi", ""),
            "tarih": hareket["tarih"],
            "yon": hareket.get("yon", "GIDER"),
            "tutar": round(float(hareket.get("tutar", 0)), 2),
            "para_birimi": hareket.get("para_birimi", "USD"),
            "metrik": hareket.get("metrik", ""),
            "installs": hareket.get("installs"),
        }

    def adjust_tablo_hazir_mi(self) -> bool:
        if self._adjust_tablo_var is not None:
            return self._adjust_tablo_var
        try:
            self._execute(self._client.table("adjust_hareketler").select("hareket_id").limit(1))
            self._adjust_tablo_var = True
        except Exception as exc:
            if _adjust_tablo_eksik_mi(exc):
                self._adjust_tablo_var = False
                return False
            raise
        return True

    def get_adjust_hareketler(self) -> list[dict]:
        if not self.adjust_tablo_hazir_mi():
            return []
        try:
            response = self._execute(
                self._client.table("adjust_hareketler").select("*").order("tarih", desc=True)
            )
        except Exception as exc:
            if _adjust_tablo_eksik_mi(exc):
                self._adjust_tablo_var = False
                return []
            raise
        hareketler = response.data or []
        for hareket in hareketler:
            hareket.pop("created_at", None)
            hareket.pop("updated_at", None)
            if hareket.get("tutar") is not None:
                hareket["tutar"] = float(hareket["tutar"])
            if hareket.get("tarih"):
                hareket["tarih"] = str(hareket["tarih"])[:10]
        return hareketler

    def upsert_adjust_hareketler(self, hareketler: list[dict]) -> None:
        if not self.adjust_tablo_hazir_mi():
            raise RuntimeError(ADJUST_TABLO_UYARI)
        rows = [self._hareket_to_row(h) for h in hareketler if h.get("hareket_id") is not None]
        if not rows:
            return
        try:
            self._upsert_rows("adjust_hareketler", rows, "adjust_key")
            self._adjust_tablo_var = True
        except Exception as exc:
            if _adjust_tablo_eksik_mi(exc):
                self._adjust_tablo_var = False
                raise RuntimeError(ADJUST_TABLO_UYARI) from exc
            if _rls_hatasi_mi(exc):
                raise RuntimeError(RLS_UYARI) from exc
            raise

    def cleanup_legacy_partners(self, aktif_firma_idleri: set[int]) -> int:
        """Adjust hareketi olmayan eski firmaları siler."""
        mevcut = self._execute(self._client.table("firmalar").select("firma_id")).data or []
        silinecek = [
            item["firma_id"]
            for item in mevcut
            if item.get("firma_id") is not None and item["firma_id"] not in aktif_firma_idleri
        ]
        for chunk in self._chunks([{"firma_id": i} for i in silinecek], 50):
            id_list = [item["firma_id"] for item in chunk]
            if id_list:
                self._execute(self._client.table("firmalar").delete().in_("firma_id", id_list))
        return len(silinecek)
