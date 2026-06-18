from fastapi import APIRouter, Depends, FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from pathlib import Path

from services.auth_routes import auth_router_olustur, oturum_zorunlu
from services.cashflow_service import CashflowService

app = FastAPI(title="Cashflow Backend", version="1.0.0")
api = APIRouter(prefix="/api", dependencies=[Depends(oturum_zorunlu)])
public_api = APIRouter(prefix="/api")
service = CashflowService()

web_dir = Path(__file__).resolve().parent / "web"
app.mount("/static", StaticFiles(directory=str(web_dir / "static")), name="static")


class FirmaCreatePayload(BaseModel):
    firma_adi: str
    eposta: str = ""
    telefon: str = ""
    yetkili_kisi: str = ""
    vergi_no: str = ""
    adres: str = ""
    odeme_periyodu_gun: int | None = None
    odeme_vadesi_gun: int | None = None


class FirmaUpdatePayload(BaseModel):
    firma_adi: str | None = None
    eposta: str | None = None
    telefon: str | None = None
    yetkili_kisi: str | None = None
    vergi_no: str | None = None
    adres: str | None = None
    odeme_periyodu_gun: int | None = None
    odeme_vadesi_gun: int | None = None
    aktif_mi: bool | None = None


class FaturaDurumPayload(BaseModel):
    durum: str
    odeme_tarihi: str | None = None


class FaturaCreatePayload(BaseModel):
    firma_adi: str
    tutar: float
    vade_tarihi: str | None = None
    durum: str = "BEKLIYOR"
    notlar: str = ""
    para_birimi: str = "TRY"
    kategori: str = "genel"
    oncelik: str = "orta"
    odeme_periyodu_gun: int | None = None
    yon: str = "GIDER"


class OdemeKayitPayload(BaseModel):
    tutar: float
    odeme_tarihi: str | None = None
    kanal: str = ""
    notlar: str = ""


class AyarlarPayload(BaseModel):
    kullanici_adi: str | None = None
    kullanici_unvan: str | None = None
    varsayilan_odeme_periyodu: int | None = None
    varsayilan_vade_gunu: int | None = None
    bildirim_gun_siniri: int | None = None
    otomatik_gecikti: bool | None = None
    mevcut_kasa_bakiyesi: float | None = None


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
def faturalar_sayfasi() -> FileResponse:
    return _html_sayfa("faturalar.html")


@app.get("/fatura-detay")
def fatura_detay_sayfasi() -> FileResponse:
    return _html_sayfa("fatura_detay.html")


@app.get("/ayarlar")
def ayarlar_sayfasi() -> FileResponse:
    return _html_sayfa("ayarlar.html")


@app.get("/eski-panel")
def eski_panel() -> RedirectResponse:
    return RedirectResponse(url="/faturalar", status_code=302)


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


@api.get("/ozet")
def genel_ozet() -> dict:
    return service.get_genel_ozet()


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
            odeme_periyodu_gun=payload.odeme_periyodu_gun,
            odeme_vadesi_gun=payload.odeme_vadesi_gun,
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
        raise HTTPException(status_code=404, detail="Firma bulunamadi.")
    return sonuc


@api.get("/firmalar/{firma_adi}/faturalar")
def firma_faturalari_getir(firma_adi: str) -> list[dict]:
    return service.get_firma_faturalar(firma_adi)


@api.get("/faturalar")
def faturalari_listele(
    durum: str | None = Query(default=None),
    firma_adi: str | None = Query(default=None),
    yon: str | None = Query(default=None),
) -> list[dict]:
    return service.list_faturalar(durum=durum, firma_adi=firma_adi, yon=yon)


@api.post("/faturalar")
def fatura_ekle(payload: FaturaCreatePayload) -> dict:
    try:
        return service.add_fatura(
            firma_adi=payload.firma_adi,
            tutar=payload.tutar,
            vade_tarihi=payload.vade_tarihi,
            durum=payload.durum,
            notlar=payload.notlar,
            para_birimi=payload.para_birimi,
            kategori=payload.kategori,
            oncelik=payload.oncelik,
            odeme_periyodu_gun=payload.odeme_periyodu_gun,
            yon=payload.yon,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@api.get("/faturalar/{fatura_no}")
def fatura_detay_getir(fatura_no: str) -> dict:
    sonuc = service.get_fatura_by_no(fatura_no)
    if not sonuc:
        raise HTTPException(status_code=404, detail="Fatura bulunamadi.")
    return sonuc


@api.patch("/faturalar/{fatura_no}/durum")
def fatura_durum_guncelle(fatura_no: str, payload: FaturaDurumPayload) -> dict:
    try:
        return service.update_fatura_durum(
            fatura_no=fatura_no,
            durum=payload.durum,
            odeme_tarihi=payload.odeme_tarihi,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@api.post("/faturalar/{fatura_no}/odeme")
def fatura_odeme_kaydet(fatura_no: str, payload: OdemeKayitPayload) -> dict:
    try:
        return service.odeme_kaydet(
            fatura_no=fatura_no,
            tutar=payload.tutar,
            odeme_tarihi=payload.odeme_tarihi,
            kanal=payload.kanal,
            notlar=payload.notlar,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@api.patch("/faturalar/{fatura_no}/arsiv")
def fatura_arsivle(fatura_no: str) -> dict:
    try:
        return service.fatura_arsivle(fatura_no)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@api.delete("/faturalar/{fatura_no}")
def fatura_sil(fatura_no: str) -> dict:
    try:
        service.fatura_sil(fatura_no)
        return {"ok": True}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


app.include_router(auth_router_olustur(), prefix="/api")
app.include_router(public_api)
app.include_router(api)
