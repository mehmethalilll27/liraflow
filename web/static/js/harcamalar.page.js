const SAYFA_BOYUTU = 10;

let aktifGun = 30;
let aktifYon = "";
let aktifPartner = "";
let tumListe = [];
let aktifSayfa = 1;

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get("yon")) aktifYon = urlParams.get("yon").toUpperCase();
if (urlParams.get("partner")) aktifPartner = urlParams.get("partner");

function filtreButonSinifi(secili) {
  return secili
    ? "px-4 py-2 rounded-full text-sm font-semibold bg-primary text-white"
    : "px-4 py-2 rounded-full text-sm font-semibold border border-outline-variant hover:bg-gray-50";
}

function toplamSayfa() {
  return Math.max(1, Math.ceil(tumListe.length / SAYFA_BOYUTU));
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

function tabloyuCiz() {
  const body = document.getElementById("hareket-body");
  const sayfalama = document.getElementById("sayfalama");
  if (!body) return;

  if (!tumListe.length) {
    body.innerHTML =
      '<tr><td colspan="5" class="px-6 py-8 text-center text-on-surface-variant">Bu dönemde kayıt yok. Adjust\'tan senkronize edin.</td></tr>';
    if (sayfalama) sayfalama.classList.add("hidden");
    return;
  }

  const sonSayfa = toplamSayfa();
  if (aktifSayfa > sonSayfa) aktifSayfa = sonSayfa;
  if (aktifSayfa < 1) aktifSayfa = 1;

  const bas = (aktifSayfa - 1) * SAYFA_BOYUTU;
  const sayfaKayitlari = tumListe.slice(bas, bas + SAYFA_BOYUTU);
  body.innerHTML = sayfaKayitlari.map(satirCiz).join("");

  const ozet = document.getElementById("sayfalama-ozet");
  const etiket = document.getElementById("sayfalama-etiket");
  const onceki = document.getElementById("sayfa-onceki");
  const sonraki = document.getElementById("sayfa-sonraki");

  const basIdx = bas + 1;
  const bitIdx = bas + sayfaKayitlari.length;

  if (sayfalama) sayfalama.classList.remove("hidden");
  if (ozet) ozet.textContent = `${basIdx}-${bitIdx} / ${tumListe.length} kayıt`;
  if (etiket) etiket.textContent = `Sayfa ${aktifSayfa} / ${sonSayfa}`;
  if (onceki) onceki.disabled = aktifSayfa <= 1;
  if (sonraki) sonraki.disabled = aktifSayfa >= sonSayfa;
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
    if (!durum.yapilandirildi && !durum.mock) {
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
  body.innerHTML =
    '<tr><td colspan="5" class="px-6 py-8 text-center text-on-surface-variant">Yükleniyor...</td></tr>';

  tumListe = await HareketService.listele({
    gun: aktifGun,
    yon: aktifYon || null,
    partner: aktifPartner || null,
  });

  aktifSayfa = 1;
  tabloyuCiz();
}

function sayfalamaBagla() {
  const kapsayici = document.getElementById("sayfalama");
  if (!kapsayici || kapsayici.dataset.bagli === "1") return;
  kapsayici.dataset.bagli = "1";

  kapsayici.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-sayfa]");
    if (!btn || btn.disabled) return;

    const yon = btn.getAttribute("data-sayfa");
    if (yon === "onceki" && aktifSayfa > 1) {
      aktifSayfa -= 1;
      tabloyuCiz();
      document.getElementById("hareket-body")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (yon === "sonraki" && aktifSayfa < toplamSayfa()) {
      aktifSayfa += 1;
      tabloyuCiz();
      document.getElementById("hareket-body")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
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

  sayfalamaBagla();
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
