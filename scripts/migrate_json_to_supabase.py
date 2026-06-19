"""Mevcut data/*.json dosyalarını Supabase'e aktarır."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from data_access.json_store import JsonStore
from data_access.supabase_store import SupabaseStore


def _ham_firmalar(json_store: JsonStore) -> list[dict]:
    path = json_store.firma_path
    with path.open("r", encoding="utf-8") as file:
        return json.load(file).get("firmalar", [])


def _ham_faturalar(json_store: JsonStore) -> list[dict]:
    path = json_store.fatura_path
    with path.open("r", encoding="utf-8") as file:
        return json.load(file).get("faturalar", [])


def _eksik_firmalari_tamamla(firmalar: list[dict], faturalar: list[dict]) -> list[dict]:
    by_id = {firma["firma_id"]: firma for firma in firmalar}
    for fatura in faturalar:
        firma_id = fatura.get("firma_id")
        if firma_id is None or firma_id in by_id:
            continue
        by_id[firma_id] = {
            "firma_id": firma_id,
            "firma_adi": fatura.get("firma_adi") or f"Firma {firma_id}",
            "eposta": "",
            "telefon": "",
            "yetkili_kisi": "",
            "vergi_no": "",
            "adres": "",
            "aktif_mi": True,
            "odeme_periyodu_gun": 30,
            "varsayilan_yon": fatura.get("yon", "GIDER"),
            "notlar": "Migrate sırasında otomatik oluşturuldu",
        }
    return list(by_id.values())


def main() -> None:
    json_store = JsonStore()
    supabase = SupabaseStore()

    faturalar = _ham_faturalar(json_store)
    firmalar = _eksik_firmalari_tamamla(_ham_firmalar(json_store), faturalar)
    ayarlar = json_store.get_ayarlar()
    kullanicilar = json_store.get_kullanicilar()

    print(f"Aktarılıyor: {len(firmalar)} firma, {len(faturalar)} fatura...")
    if hasattr(supabase, "replace_all_firmalar"):
        supabase.replace_all_firmalar(firmalar)
        supabase.replace_all_faturalar(faturalar)
    else:
        supabase.save_firmalar(firmalar)
        supabase.save_faturalar(faturalar)
    supabase.save_ayarlar(ayarlar)
    if kullanicilar:
        supabase.save_kullanicilar(kullanicilar)

    print("Aktarım tamamlandı.")


if __name__ == "__main__":
    main()
