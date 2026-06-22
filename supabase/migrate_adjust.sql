-- Mevcut Supabase projesine Adjust hareketleri tablosunu ekler.
-- Supabase Dashboard → SQL Editor → bu dosyayı çalıştırın.

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

ALTER TABLE adjust_hareketler DISABLE ROW LEVEL SECURITY;
