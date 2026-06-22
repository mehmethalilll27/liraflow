from __future__ import annotations

import hashlib
import re
from datetime import date, datetime, timedelta, timezone

from config import settings
from data_access import get_store
from models.firma import Firma
from services.adjust_client import AdjustClient


def _slugify(metin: str) -> str:
    temiz = re.sub(r"[^a-zA-Z0-9]+", "-", (metin or "bilinmeyen").strip()).strip("-").lower()
    return temiz or "bilinmeyen"


def _sayiya_cevir(deger) -> float:
    if deger is None or deger == "":
        return 0.0
    try:
        return round(float(deger), 2)
    except (TypeError, ValueError):
        return 0.0


def _sayi_tamsayi(deger) -> int | None:
    if deger is None or deger == "":
        return None
    try:
        return int(float(deger))
    except (TypeError, ValueError):
        return None


class AdjustSyncService:
    def __init__(self, store=None, client: AdjustClient | None = None) -> None:
        self.store = store or get_store()
        self.client = client

    def _client_al(self) -> AdjustClient:
        return self.client or AdjustClient()

    @staticmethod
    def _hareket_id_uret(adjust_key: str) -> int:
        digest = hashlib.sha256(adjust_key.encode("utf-8")).hexdigest()
        return int(digest[:12], 16)

    def _firma_ensure(self, firmalar: list[dict], partner_adi: str, yon: str) -> tuple[list[dict], dict]:
        hedef = partner_adi.strip()
        if not hedef:
            hedef = "Bilinmeyen Partner"

        for firma in firmalar:
            if firma["firma_adi"].strip().casefold() == hedef.casefold():
                return firmalar, firma

        yeni_id = max((x["firma_id"] for x in firmalar), default=0) + 1
        firma = Firma(
            firma_id=yeni_id,
            firma_adi=hedef,
            eposta="",
            telefon="",
            varsayilan_yon=yon if yon in {"GIDER", "GELIR"} else "GIDER",
            notlar="Adjust partner — otomatik oluşturuldu",
        )
        firma_dict = firma.to_dict()
        firmalar.append(firma_dict)
        if hasattr(self.store, "upsert_firma"):
            self.store.upsert_firma(firma_dict)
        else:
            self.store.save_firmalar(firmalar)
        return firmalar, firma_dict

    def _satirdan_hareketler(
        self,
        satir: dict,
        firmalar: list[dict],
        para_birimi: str,
    ) -> tuple[list[dict], list[dict]]:
        gun = (satir.get("day") or satir.get("date") or "").strip()
        if not gun:
            return firmalar, []

        partner = (satir.get("partner_name") or satir.get("partner") or "Bilinmeyen").strip()
        kampanya = (satir.get("campaign") or satir.get("campaign_network") or "").strip()
        app_adi = (satir.get("app") or "").strip()
        installs = _sayi_tamsayi(satir.get("installs"))

        hareketler: list[dict] = []
        maliyet = _sayiya_cevir(satir.get("network_cost") or satir.get("cost"))
        gelir = _sayiya_cevir(satir.get("all_revenue") or satir.get("revenue"))

        if maliyet > 0:
            firmalar, firma = self._firma_ensure(firmalar, partner, "GIDER")
            adjust_key = f"{gun}|{_slugify(partner)}|{_slugify(kampanya)}|GIDER"
            hareketler.append(
                {
                    "hareket_id": self._hareket_id_uret(adjust_key),
                    "adjust_key": adjust_key,
                    "partner_adi": partner,
                    "firma_id": firma["firma_id"],
                    "firma_adi": firma["firma_adi"],
                    "kampanya": kampanya,
                    "app_adi": app_adi,
                    "tarih": gun,
                    "yon": "GIDER",
                    "tutar": maliyet,
                    "para_birimi": para_birimi,
                    "metrik": "network_cost",
                    "installs": installs,
                }
            )

        if gelir > 0:
            firmalar, firma = self._firma_ensure(firmalar, partner, "GELIR")
            adjust_key = f"{gun}|{_slugify(partner)}|{_slugify(kampanya)}|GELIR"
            hareketler.append(
                {
                    "hareket_id": self._hareket_id_uret(adjust_key),
                    "adjust_key": adjust_key,
                    "partner_adi": partner,
                    "firma_id": firma["firma_id"],
                    "firma_adi": firma["firma_adi"],
                    "kampanya": kampanya,
                    "app_adi": app_adi,
                    "tarih": gun,
                    "yon": "GELIR",
                    "tutar": gelir,
                    "para_birimi": para_birimi,
                    "metrik": "all_revenue",
                    "installs": installs,
                }
            )

        return firmalar, hareketler

    def sync(self, gun: int | None = None) -> dict:
        gun = max(1, min(365, int(gun or settings.ADJUST_SYNC_GUN)))
        bitis = date.today()
        baslangic = bitis - timedelta(days=gun - 1)
        date_period = f"{baslangic.isoformat()}:{bitis.isoformat()}"

        rapor = self._client_al().pivot_report(date_period)
        satirlar = rapor.get("rows") or []

        firmalar = self.store.get_firmalar()
        para_birimi = settings.ADJUST_PARA_BIRIMI
        tum_hareketler: list[dict] = []

        for satir in satirlar:
            firmalar, hareketler = self._satirdan_hareketler(satir, firmalar, para_birimi)
            tum_hareketler.extend(hareketler)

        if hasattr(self.store, "upsert_adjust_hareketler"):
            self.store.upsert_adjust_hareketler(tum_hareketler)
        else:
            raise RuntimeError("Veri deposu Adjust hareketlerini desteklemiyor.")

        ayarlar = self.store.get_ayarlar()
        ayarlar["adjust_son_sync"] = datetime.now(timezone.utc).isoformat()
        ayarlar["adjust_sync_gun"] = gun
        self.store.save_ayarlar(ayarlar)

        gider_toplam = round(sum(x["tutar"] for x in tum_hareketler if x["yon"] == "GIDER"), 2)
        gelir_toplam = round(sum(x["tutar"] for x in tum_hareketler if x["yon"] == "GELIR"), 2)

        return {
            "ok": True,
            "donem": date_period,
            "satir_sayisi": len(satirlar),
            "hareket_sayisi": len(tum_hareketler),
            "gider_toplam": gider_toplam,
            "gelir_toplam": gelir_toplam,
            "para_birimi": para_birimi,
            "son_sync": ayarlar["adjust_son_sync"],
        }

    def durum(self) -> dict:
        ayarlar = self.store.get_ayarlar()
        tablo_hazir = True
        if hasattr(self.store, "adjust_tablo_hazir_mi"):
            tablo_hazir = self.store.adjust_tablo_hazir_mi()
        hareketler = self.store.get_adjust_hareketler() if hasattr(self.store, "get_adjust_hareketler") else []
        return {
            "yapilandirildi": bool(settings.ADJUST_API_TOKEN),
            "app_token_sayisi": len(settings.adjust_app_tokens_list()),
            "son_sync": ayarlar.get("adjust_son_sync"),
            "sync_gun": int(ayarlar.get("adjust_sync_gun", settings.ADJUST_SYNC_GUN)),
            "para_birimi": settings.ADJUST_PARA_BIRIMI,
            "hareket_sayisi": len(hareketler),
            "tablo_hazir": tablo_hazir,
            "tablo_uyari": None if tablo_hazir else (
                "Supabase'de adjust_hareketler tablosu yok. "
                "SQL Editor'de supabase/migrate_adjust.sql dosyasını çalıştırın."
            ),
        }
