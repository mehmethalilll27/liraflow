from __future__ import annotations

import time
from typing import Any

from supabase import Client, create_client

from config import settings
from data_access.field_maps import (
    DEFAULT_AYARLAR,
    FATURA_COMPUTED_KEYS,
    FIRMA_PERSISTED_KEYS,
)

CHUNK_SIZE = 50
DB_METADATA_KEYS = frozenset({"created_at", "updated_at", "id"})
MAX_RETRIES = 3


class SupabaseStore:
    def __init__(self, client: Client | None = None) -> None:
        if client is not None:
            self._client = client
            return
        if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
            raise RuntimeError(
                "Supabase yapılandırması eksik. .env dosyasında SUPABASE_URL ve "
                "SUPABASE_SERVICE_KEY tanımlayın. SQL şeması: supabase/schema.sql"
            )
        self._client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

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
            elif key == "odeme_periyodu_gun":
                row[key] = int(value or 30)
            else:
                row[key] = value
        row.setdefault("eposta", "")
        row.setdefault("telefon", "")
        row.setdefault("yetkili_kisi", "")
        row.setdefault("vergi_no", "")
        row.setdefault("adres", "")
        row.setdefault("aktif_mi", True)
        row.setdefault("odeme_periyodu_gun", 30)
        row.setdefault("varsayilan_yon", "GIDER")
        row.setdefault("notlar", "")
        return row

    @staticmethod
    def _fatura_to_row(fatura: dict) -> dict:
        row = {
            k: v
            for k, v in fatura.items()
            if k not in FATURA_COMPUTED_KEYS and k not in DB_METADATA_KEYS
        }
        row["tutar"] = round(float(row.get("tutar", 0)), 2)
        row["odenen_tutar"] = round(float(row.get("odenen_tutar", 0) or 0), 2)
        row["arsiv_mi"] = bool(row.get("arsiv_mi", False))
        row["tahsilat_gecmisi"] = row.get("tahsilat_gecmisi") or []
        row.setdefault("para_birimi", "TRY")
        row.setdefault("notlar", "")
        row.setdefault("kategori", "genel")
        row.setdefault("oncelik", "orta")
        row.setdefault("yon", "GIDER")
        row.setdefault("firma_adi", "")
        return row

    def _upsert_rows(self, table: str, rows: list[dict], on_conflict: str) -> None:
        for chunk in self._chunks(rows):
            if chunk:
                self._execute(self._client.table(table).upsert(chunk, on_conflict=on_conflict))

    def get_firmalar(self) -> list[dict]:
        response = self._execute(self._client.table("firmalar").select("*").order("firma_id"))
        return response.data or []

    def get_faturalar(self) -> list[dict]:
        response = self._execute(self._client.table("faturalar").select("*").order("fatura_id"))
        faturalar = response.data or []
        for fatura in faturalar:
            fatura.pop("created_at", None)
            fatura.pop("updated_at", None)
            fatura.setdefault("odenen_tutar", 0)
            fatura.setdefault("tahsilat_gecmisi", [])
            fatura.setdefault("arsiv_mi", False)
            if fatura.get("tutar") is not None:
                fatura["tutar"] = float(fatura["tutar"])
            if fatura.get("odenen_tutar") is not None:
                fatura["odenen_tutar"] = float(fatura["odenen_tutar"])
        return faturalar

    def save_firmalar(self, firmalar: list[dict]) -> None:
        rows = [self._firma_to_row(firma) for firma in firmalar if firma.get("firma_id") is not None]
        if rows:
            self._upsert_rows("firmalar", rows, "firma_id")

    def save_faturalar(self, faturalar: list[dict]) -> None:
        rows = [self._fatura_to_row(fatura) for fatura in faturalar if fatura.get("fatura_id") is not None]
        if rows:
            self._upsert_rows("faturalar", rows, "fatura_id")

    def upsert_firma(self, firma: dict) -> None:
        self._upsert_rows("firmalar", [self._firma_to_row(firma)], "firma_id")

    def upsert_fatura(self, fatura: dict) -> None:
        self._upsert_rows("faturalar", [self._fatura_to_row(fatura)], "fatura_id")

    def delete_fatura_by_no(self, fatura_no: str) -> None:
        self._execute(self._client.table("faturalar").delete().eq("fatura_no", fatura_no))

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

    def replace_all_faturalar(self, faturalar: list[dict]) -> None:
        rows = [self._fatura_to_row(fatura) for fatura in faturalar if fatura.get("fatura_id") is not None]
        ids = {row["fatura_id"] for row in rows}
        if rows:
            self._upsert_rows("faturalar", rows, "fatura_id")
        mevcut = self._execute(self._client.table("faturalar").select("fatura_id")).data or []
        silinecek = [item["fatura_id"] for item in mevcut if item.get("fatura_id") not in ids]
        for chunk in self._chunks([{"fatura_id": i} for i in silinecek], 50):
            id_list = [item["fatura_id"] for item in chunk]
            if id_list:
                self._execute(self._client.table("faturalar").delete().in_("fatura_id", id_list))

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
