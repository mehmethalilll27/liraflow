const durumMesajiEl = document.getElementById("durum-mesaji");

function formatTRY(tutar) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(tutar || 0);
}

async function ozetiYukle() {
  try {
    const ozet = await API.istek("/ozet");
    document.getElementById("ozet-fatura-adedi").textContent = ozet.fatura_adedi;
    document.getElementById("ozet-odenecek").textContent = formatTRY(ozet.toplam_odenecek);
    document.getElementById("ozet-geciken").textContent = formatTRY(ozet.toplam_geciken);
    document.getElementById("ozet-odenen").textContent = formatTRY(ozet.toplam_odenen);
  } catch (hata) {
    durumMesajiEl.textContent = `Ozet yuklenemedi: ${hata.message}`;
  }
}
