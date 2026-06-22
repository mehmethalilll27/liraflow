let aktifGun = 30;
let aktifYon = "";
let aktifPartner = "";

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get("yon")) aktifYon = urlParams.get("yon").toUpperCase();
if (urlParams.get("partner")) aktifPartner = urlParams.get("partner");

function filtreButonSinifi(secili) {
  return secili
    ? "px-4 py-2 rounded-full text-sm font-semibold bg-primary text-white"
    : "px-4 py-2 rounded-full text-sm font-semibold border border-outline-variant hover:bg-gray-50";
}

function satirCiz(h) {
  const gelir = h.yon === "GELIR";
  const sinif = gelir ? "text-secondary font-bold" : "text-error font-bold";
  return `
    <tr class="hover:bg-gray-50">
      <td class="px-6 py-4">${Utils.formatTarih(h.tarih)}</td>
      <td class="px-6 py-4 font-semibold">${h.partner_adi || h.firma_adi || "-"}</td>
      <td class="px-6 py-4 text-on-surface-variant">${h.kampanya || "-"}</td>
      <td class="px-6 py-4">${Utils.yonEtiketi(h.yon || "GIDER")}</td>
      <td class="px-6 py-4 text-right font-mono ${sinif}">${Utils.formatTRY(h.tutar, h.para_birimi)}</td>
    </tr>
  `;
}

async function syncDurumGuncelle() {
  const el = document.getElementById("sync-durum");
  if (!el) return;
  try {
    const durum = await AdjustService.durumGetir();
    const parcalar = [`${durum.hareket_sayisi} kayıt`];
    if (durum.son_sync) {
      parcalar.push(`son sync: ${new Date(durum.son_sync).toLocaleString("tr-TR")}`);
    } else {
      parcalar.push("henüz senkronize edilmedi");
    }
    if (!durum.yapilandirildi) {
      parcalar.push("ADJUST_API_TOKEN eksik");
    }
    el.textContent = parcalar.join(" · ");
  } catch (e) {
    el.textContent = "Durum alınamadı";
  }
}

async function hareketleriYukle() {
  const body = document.getElementById("hareket-body");
  if (!body) return;
  body.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-on-surface-variant">Yükleniyor...</td></tr>`;

  const liste = await HareketService.listele({
    gun: aktifGun,
    yon: aktifYon || null,
    partner: aktifPartner || null,
  });

  if (!liste.length) {
    body.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-on-surface-variant">Bu dönemde kayıt yok. Adjust'tan senkronize edin.</td></tr>`;
    return;
  }

  body.innerHTML = liste.map(satirCiz).join("");
}

function filtreleriBagla() {
  const bar = document.getElementById("filtre-bar");
  if (!bar) return;

  bar.querySelectorAll("[data-gun]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      aktifGun = parseInt(btn.getAttribute("data-gun"), 10);
      bar.querySelectorAll("[data-gun]").forEach((b) => {
        b.className = filtreButonSinifi(b === btn);
      });
      await hareketleriYukle();
    });
  });

  bar.querySelectorAll("[data-yon]").forEach((btn) => {
    const deger = btn.getAttribute("data-yon") || "";
    btn.className = filtreButonSinifi(deger === aktifYon);
    btn.addEventListener("click", async () => {
      aktifYon = deger;
      bar.querySelectorAll("[data-yon]").forEach((b) => {
        b.className = filtreButonSinifi((b.getAttribute("data-yon") || "") === aktifYon);
      });
      await hareketleriYukle();
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!AuthService.oturumVarMi()) {
    window.location.href = "/giris";
    return;
  }
  try {
    await AuthService.me();
  } catch {
    window.location.href = "/giris";
    return;
  }

  filtreleriBagla();
  await syncDurumGuncelle();
  await hareketleriYukle();

  const syncBtn = document.getElementById("sync-btn");
  if (syncBtn) {
    syncBtn.addEventListener("click", async () => {
      syncBtn.disabled = true;
      syncBtn.classList.add("opacity-60");
      try {
        const sonuc = await AdjustService.senkronize(aktifGun);
        alert(
          `Senkron tamamlandı.\n${sonuc.hareket_sayisi} hareket\nGider: ${Utils.formatTRY(sonuc.gider_toplam, sonuc.para_birimi)}\nGelir: ${Utils.formatTRY(sonuc.gelir_toplam, sonuc.para_birimi)}`
        );
        await syncDurumGuncelle();
        await hareketleriYukle();
      } catch (e) {
        alert(`Senkron hatası: ${e.message}`);
      } finally {
        syncBtn.disabled = false;
        syncBtn.classList.remove("opacity-60");
      }
    });
  }
});
