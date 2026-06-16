from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

from services.auth_service import AuthService

auth_service = AuthService()


class LoginPayload(BaseModel):
    kullanici_adi: str
    sifre: str


class SifreGuncellePayload(BaseModel):
    eski_sifre: str
    yeni_sifre: str


def oturum_zorunlu(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Oturum gerekli.")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        return auth_service.token_dogrula(token)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


def auth_router_olustur() -> APIRouter:
    router = APIRouter(prefix="/auth")

    @router.post("/login")
    def giris_yap(payload: LoginPayload) -> dict:
        try:
            return auth_service.giris_yap(payload.kullanici_adi, payload.sifre)
        except ValueError as exc:
            raise HTTPException(status_code=401, detail=str(exc)) from exc

    @router.get("/me")
    def oturum_bilgisi(kullanici: dict = Depends(oturum_zorunlu)) -> dict:
        return kullanici

    @router.post("/sifre")
    def sifre_guncelle(payload: SifreGuncellePayload, kullanici: dict = Depends(oturum_zorunlu)) -> dict:
        try:
            auth_service.sifre_guncelle(kullanici["kullanici_adi"], payload.eski_sifre, payload.yeni_sifre)
            return {"ok": True}
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    return router
