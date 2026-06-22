-- Eski fatura döneminden kalan verileri temizler (bir kez çalıştırın)

-- Faturalar tablosu varsa kaldır
DROP TABLE IF EXISTS faturalar;

-- Adjust hareketi olmayan partnerleri sil
DELETE FROM firmalar
WHERE firma_id NOT IN (
  SELECT DISTINCT firma_id FROM adjust_hareketler WHERE firma_id IS NOT NULL
);
