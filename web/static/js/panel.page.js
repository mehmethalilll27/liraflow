let aktifDonemGun = 30;

const PANEL_UYARI_KAPALI = "panel_uyari_kapali";
const PANEL_UYARI_ACIK = "panel_uyari_acik";

function panelUyariAcikAyarla(acik) {
  const icerik = document.getElementById("panel-uyari-icerik");
  const chevron = document.getElementById("panel-uyari-chevron");
  if (!icerik || !chevron) return;
  if (acik) {
    icerik.classList.remove("hidden");
    chevron.textContent = "expand_less";
    sessionStorage.setItem(PANEL_UYARI_ACIK, "1");
  } else {
    icerik.classList.add("hidden");
    chevron.textContent = "expand_more";
    sessionStorage.setItem(PANEL_UYARI_ACIK, "0");
  }
}

function panelUyariSatirCiz(f, gecikmis) {
  const metin = Utils.kalanGunMetin(f.kalan_gun, f.durum);
  const sinif = gecikmis
    ? "border-error/30 bg-error-container text-error"
    : "border-error/20 bg-error-container/50 text-on-error-container";
  const ikon = gecikmis ? "warning" : "schedule";
  return `
    <a href="${Utils.faturaDetayUrl(f.fatura_no)}" class="flex items-center gap-sm px-md py-sm rounded-lg border ${sinif} text-sm font-semibold hover:brightness-95 transition-all">
      <span class="material-symbols-outlined text-md">${ikon}</span>
      <span><b>${f.fatura_no}</b> — ${f.firma_adi} — ${metin}</span>
    </a>
  `;
}

async function panelBildirimleriYukle() {
  const kutu = document.getElementById("panel-uyari-kutusu");
  if (!kutu) return;

  if (sessionStorage.getItem(PANEL_UYARI_KAPALI) === "1") {
    kutu.classList.add("hidden");
    return;
  }

  const data = await BildirimService.listele();
  if (!data.toplam) {
    kutu.classList.add("hidden");
    return;
  }

  document.getElementById("panel-uyari-sayi").textContent = String(data.toplam);
  const satirlar = [];
  data.geciken.forEach((f) => satirlar.push(panelUyariSatirCiz(f, true)));
  data.yaklasan.forEach((f) => satirlar.push(panelUyariSatirCiz(f, false)));

  document.getElementById("panel-uyari-icerik").innerHTML = satirlar.join("");
  kutu.classList.remove("hidden");

  const acik = sessionStorage.getItem(PANEL_UYARI_ACIK) !== "0";
  panelUyariAcikAyarla(acik);
}

function panelUyariBagla() {
  const toggle = document.getElementById("panel-uyari-toggle");
  const kapat = document.getElementById("panel-uyari-kapat");
  if (toggle) {
    toggle.addEventListener("click", () => {
      const icerik = document.getElementById("panel-uyari-icerik");
      const acik = icerik && icerik.classList.contains("hidden");
      panelUyariAcikAyarla(acik);
    });
  }
  if (kapat) {
    kapat.addEventListener("click", () => {
      sessionStorage.setItem(PANEL_UYARI_KAPALI, "1");
      document.getElementById("panel-uyari-kutusu").classList.add("hidden");
    });
  }
}

function donemButonSinifi(secili) {
  return secili
    ? "px-lg py-sm rounded-full font-label-md text-label-md bg-primary text-on-primary"
    : "px-lg py-sm rounded-full font-label-md text-label-md bg-surface-container border border-outline-variant text-on-surface-variant hover:bg-surface-container-high transition-all";
}

function tabloSatirCiz(f) {
  const gecikmeSinif = f.durum === "GECIKTI" ? "text-error" : "text-on-surface-variant";
  return `
    <tr class="hover:bg-surface-container-low transition-colors cursor-pointer" data-fatura-no="${f.fatura_no}">
      <td class="px-lg py-md font-body-md text-body-md font-semibold text-on-surface">${f.firma_adi}</td>
      <td class="px-lg py-md font-mono-data text-mono-data text-right font-bold">${Utils.formatTRY(f.tutar, f.para_birimi)}</td>
      <td class="px-lg py-md font-body-md text-body-md ${gecikmeSinif}">${Utils.formatTarih(f.vade_tarihi)} · ${Utils.kalanGunMetin(f.kalan_gun, f.durum)}</td>
    </tr>
  `;
}

function bosTabloMesaji(metin) {
  return `<tr><td colspan="3" class="px-lg py-lg text-center text-on-surface-variant text-sm">${metin}</td></tr>`;
}

function hareketSatirCiz(h) {
  const gelir = h.yon === "GELIR";
  const sinif = gelir ? "text-secondary" : "text-error";
  const ikon = gelir ? "south_west" : "north_east";
  const etiket = gelir ? "Tahsilat" : "Ödeme";
  return `
    <a href="${Utils.faturaDetayUrl(h.fatura_no)}" class="flex items-center justify-between px-lg py-md hover:bg-surface-container-low transition-colors">
      <div class="flex items-center gap-md min-w-0">
        <span class="material-symbols-outlined ${sinif}">${ikon}</span>
        <div class="min-w-0">
          <p class="font-body-md text-body-md font-semibold text-on-surface truncate">${h.firma_adi}</p>
          <p class="text-xs text-on-surface-variant">${etiket} · ${h.fatura_no} · ${Utils.kalanGunMetin(h.kalan_gun, h.durum)}</p>
        </div>
      </div>
      <div class="text-right shrink-0 ml-md">
        <p class="font-mono-data font-bold ${sinif}">${Utils.formatTRY(h.tutar, h.para_birimi)}</p>
        <p class="text-xs text-on-surface-variant">${Utils.formatTarih(h.vade_tarihi)}</p>
      </div>
    </a>
  `;
}

function el(id) {
  return document.getElementById(id);
}

function metinAyarla(id, deger) {
  const node = el(id);
  if (node) node.textContent = deger;
}

function dashboardRender(d) {
  if (!d || !d.gelen || !d.giden) {
    throw new Error("Dashboard verisi eksik veya hatalı.");
  }

  const { gelen, giden } = d;
  const donem = d.donem_gun || 30;
  const gelenDonem = gelen.donem_toplam ?? gelen.bekleyen_toplam;
  const gidenDonem = giden.donem_toplam ?? giden.bekleyen_toplam;

  metinAyarla("dash-gelen-toplam", Utils.formatTRY(gelenDonem));
  const gelenAltParca = [`${donem} gün içinde`, `${gelen.donem_adedi ?? gelen.bekleyen_adedi} fatura`];
  if ((gelen.donem_geciken_adedi ?? gelen.geciken_adedi) > 0) {
    gelenAltParca.push(`${gelen.donem_geciken_adedi ?? gelen.geciken_adedi} gecikmiş`);
  }
  if (gelen.donem_ici_adedi > 0) {
    gelenAltParca.push(`${Utils.formatTRY(gelen.donem_ici)} vadeli`);
  }
  metinAyarla("dash-gelen-alt", gelenAltParca.join(" · "));

  metinAyarla("dash-giden-toplam", Utils.formatTRY(gidenDonem));
  const gidenAltParca = [`${donem} gün içinde`, `${giden.donem_adedi ?? giden.bekleyen_adedi} fatura`];
  if ((giden.donem_geciken_adedi ?? giden.geciken_adedi) > 0) {
    gidenAltParca.push(`${Utils.formatTRY(giden.donem_geciken)} gecikmiş`);
  }
  if (giden.donem_ici_adedi > 0) {
    gidenAltParca.push(`${Utils.formatTRY(giden.donem_ici)} vadeli`);
  }
  metinAyarla("dash-giden-alt", gidenAltParca.join(" · "));

  const bulKart = el("dash-bul-kart");
  const bulToplam = el("dash-bul-toplam");
  const bulAlt = el("dash-bul-alt");

  if (bulToplam && bulAlt) {
    if (d.bulunmasi_gereken > 0) {
      bulToplam.textContent = Utils.formatTRY(d.bulunmasi_gereken);
      bulAlt.textContent = `${donem} gün içinde kapatmanız gereken nakit açığı`;
      if (bulKart) {
        bulKart.classList.remove("bg-secondary-container");
        bulKart.classList.add("bg-primary");
      }
    } else {
      const fazla = Math.abs(d.net_durum);
      bulToplam.textContent = fazla > 0 ? Utils.formatTRY(fazla) : Utils.formatTRY(0);
      bulAlt.textContent =
        d.net_durum >= 0 ? "Yeterli nakit var — ek para bulmanıza gerek yok" : "Nakit dengeniz yeterli";
      if (bulKart) bulKart.classList.remove("bg-error-container");
    }
  }

  metinAyarla("dash-kasa", Utils.formatTRY(d.mevcut_kasa));

  const netEl = el("dash-net-durum");
  if (netEl) {
    if (d.net_durum >= 0) {
      netEl.textContent = `+${Utils.formatTRY(d.net_durum)} fazla`;
      netEl.className = "text-xs font-semibold text-secondary";
    } else {
      netEl.textContent = `${Utils.formatTRY(Math.abs(d.net_durum))} açık`;
      netEl.className = "text-xs font-semibold text-error";
    }
  }

  const toplamBar = gelenDonem + gidenDonem;
  const gelenYuzde = toplamBar > 0 ? (gelenDonem / toplamBar) * 100 : 50;
  const gidenYuzde = toplamBar > 0 ? (gidenDonem / toplamBar) * 100 : 50;
  const barGelen = el("dash-bar-gelen");
  const barGiden = el("dash-bar-giden");
  if (barGelen) barGelen.style.width = `${gelenYuzde}%`;
  if (barGiden) barGiden.style.width = `${gidenYuzde}%`;
  metinAyarla("dash-bar-gelen-etiket", `Gelen ${Utils.formatTRY(gelenDonem)}`);
  metinAyarla("dash-bar-giden-etiket", `Giden ${Utils.formatTRY(gidenDonem)}`);

  const hareketler = d.yaklasan_hareketler || [];
  metinAyarla("dash-hareket-sayi", `${hareketler.length} hareket · ${d.donem_gun} gün`);
  const hareketListe = el("dash-hareket-liste");
  if (hareketListe) {
    hareketListe.innerHTML = hareketler.length
      ? hareketler.map(hareketSatirCiz).join("")
      : `<p class="px-lg py-lg text-center text-on-surface-variant text-sm">Bu dönemde yaklaşan hareket yok.</p>`;
  }

  const odemeBody = el("dash-odeme-body");
  if (odemeBody) {
    odemeBody.innerHTML = d.yaklasan_odemeler.length
      ? d.yaklasan_odemeler.map(tabloSatirCiz).join("")
      : bosTabloMesaji("Yaklaşan ödeme yok");
  }

  const tahsilatBody = el("dash-tahsilat-body");
  if (tahsilatBody) {
    tahsilatBody.innerHTML = d.yaklasan_tahsilatlar.length
      ? d.yaklasan_tahsilatlar.map(tabloSatirCiz).join("")
      : bosTabloMesaji("Yaklaşan tahsilat yok");
  }
}

function tabloTiklamaBagla() {
  ["dash-odeme-body", "dash-tahsilat-body"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("click", (e) => {
      const satir = e.target.closest("[data-fatura-no]");
      if (satir) {
        window.location.href = Utils.faturaDetayUrl(satir.getAttribute("data-fatura-no"));
      }
    });
  });
}

async function dashboardYukle() {
  const bar = document.getElementById("donem-filtre-bar");
  if (bar) bar.classList.add("opacity-60", "pointer-events-none");
  try {
    const data = await DashboardService.dashboardGetir(aktifDonemGun);
    dashboardRender(data);
  } finally {
    if (bar) bar.classList.remove("opacity-60", "pointer-events-none");
  }
}

function donemFiltreBagla() {
  const bar = document.getElementById("donem-filtre-bar");
  if (!bar) return;
  bar.querySelectorAll("[data-gun]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      aktifDonemGun = parseInt(btn.getAttribute("data-gun"), 10);
      bar.querySelectorAll("[data-gun]").forEach((b) => {
        b.className = donemButonSinifi(b === btn);
      });
      await dashboardYukle();
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await Layout.init();
    panelUyariBagla();
    donemFiltreBagla();
    tabloTiklamaBagla();
    await dashboardYukle();
    await panelBildirimleriYukle();

    const yeniBtn = document.getElementById("yeni-fatura-btn");
    if (yeniBtn) {
      yeniBtn.addEventListener("click", () => {
        window.location.href = "/faturalar?yeni=1";
      });
    }

  } catch (hata) {
    console.error(hata);
    alert(`Veri yüklenemedi: ${hata.message}`);
  }
});
