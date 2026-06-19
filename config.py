import os
from pathlib import Path

from dotenv import load_dotenv

root = Path(__file__).resolve().parent
load_dotenv(root / ".env")
load_dotenv(root / "data" / ".env")


class Settings:
    DATA_STORE: str = os.getenv("DATA_STORE", "supabase").strip().lower()
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "").strip()
    SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "").strip()


settings = Settings()
