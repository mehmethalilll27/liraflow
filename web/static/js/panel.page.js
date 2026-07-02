let aktifDonemGun = 30;
let sonDashboardVerisi = null;
let aramaZamanlayici = null;
let aramaIstekNo = 0;

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

async function panelBildirimleriYukle() {
  const kutu = document.getElementById("panel-uyari-kutusu");
  if (kutu) kutu.classList.add("hidden");
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
  const adet = f.hareket_adedi ? ` · ${f.hareket_adedi} hareket` : "";
  return `
    <tr class="hover:bg-surface-container-low transition-colors">
      <td class="px-lg py-md font-body-md text-body-md font-semibold text-on-surface">${f.firma_adi}</td>
      <td class="px-lg py-md font-mono-data text-mono-data text-right font-bold">${Utils.formatTRY(f.tutar, f.para_birimi)}</td>
      <td class="px-lg py-md font-body-md text-body-md text-on-surface-variant">${Utils.formatTarih(f.tarih)}${adet}</td>
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
  const etiket = gelir ? "Gelir" : "Harcama";
  const kampanya = h.kampanya ? ` · ${h.kampanya}` : "";
  return `
    <div class="flex items-center justify-between px-lg py-md hover:bg-surface-container-low transition-colors">
      <div class="flex items-center gap-md min-w-0">
        <span class="material-symbols-outlined ${sinif}">${ikon}</span>
        <div class="min-w-0">
          <p class="font-body-md text-body-md font-semibold text-on-surface truncate">${h.firma_adi}</p>
          <p class="text-xs text-on-surface-variant">${etiket}${kampanya} · ${Utils.formatTarih(h.tarih)}</p>
        </div>
      </div>
      <div class="text-right shrink-0 ml-md">
        <p class="font-mono-data font-bold ${sinif}">${Utils.formatTRY(h.tutar, h.para_birimi)}</p>
      </div>
    </div>
  `;
}

function el(id) {
  return document.getElementById(id);
}

function metinAyarla(id, deger) {
  const node = el(id);
  if (node) node.textContent = deger;
}

function partnerOzetUret(hareketler, yon, paraBirimi = "USD", limit = 8) {
  const map = new Map();
  hareketler.forEach((h) => {
    if ((h.yon || "GIDER") !== yon) return;
    const ad = (h.partner_adi || h.firma_adi || "Bilinmeyen").trim();
    const mevcut = map.get(ad) || {
      firma_adi: ad,
      tutar: 0,
      hareket_adedi: 0,
      para_birimi: h.para_birimi || paraBirimi,
      tarih: "",
    };
    mevcut.tutar += Number(h.tutar || 0);
    mevcut.hareket_adedi += 1;
    const tarih = String(h.tarih || "").slice(0, 10);
    if (tarih > mevcut.tarih) mevcut.tarih = tarih;
    map.set(ad, mevcut);
  });

  return [...map.values()]
    .sort((a, b) => b.tutar - a.tutar)
    .slice(0, limit)
    .map((x) => ({ ...x, tutar: Number(x.tutar.toFixed(2)) }));
}

function aramaDashboardiOlustur(hareketler, temelDashboard) {
  const paraBirimi =
    hareketler[0]?.para_birimi || temelDashboard?.para_birimi || "USD";
  const mevcutKasa = Number(temelDashboard?.mevcut_kasa || 0);

  const gelirHareketleri = hareketler.filter((h) => (h.yon || "GIDER") === "GELIR");
  const giderHareketleri = hareketler.filter((h) => (h.yon || "GIDER") === "GIDER");
  const gelirToplam = Number(
    gelirHareketleri.reduce((s, h) => s + Number(h.tutar || 0), 0).toFixed(2)
  );
  const giderToplam = Number(
    giderHareketleri.reduce((s, h) => s + Number(h.tutar || 0), 0).toFixed(2)
  );

  const ozetGelir = partnerOzetUret(hareketler, "GELIR", paraBirimi);
  const ozetGider = partnerOzetUret(hareketler, "GIDER", paraBirimi);

  return {
    ...(temelDashboard || {}),
    para_birimi: paraBirimi,
    net_durum: Number((mevcutKasa + gelirToplam - giderToplam).toFixed(2)),
    gelen: {
      donem_toplam: gelirToplam,
      donem_adedi: gelirHareketleri.length,
      partner_adedi: ozetGelir.length,
    },
    giden: {
      donem_toplam: giderToplam,
      donem_adedi: giderHareketleri.length,
      partner_adedi: ozetGider.length,
    },
    yaklasan_hareketler: hareketler.slice(0, 25).map((h) => ({
      adjust_key: h.adjust_key || "",
      firma_adi: h.partner_adi || h.firma_adi || "",
      tutar: Number(h.tutar || 0),
      para_birimi: h.para_birimi || paraBirimi,
      tarih: String(h.tarih || "").slice(0, 10),
      yon: h.yon || "GIDER",
      kampanya: h.kampanya || "",
    })),
    yaklasan_odemeler: ozetGider,
    yaklasan_tahsilatlar: ozetGelir,
  };
}

function dashboardListeleriCiz(d) {
  if (!d) return;

  const hareketler = d.yaklasan_hareketler || [];
  const arama = (document.getElementById("panel-ara")?.value || "").trim();
  const aramaMetni = arama
    ? ` · "${arama}" için ${hareketler.length} sonuç`
    : "";

  metinAyarla("dash-hareket-sayi", `${hareketler.length} hareket · son ${d.donem_gun} gün${aramaMetni}`);

  const hareketListe = el("dash-hareket-liste");
  if (hareketListe) {
    hareketListe.innerHTML = hareketler.length
      ? hareketler.map(hareketSatirCiz).join("")
      : `<p class="px-lg py-lg text-center text-on-surface-variant text-sm">${
          arama ? "Aramanızla eşleşen hareket yok." : "Henüz veri yok. Adjust'tan senkronize edin."
        }</p>`;
  }

  const odemeBody = el("dash-odeme-body");
  if (odemeBody) {
    const odemeler = d.yaklasan_odemeler || [];
    odemeBody.innerHTML = odemeler.length
      ? odemeler.map(tabloSatirCiz).join("")
      : bosTabloMesaji(arama ? "Eşleşen harcama partneri yok" : "Bu dönemde harcama yok");
  }

  const tahsilatBody = el("dash-tahsilat-body");
  if (tahsilatBody) {
    const tahsilatlar = d.yaklasan_tahsilatlar || [];
    tahsilatBody.innerHTML = tahsilatlar.length
      ? tahsilatlar.map(tabloSatirCiz).join("")
      : bosTabloMesaji(arama ? "Eşleşen gelir partneri yok" : "Bu dönemde gelir yok");
  }
}

function dashboardRender(d) {
  if (!d || !d.gelen || !d.giden) {
    throw new Error("Dashboard verisi eksik veya hatalı.");
  }

  const { gelen, giden } = d;
  const donem = d.donem_gun || 30;
  const pb = d.para_birimi || "USD";
  const gelenDonem = gelen.donem_toplam ?? 0;
  const gidenDonem = giden.donem_toplam ?? 0;

  metinAyarla("dash-gelen-toplam", Utils.formatTRY(gelenDonem, pb));
  metinAyarla(
    "dash-gelen-alt",
    `${donem} gün · ${gelen.donem_adedi ?? 0} kayıt · ${gelen.partner_adedi ?? 0} partner`
  );

  metinAyarla("dash-giden-toplam", Utils.formatTRY(gidenDonem, pb));
  metinAyarla(
    "dash-giden-alt",
    `${donem} gün · ${giden.donem_adedi ?? 0} kayıt · ${giden.partner_adedi ?? 0} partner`
  );

  const bulKart = el("dash-bul-kart");
  const bulToplam = el("dash-bul-toplam");
  const bulAlt = el("dash-bul-alt");

  if (bulToplam && bulAlt) {
    bulToplam.textContent = Utils.formatTRY(d.net_durum, pb);
    bulAlt.textContent = `Kasa ${Utils.formatTRY(d.mevcut_kasa, pb)} dahil · ${donem} günlük dönem`;
    if (bulKart) {
      bulKart.classList.toggle("bg-error-container", d.net_durum < 0);
      bulKart.classList.toggle("bg-primary", d.net_durum >= 0);
    }
  }

  metinAyarla("dash-kasa", Utils.formatTRY(d.mevcut_kasa, pb));

  const netEl = el("dash-net-durum");
  if (netEl) {
    if (d.net_durum >= 0) {
      netEl.textContent = `+${Utils.formatTRY(d.net_durum, pb)}`;
      netEl.className = "text-xs font-semibold text-secondary";
    } else {
      netEl.textContent = Utils.formatTRY(d.net_durum, pb);
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
  metinAyarla("dash-bar-gelen-etiket", `Gelir ${Utils.formatTRY(gelenDonem, pb)}`);
  metinAyarla("dash-bar-giden-etiket", `Harcama ${Utils.formatTRY(gidenDonem, pb)}`);

  dashboardListeleriCiz(d);
}

async function syncDurumGuncelle() {
  const el = document.getElementById("panel-sync-durum");
  if (!el) return;
  try {
    const durum = await AdjustService.durumGetir();
    if (!durum.tablo_hazir) {
      el.textContent = durum.tablo_uyari || "Veritabanı tablosu eksik — migrate_adjust.sql çalıştırın";
      el.classList.add("text-error", "font-semibold");
      return;
    }
    el.classList.remove("text-error", "font-semibold");
    if (durum.son_sync) {
      el.textContent = `Son sync: ${new Date(durum.son_sync).toLocaleString("tr-TR")}`;
    } else if (!durum.yapilandirildi) {
      el.textContent = "ADJUST_API_TOKEN tanımlayın";
    } else {
      el.textContent = "Henüz senkronize edilmedi";
    }
  } catch {
    el.textContent = "";
  }
}

async function dashboardYukle() {
  const bar = document.getElementById("donem-filtre-bar");
  if (bar) bar.classList.add("opacity-60", "pointer-events-none");
  try {
    const data = await DashboardService.dashboardGetir(aktifDonemGun);
    sonDashboardVerisi = data;
    await panelAramayiUygula(document.getElementById("panel-ara")?.value || "");
  } finally {
    if (bar) bar.classList.remove("opacity-60", "pointer-events-none");
  }
}

async function panelAramayiUygula(aramaHam) {
  const arama = (aramaHam || "").trim();
  if (!arama) {
    if (sonDashboardVerisi) dashboardRender(sonDashboardVerisi);
    return;
  }

  const istekNo = ++aramaIstekNo;
  try {
    const hareketler = await HareketService.listele({
      gun: aktifDonemGun,
      partner: arama,
    });
    if (istekNo !== aramaIstekNo) return;
    dashboardRender(aramaDashboardiOlustur(hareketler || [], sonDashboardVerisi));
  } catch (e) {
    console.error("Panel arama hatasi:", e);
  }
}

function panelAramaBagla() {
  const input = document.getElementById("panel-ara");
  if (!input || input.dataset.aramaBagli === "1") return;
  input.dataset.aramaBagli = "1";

  input.addEventListener("input", () => {
    if (aramaZamanlayici) clearTimeout(aramaZamanlayici);
    aramaZamanlayici = setTimeout(() => {
      panelAramayiUygula(input.value);
    }, 180);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const arama = input.value.trim();
    if (arama) {
      window.location.href = `/harcamalar?partner=${encodeURIComponent(arama)}`;
    }
  });
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

function adjustSyncBagla() {
  const btn = document.getElementById("adjust-sync-btn");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.classList.add("opacity-60");
    try {
      const sonuc = await AdjustService.senkronize(aktifDonemGun);
      alert(
        `Senkron tamamlandı.\n${sonuc.hareket_sayisi} hareket kaydedildi.\nGider: ${Utils.formatTRY(sonuc.gider_toplam, sonuc.para_birimi)}\nGelir: ${Utils.formatTRY(sonuc.gelir_toplam, sonuc.para_birimi)}`
      );
      await syncDurumGuncelle();
      await dashboardYukle();
    } catch (e) {
      alert(`Senkron hatası: ${e.message}`);
    } finally {
      btn.disabled = false;
      btn.classList.remove("opacity-60");
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await Layout.init();
    panelUyariBagla();
    panelAramaBagla();
    donemFiltreBagla();
    adjustSyncBagla();
    await dashboardYukle();
    await syncDurumGuncelle();
    await panelBildirimleriYukle();
  } catch (hata) {
    console.error(hata);
    alert(`Veri yüklenemedi: ${hata.message}`);
  }
});
