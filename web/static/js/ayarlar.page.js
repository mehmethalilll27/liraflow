async function ayarlariYukle() {
  const ayarlar = await SettingsService.getir();
  document.getElementById("kullanici_adi").value = ayarlar.kullanici_adi || "";
  document.getElementById("kullanici_unvan").value = ayarlar.kullanici_unvan || "";
  document.getElementById("mevcut_kasa_bakiyesi").value = ayarlar.mevcut_kasa_bakiyesi ?? 0;
  const periyot = ayarlar.varsayilan_dashboard_periyodu || 30;
  document.getElementById("varsayilan_dashboard_periyodu").value = String(Utils.periyotSinirla(periyot));
  document.getElementById("adjust_sync_gun").value = ayarlar.adjust_sync_gun || 90;
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await Layout.init();
    await ayarlariYukle();

    document.getElementById("ayarlar-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      await SettingsService.guncelle({
        kullanici_adi: document.getElementById("kullanici_adi").value.trim(),
        kullanici_unvan: document.getElementById("kullanici_unvan").value.trim(),
        mevcut_kasa_bakiyesi: parseFloat(document.getElementById("mevcut_kasa_bakiyesi").value) || 0,
        varsayilan_dashboard_periyodu: Utils.periyotSinirla(
          document.getElementById("varsayilan_dashboard_periyodu").value
        ),
        adjust_sync_gun: parseInt(document.getElementById("adjust_sync_gun").value, 10) || 90,
      });
      alert("Ayarlar kaydedildi.");
    });
  } catch (hata) {
    alert(`Ayarlar yüklenemedi: ${hata.message}`);
  }
});
