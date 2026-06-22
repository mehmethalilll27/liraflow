-- LiraFlow Supabase şeması (Adjust modu)
-- Supabase Dashboard → SQL Editor → bu dosyayı çalıştırın

CREATE TABLE IF NOT EXISTS firmalar (
  firma_id BIGINT PRIMARY KEY,
  firma_adi TEXT NOT NULL,
  eposta TEXT NOT NULL DEFAULT '',
  telefon TEXT NOT NULL DEFAULT '',
  yetkili_kisi TEXT NOT NULL DEFAULT '',
  vergi_no TEXT NOT NULL DEFAULT '',
  adres TEXT NOT NULL DEFAULT '',
  aktif_mi BOOLEAN NOT NULL DEFAULT TRUE,
  varsayilan_yon TEXT NOT NULL DEFAULT 'GIDER',
  notlar TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS firmalar_firma_adi_lower_idx
  ON firmalar (LOWER(TRIM(firma_adi)));

CREATE TABLE IF NOT EXISTS ayarlar (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO ayarlar (id, data)
VALUES (
  1,
  '{
    "kullanici_adi": "Abdurrahman Koçak",
    "kullanici_unvan": "Yönetici",
    "mevcut_kasa_bakiyesi": 0,
    "varsayilan_dashboard_periyodu": 30,
    "adjust_sync_gun": 90,
    "adjust_son_sync": null,
    "veri_kaynagi": "adjust",
    "jwt_oturum_suresi_gun": 1
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS kullanicilar (
  id BIGSERIAL PRIMARY KEY,
  kullanici_adi TEXT NOT NULL UNIQUE,
  ad_soyad TEXT NOT NULL DEFAULT '',
  unvan TEXT NOT NULL DEFAULT '',
  sifre_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS adjust_hareketler (
  hareket_id BIGINT PRIMARY KEY,
  adjust_key TEXT NOT NULL UNIQUE,
  partner_adi TEXT NOT NULL,
  firma_id BIGINT REFERENCES firmalar(firma_id) ON DELETE SET NULL,
  firma_adi TEXT NOT NULL DEFAULT '',
  kampanya TEXT NOT NULL DEFAULT '',
  app_adi TEXT NOT NULL DEFAULT '',
  tarih DATE NOT NULL,
  yon TEXT NOT NULL,
  tutar NUMERIC(14, 2) NOT NULL,
  para_birimi TEXT NOT NULL DEFAULT 'USD',
  metrik TEXT NOT NULL DEFAULT '',
  installs INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS adjust_hareketler_tarih_idx ON adjust_hareketler (tarih);
CREATE INDEX IF NOT EXISTS adjust_hareketler_yon_idx ON adjust_hareketler (yon);
CREATE INDEX IF NOT EXISTS adjust_hareketler_partner_idx ON adjust_hareketler (partner_adi);
CREATE INDEX IF NOT EXISTS adjust_hareketler_firma_id_idx ON adjust_hareketler (firma_id);

ALTER TABLE firmalar DISABLE ROW LEVEL SECURITY;
ALTER TABLE ayarlar DISABLE ROW LEVEL SECURITY;
ALTER TABLE kullanicilar DISABLE ROW LEVEL SECURITY;
ALTER TABLE adjust_hareketler DISABLE ROW LEVEL SECURITY;
