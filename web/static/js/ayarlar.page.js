async function ayarlariYukle() {
  const ayarlar = await SettingsService.getir();
  document.getElementById("kullanici_adi").value = ayarlar.kullanici_adi || "";
  document.getElementById("kullanici_unvan").value = ayarlar.kullanici_unvan || "";
  document.getElementById("mevcut_kasa_bakiyesi").value = ayarlar.mevcut_kasa_bakiyesi ?? 0;
  const periyot = ayarlar.varsayilan_odeme_periyodu || ayarlar.varsayilan_vade_gunu || 30;
  document.getElementById("varsayilan_odeme_periyodu").value = String(Utils.periyotSinirla(periyot));
  document.getElementById("bildirim_gun_siniri").value = ayarlar.bildirim_gun_siniri || 10;
  document.getElementById("otomatik_gecikti").checked = ayarlar.otomatik_gecikti !== false;
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
        varsayilan_odeme_periyodu: Utils.periyotSinirla(document.getElementById("varsayilan_odeme_periyodu").value),
        mevcut_kasa_bakiyesi: parseFloat(document.getElementById("mevcut_kasa_bakiyesi").value) || 0,
        bildirim_gun_siniri: parseInt(document.getElementById("bildirim_gun_siniri").value, 10),
        otomatik_gecikti: document.getElementById("otomatik_gecikti").checked,
      });
      alert("Ayarlar kaydedildi.");
    });
  } catch (hata) {
    alert(`Ayarlar yüklenemedi: ${hata.message}`);
  }
});
