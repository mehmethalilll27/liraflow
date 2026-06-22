"""Eski fatura döneminden kalan test verilerini temizler."""

from data_access import get_store


def main() -> None:
    store = get_store()

    hareketler = store.get_adjust_hareketler() if hasattr(store, "get_adjust_hareketler") else []
    aktif_firma_idleri = {h["firma_id"] for h in hareketler if h.get("firma_id") is not None}

    if hasattr(store, "cleanup_legacy_partners"):
        silinen = store.cleanup_legacy_partners(aktif_firma_idleri)
        print(f"Supabase: {silinen} eski partner silindi.")
    else:
        firmalar = store.get_firmalar()
        kalan = [f for f in firmalar if f.get("firma_id") in aktif_firma_idleri]
        store.save_firmalar(kalan)
        print(f"JSON: {len(firmalar) - len(kalan)} eski partner silindi.")

    print(f"Aktif partner sayısı (hareketli): {len(aktif_firma_idleri)}")
    print(f"Toplam hareket: {len(hareketler)}")


if __name__ == "__main__":
    main()
