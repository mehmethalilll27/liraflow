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
    ADJUST_API_TOKEN: str = os.getenv("ADJUST_API_TOKEN", "").strip()
    ADJUST_APP_TOKENS: str = os.getenv("ADJUST_APP_TOKENS", "").strip()
    ADJUST_SYNC_GUN: int = int(os.getenv("ADJUST_SYNC_GUN", "90"))
    ADJUST_PARA_BIRIMI: str = os.getenv("ADJUST_PARA_BIRIMI", "USD").strip().upper() or "USD"

    _APP_TOKEN_PLACEHOLDER = (
        "buraya",
        "app_token",
        "your_",
        "ornek",
        "example",
        "token1",
        "token2",
    )

    def adjust_app_tokens_list(self) -> list[str]:
        if not self.ADJUST_APP_TOKENS:
            return []
        sonuc: list[str] = []
        for parca in self.ADJUST_APP_TOKENS.split(","):
            token = parca.strip()
            if not token:
                continue
            alt = token.casefold()
            if any(p in alt for p in self._APP_TOKEN_PLACEHOLDER):
                continue
            sonuc.append(token)
        return sonuc


settings = Settings()
