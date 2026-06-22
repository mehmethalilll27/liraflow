from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request

from config import settings

BASE_URL = "https://automate.adjust.com/reports-service"
DEFAULT_METRICS = "network_cost,all_revenue,installs"
DEFAULT_DIMENSIONS = "day,partner_name,campaign"


def _app_token_hatasi_mi(metin: str) -> bool:
    alt = metin.casefold()
    return "app_token" in alt and ("invalid" in alt or "no apps matching" in alt or "request_error" in alt)


class AdjustClient:
    def __init__(
        self,
        api_token: str | None = None,
        app_tokens: list[str] | None = None,
    ) -> None:
        self.api_token = (api_token or settings.ADJUST_API_TOKEN).strip()
        if not self.api_token:
            raise ValueError(
                "Adjust API token eksik. .env dosyasına ADJUST_API_TOKEN ekleyin."
            )
        if self.api_token.casefold().startswith("buraya"):
            raise ValueError(
                "ADJUST_API_TOKEN hâlâ örnek değerde. data/.env içine gerçek Adjust API token yazın."
            )

        raw_tokens = app_tokens if app_tokens is not None else settings.adjust_app_tokens_list()
        self.app_tokens = [t.strip() for t in raw_tokens if t.strip()]

    def _istek_gonder(self, params: dict[str, str]) -> dict:
        url = f"{BASE_URL}/pivot_report?{urllib.parse.urlencode(params)}"
        request = urllib.request.Request(
            url,
            headers={"Authorization": f"Bearer {self.api_token}"},
            method="GET",
        )
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            raise ValueError(f"Adjust API hatası ({exc.code}): {body[:500]}") from exc
        except urllib.error.URLError as exc:
            raise ValueError(f"Adjust API bağlantı hatası: {exc.reason}") from exc

    def pivot_report(
        self,
        date_period: str,
        *,
        dimensions: str = DEFAULT_DIMENSIONS,
        metrics: str = DEFAULT_METRICS,
    ) -> dict:
        temel: dict[str, str] = {
            "date_period": date_period,
            "dimensions": dimensions,
            "metrics": metrics,
            "ad_spend_mode": "network",
        }

        if not self.app_tokens:
            return self._istek_gonder(temel)

        filtreli = {**temel, "app_token__in": ",".join(self.app_tokens)}
        try:
            return self._istek_gonder(filtreli)
        except ValueError as exc:
            if _app_token_hatasi_mi(str(exc)):
                return self._istek_gonder(temel)
            raise
