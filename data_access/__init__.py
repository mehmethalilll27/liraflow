from data_access.json_store import JsonStore
from data_access.store_base import DataStore
from data_access.supabase_store import SupabaseStore
from config import settings

_store_instance: DataStore | None = None


def get_store() -> DataStore:
    global _store_instance
    if _store_instance is not None:
        return _store_instance

    if settings.DATA_STORE == "json":
        _store_instance = JsonStore()
    elif settings.DATA_STORE == "supabase":
        _store_instance = SupabaseStore()
    else:
        raise RuntimeError(f"Geçersiz DATA_STORE değeri: {settings.DATA_STORE!r}. 'json' veya 'supabase' kullanın.")

    return _store_instance


def reset_store() -> None:
    """Testler için store önbelleğini temizler."""
    global _store_instance
    _store_instance = None
