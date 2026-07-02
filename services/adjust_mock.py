"""Sahte Adjust pivot raporu — gerçek API olmadan demo ve test için."""

from __future__ import annotations

import hashlib
from datetime import date, timedelta
from typing import Literal

PartnerTipi = Literal["GIDER", "GELIR"]

# (partner adı, kampanyalar, uygulama, yön)
# GIDER = sadece harcama (UA), GELIR = sadece gelir (monetizasyon)
PARTNERLER: list[tuple[str, list[str], str, PartnerTipi]] = [
    # — Harcama (UA) ağları —
    ("AppLovin", ["US Install", "Retargeting", "Tier-1 Scale"], "Puzzle Quest Pro", "GIDER"),
    ("Unity Ads", ["Rewarded UA", "US Android", "iOS Install"], "Puzzle Quest Pro", "GIDER"),
    ("Google Ads", ["UAC Install", "Brand Search", "Performance Max"], "Racing Legends", "GIDER"),
    ("Meta", ["App Install", "Lookalike 1%", "Creative Test"], "Puzzle Quest Pro", "GIDER"),
    ("TikTok for Business", ["Spark Ads", "App Promotion", "TopView Test"], "Idle Factory", "GIDER"),
    ("Apple Search Ads", ["Brand Keywords", "Competitor Bids"], "Racing Legends", "GIDER"),
    ("Snapchat", ["App Install", "Story Ads"], "Idle Factory", "GIDER"),
    ("Moloco", ["ML Install", "ROAS Campaign"], "Puzzle Quest Pro", "GIDER"),
    ("Mintegral", ["CPI Campaign", "Retargeting"], "Word Master", "GIDER"),
    ("Liftoff", ["Vungle Install", "Video UA"], "Racing Legends", "GIDER"),
    ("Chartboost", ["Direct Install", "Cross-Promo Out"], "Word Master", "GIDER"),
    ("AdColony", ["Instant Play", "Rewarded Install"], "Idle Factory", "GIDER"),
    ("Tapjoy", ["Offerwall UA", "Engagement"], "Idle Factory", "GIDER"),
    ("Persona.ly", ["Retargeting", "Lookalike"], "Puzzle Quest Pro", "GIDER"),
    ("Smadex", ["Programmatic UA", "CTV Test"], "Racing Legends", "GIDER"),
    ("Digital Turbine", ["On-Device UA", "Preload"], "Word Master", "GIDER"),
    ("Remerge", ["Retargeting", "Re-engagement"], "Puzzle Quest Pro", "GIDER"),
    ("Kayzen", ["Programmatic Install"], "Idle Factory", "GIDER"),
    # — Gelir (monetizasyon) ağları —
    ("AdMob", ["Banner Revenue", "Interstitial", "Rewarded"], "Puzzle Quest Pro", "GELIR"),
    ("MAX by AppLovin", ["Mediation Revenue", "Bidding"], "Puzzle Quest Pro", "GELIR"),
    ("ironSource", ["Mediation", "Offerwall Revenue"], "Racing Legends", "GELIR"),
    ("Meta Audience Network", ["Native Ads", "Rewarded Video"], "Idle Factory", "GELIR"),
    ("Unity LevelPlay", ["Mediation Revenue", "Waterfall"], "Word Master", "GELIR"),
    ("InMobi", ["Exchange Revenue", "Native"], "Racing Legends", "GELIR"),
    ("Pangle", ["Video Revenue", "Splash Ads"], "Idle Factory", "GELIR"),
    ("Amazon APS", ["Header Bidding", "Display"], "Puzzle Quest Pro", "GELIR"),
    ("Verve", ["Programmatic Revenue"], "Word Master", "GELIR"),
    ("Smaato", ["Open Exchange", "In-App"], "Racing Legends", "GELIR"),
    ("BidMachine", ["In-App Bidding"], "Idle Factory", "GELIR"),
    ("Fyber", ["Offerwall Revenue", "Rewarded"], "Word Master", "GELIR"),
    ("Ogury", ["Consent Revenue", "Thumbstop"], "Puzzle Quest Pro", "GELIR"),
    ("Mintegral Monetization", ["SDK Revenue", "Video"], "Racing Legends", "GELIR"),
    ("Chartboost Monetization", ["Cross-Promo In", "Interstitial"], "Word Master", "GELIR"),
    ("Vungle Monetization", ["Rewarded Revenue", "MREC"], "Idle Factory", "GELIR"),
]


def _tarih_araligi(date_period: str) -> tuple[date, date]:
    parcalar = date_period.split(":")
    if len(parcalar) != 2:
        bugun = date.today()
        return bugun - timedelta(days=29), bugun
    return date.fromisoformat(parcalar[0]), date.fromisoformat(parcalar[1])


def _deterministik_sayi(anahtar: str, alt: float, ust: float) -> float:
    digest = hashlib.md5(anahtar.encode("utf-8")).hexdigest()
    oran = int(digest[:8], 16) / 0xFFFFFFFF
    return round(alt + (ust - alt) * oran, 2)


def _gun_aktif_mi(anahtar: str, olasilik: float = 0.72) -> bool:
    digest = hashlib.md5((anahtar + "|aktif").encode("utf-8")).hexdigest()
    oran = int(digest[:8], 16) / 0xFFFFFFFF
    return oran < olasilik


def _satir_uret(gun_str: str, partner: str, kampanya: str, app_adi: str, tip: PartnerTipi) -> dict | None:
    anahtar = f"{gun_str}|{partner}|{kampanya}"
    if not _gun_aktif_mi(anahtar):
        return None

    installs = int(_deterministik_sayi(anahtar + "|inst", 25, 3200))

    if tip == "GIDER":
        maliyet = _deterministik_sayi(anahtar + "|cost", 80, 9200)
        gelir = 0.0
    else:
        maliyet = 0.0
        gelir = _deterministik_sayi(anahtar + "|rev", 40, 7500)

    return {
        "day": gun_str,
        "partner_name": partner,
        "campaign": kampanya,
        "app": app_adi,
        "network_cost": maliyet,
        "all_revenue": gelir,
        "installs": installs,
    }


def pivot_report_uret(date_period: str) -> dict:
    baslangic, bitis = _tarih_araligi(date_period)
    if baslangic > bitis:
        baslangic, bitis = bitis, baslangic

    satirlar: list[dict] = []
    gun = baslangic
    while gun <= bitis:
        gun_str = gun.isoformat()
        for partner, kampanyalar, app_adi, tip in PARTNERLER:
            for kampanya in kampanyalar:
                satir = _satir_uret(gun_str, partner, kampanya, app_adi, tip)
                if satir:
                    satirlar.append(satir)
        gun += timedelta(days=1)

    return {
        "rows": satirlar,
        "totals": {
            "network_cost": round(sum(s["network_cost"] for s in satirlar), 2),
            "all_revenue": round(sum(s["all_revenue"] for s in satirlar), 2),
            "installs": sum(s["installs"] for s in satirlar),
        },
        "source": "mock",
        "partner_sayisi": len(PARTNERLER),
        "date_period": f"{baslangic.isoformat()}:{bitis.isoformat()}",
    }


class MockAdjustClient:
    """Gerçek AdjustClient ile aynı arayüz; HTTP yerine sahte veri döner."""

    def __init__(self, api_token: str | None = None, app_tokens: list[str] | None = None) -> None:
        self.api_token = (api_token or "mock").strip()
        self.app_tokens = [t.strip() for t in (app_tokens or []) if t.strip()]

    def pivot_report(
        self,
        date_period: str,
        *,
        dimensions: str = "",
        metrics: str = "",
    ) -> dict:
        return pivot_report_uret(date_period)
