from fastapi import APIRouter, Depends, FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from pathlib import Path

import config  # noqa: F401 — .env yüklenir
from services.auth_routes import auth_router_olustur, oturum_zorunlu
from services.cashflow_service import CashflowService
from services.adjust_sync_service import AdjustSyncService

app = FastAPI(title="LiraFlow Backend", version="2.0.0")
api = APIRouter(prefix="/api", dependencies=[Depends(oturum_zorunlu)])
public_api = APIRouter(prefix="/api")
service = CashflowService()
adjust_service = AdjustSyncService()

web_dir = Path(__file__).resolve().parent / "web"
app.mount("/static", StaticFiles(directory=str(web_dir / "static")), name="static")


class FirmaCreatePayload(BaseModel):
    firma_adi: str
    eposta: str = ""
    telefon: str = ""
    yetkili_kisi: str = ""
    vergi_no: str = ""
    adres: str = ""
    notlar: str = ""


class FirmaUpdatePayload(BaseModel):
    firma_adi: str | None = None
    eposta: str | None = None
    telefon: str | None = None
    yetkili_kisi: str | None = None
    vergi_no: str | None = None
    adres: str | None = None
    aktif_mi: bool | None = None
    notlar: str | None = None


class AyarlarPayload(BaseModel):
    kullanici_adi: str | None = None
    kullanici_unvan: str | None = None
    mevcut_kasa_bakiyesi: float | None = None
    varsayilan_dashboard_periyodu: int | None = None
    adjust_sync_gun: int | None = None


def _html_sayfa(dosya_adi: str) -> FileResponse:
    return FileResponse(
        str(web_dir / "templates" / dosya_adi),
        headers={"Cache-Control": "no-cache, no-store, must-revalidate"},
    )


@app.get("/giris")
def giris_sayfasi() -> FileResponse:
    return _html_sayfa("giris.html")


@app.get("/")
def panel_sayfasi() -> FileResponse:
    return _html_sayfa("panel.html")


@app.get("/firmalar")
def firmalar_sayfasi() -> FileResponse:
    return _html_sayfa("firmalar.html")


@app.get("/faturalar")
@app.get("/fatura-detay")
def eski_fatura_yonlendir() -> RedirectResponse:
    return RedirectResponse(url="/harcamalar", status_code=302)


@app.get("/harcamalar")
def harcamalar_sayfasi() -> FileResponse:
    return _html_sayfa("harcamalar.html")


@app.get("/ayarlar")
def ayarlar_sayfasi() -> FileResponse:
    return _html_sayfa("ayarlar.html")


@app.get("/eski-panel")
def eski_panel() -> RedirectResponse:
    return RedirectResponse(url="/", status_code=302)


@public_api.get("/health")
def health() -> dict:
    return {"ok": True}


@api.get("/ayarlar")
def ayarlari_getir() -> dict:
    return service.get_ayarlar()


@api.patch("/ayarlar")
def ayarlari_guncelle(payload: AyarlarPayload) -> dict:
    return service.update_ayarlar(payload.model_dump(exclude_none=True))


@api.get("/bildirimler")
def bildirimleri_getir() -> dict:
    return service.get_bildirimler()


@api.get("/dashboard")
def nakit_dashboard(gun: int = Query(default=30, ge=1, le=365)) -> dict:
    return service.get_nakit_dashboard(gun=gun)


@api.get("/firmalar")
def firmalari_listele() -> list[dict]:
    return service.list_firmalar()


@api.post("/firmalar")
def firma_ekle(payload: FirmaCreatePayload) -> dict:
    try:
        return service.add_firma(
            firma_adi=payload.firma_adi,
            eposta=payload.eposta,
            telefon=payload.telefon,
            yetkili_kisi=payload.yetkili_kisi,
            vergi_no=payload.vergi_no,
            adres=payload.adres,
            notlar=payload.notlar,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@api.patch("/firmalar/{firma_adi}")
def firma_guncelle(firma_adi: str, payload: FirmaUpdatePayload) -> dict:
    try:
        return service.update_firma(firma_adi, payload.model_dump(exclude_none=True))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@api.get("/firmalar/{firma_adi}")
def firma_ozeti_getir(firma_adi: str) -> dict:
    sonuc = service.get_firma_ozet(firma_adi)
    if not sonuc:
        raise HTTPException(status_code=404, detail="Partner bulunamadi.")
    return sonuc


@api.get("/firmalar/{firma_adi}/hareketler")
def firma_hareketleri_getir(
    firma_adi: str,
    gun: int | None = Query(default=None, ge=1, le=365),
) -> list[dict]:
    return service.list_hareketler(gun=gun, partner=firma_adi)


@api.get("/hareketler")
def hareketleri_listele(
    gun: int | None = Query(default=None, ge=1, le=365),
    yon: str | None = Query(default=None),
    partner: str | None = Query(default=None),
) -> list[dict]:
    return service.list_hareketler(gun=gun, yon=yon, partner=partner)


@api.get("/adjust/durum")
def adjust_durum() -> dict:
    return adjust_service.durum()


@api.post("/adjust/sync")
def adjust_senkronize(gun: int | None = Query(default=None, ge=1, le=365)) -> dict:
    try:
        return adjust_service.sync(gun=gun)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


app.include_router(auth_router_olustur(), prefix="/api")
app.include_router(public_api)
app.include_router(api)
