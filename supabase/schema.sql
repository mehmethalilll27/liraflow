-- LiraFlow Supabase şeması
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
  odeme_periyodu_gun INTEGER NOT NULL DEFAULT 30,
  varsayilan_yon TEXT NOT NULL DEFAULT 'GIDER',
  notlar TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS firmalar_firma_adi_lower_idx
  ON firmalar (LOWER(TRIM(firma_adi)));

CREATE TABLE IF NOT EXISTS faturalar (
  fatura_id BIGINT PRIMARY KEY,
  firma_id BIGINT NOT NULL REFERENCES firmalar(firma_id) ON DELETE CASCADE,
  firma_adi TEXT NOT NULL DEFAULT '',
  fatura_no TEXT NOT NULL UNIQUE,
  tutar NUMERIC(14, 2) NOT NULL,
  para_birimi TEXT NOT NULL DEFAULT 'TRY',
  vade_tarihi DATE NOT NULL,
  durum TEXT NOT NULL,
  notlar TEXT NOT NULL DEFAULT '',
  olusturma_tarihi DATE,
  guncelleme_tarihi DATE,
  odeme_tarihi DATE,
  arsiv_mi BOOLEAN NOT NULL DEFAULT FALSE,
  kategori TEXT NOT NULL DEFAULT 'genel',
  oncelik TEXT NOT NULL DEFAULT 'orta',
  yon TEXT NOT NULL DEFAULT 'GIDER',
  odenen_tutar NUMERIC(14, 2) NOT NULL DEFAULT 0,
  tahsilat_gecmisi JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS faturalar_firma_id_idx ON faturalar (firma_id);
CREATE INDEX IF NOT EXISTS faturalar_durum_idx ON faturalar (durum);
CREATE INDEX IF NOT EXISTS faturalar_vade_tarihi_idx ON faturalar (vade_tarihi);
CREATE INDEX IF NOT EXISTS faturalar_yon_idx ON faturalar (yon);

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
    "varsayilan_odeme_periyodu": 30,
    "varsayilan_vade_gunu": 30,
    "bildirim_gun_siniri": 10,
    "otomatik_gecikti": true,
    "mevcut_kasa_bakiyesi": 0,
    "varsayilan_dashboard_periyodu": 30,
    "varsayilan_firma_yon": "GIDER",
    "varsayilan_kategori": "genel",
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

-- Backend service_role key RLS'i bypass eder.
-- Publishable/anon key ile bağlanacaksanız fix_rls.sql dosyasını çalıştırın.
ALTER TABLE firmalar DISABLE ROW LEVEL SECURITY;
ALTER TABLE faturalar DISABLE ROW LEVEL SECURITY;
ALTER TABLE ayarlar DISABLE ROW LEVEL SECURITY;
ALTER TABLE kullanicilar DISABLE ROW LEVEL SECURITY;
