const firmaFormEl = document.getElementById("firma-form");

async function firmaEkle(event) {
  event.preventDefault();
  const payload = {
    firma_adi: document.getElementById("firma_adi").value.trim(),
    eposta: document.getElementById("eposta").value.trim(),
    telefon: document.getElementById("telefon").value.trim(),
    yetkili_kisi: document.getElementById("yetkili_kisi").value.trim(),
    vergi_no: document.getElementById("vergi_no").value.trim(),
    adres: document.getElementById("adres").value.trim(),
  };

  try {
    await API.istek("/firmalar", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    durumMesajiEl.textContent = "Firma basariyla eklendi.";
    firmaFormEl.reset();
    await ozetiYukle();
    await faturalariYukle();
  } catch (hata) {
    durumMesajiEl.textContent = `Firma eklenemedi: ${hata.message}`;
  }
}

firmaFormEl.addEventListener("submit", firmaEkle);

// Sayfa acilisinda verileri cek.
window.addEventListener("DOMContentLoaded", async () => {
  await ozetiYukle();
  await faturalariYukle();
});
