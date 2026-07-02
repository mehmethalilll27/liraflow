async function ayarlariYukle() {
  const ayarlar = await SettingsService.getir();
  document.getElementById("kullanici_adi").value = ayarlar.kullanici_adi || "";
  document.getElementById("kullanici_unvan").value = ayarlar.kullanici_unvan || "";
  document.getElementById("mevcut_kasa_bakiyesi").value = ayarlar.mevcut_kasa_bakiyesi ?? 0;
  const periyot = ayarlar.varsayilan_dashboard_periyodu || 30;
  document.getElementById("varsayilan_dashboard_periyodu").value = String(Utils.periyotSinirla(periyot));
  document.getElementById("adjust_sync_gun").value = ayarlar.adjust_sync_gun || 90;
}

function mesajGoster(metin, tip = "hata") {
  const el = document.getElementById("ayarlar-mesaj");
  if (!el) return;
  el.textContent = metin;
  el.classList.remove("hidden", "text-red-600", "text-green-700");
  el.classList.add(tip === "basari" ? "text-green-700" : "text-red-600");
}

function ayarPayloadOlustur() {
  const kullaniciAdi = document.getElementById("kullanici_adi").value.trim();
  const kullaniciUnvan = document.getElementById("kullanici_unvan").value.trim();
  const kasaRaw = document.getElementById("mevcut_kasa_bakiyesi").value;
  const periyotRaw = document.getElementById("varsayilan_dashboard_periyodu").value;
  const syncRaw = document.getElementById("adjust_sync_gun").value;

  const kasa = Number(kasaRaw);
  if (!Number.isFinite(kasa)) throw new Error("Mevcut kasa bakiyesi geçerli bir sayı olmalı.");
  if (kasa < 0) throw new Error("Mevcut kasa bakiyesi negatif olamaz.");

  const periyot = Number.parseInt(periyotRaw, 10);
  if (!Number.isInteger(periyot) || periyot < 1 || periyot > 365) {
    throw new Error("Varsayılan dashboard periyodu 1-365 arasında tam sayı olmalı.");
  }

  const syncGun = Number.parseInt(syncRaw, 10);
  if (!Number.isInteger(syncGun) || syncGun < 1 || syncGun > 365) {
    throw new Error("Adjust senkron gün sayısı 1-365 arasında tam sayı olmalı.");
  }

  if (kullaniciAdi.length > 100 || kullaniciUnvan.length > 100) {
    throw new Error("Kullanıcı adı ve ünvan en fazla 100 karakter olabilir.");
  }

  return {
    kullanici_adi: kullaniciAdi,
    kullanici_unvan: kullaniciUnvan,
    mevcut_kasa_bakiyesi: Number(kasa.toFixed(2)),
    varsayilan_dashboard_periyodu: periyot,
    adjust_sync_gun: syncGun,
  };
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await Layout.init();
    await ayarlariYukle();

    document.getElementById("ayarlar-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const payload = ayarPayloadOlustur();
        await SettingsService.guncelle(payload);
        mesajGoster("Ayarlar kaydedildi.", "basari");
      } catch (hata) {
        mesajGoster(hata.message || "Ayarlar kaydedilemedi.");
      }
    });
  } catch (hata) {
    mesajGoster(`Ayarlar yüklenemedi: ${hata.message}`);
  }
});
