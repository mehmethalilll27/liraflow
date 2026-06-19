-- RLS kaynaklı yazma hatası alıyorsanız bu dosyayı SQL Editor'de bir kez çalıştırın.
-- (service_role key kullanıyorsanız genelde gerekmez)

ALTER TABLE firmalar DISABLE ROW LEVEL SECURITY;
ALTER TABLE faturalar DISABLE ROW LEVEL SECURITY;
ALTER TABLE ayarlar DISABLE ROW LEVEL SECURITY;
ALTER TABLE kullanicilar DISABLE ROW LEVEL SECURITY;
