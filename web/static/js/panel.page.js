let aktifDurumFiltre = "";

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

function filtreButonSinifi(secili) {
  return secili
    ? "px-lg py-sm rounded-full font-label-md text-label-md bg-primary text-on-primary"
    : "px-lg py-sm rounded-full font-label-md text-label-md bg-surface-container border border-outline-variant text-on-surface-variant hover:bg-surface-container-high transition-all";
}

function faturaSatirCiz(f) {
  const iptalSinif = f.durum === "IPTAL" ? " opacity-60" : "";
  const tutarSinif = f.durum === "IPTAL" ? " line-through" : "";
  return `
    <tr class="hover:bg-surface-container-low transition-colors group cursor-pointer${iptalSinif}" data-fatura-no="${f.fatura_no}">
      <td class="px-lg py-lg font-mono-data text-mono-data text-on-surface">${f.fatura_no}</td>
      <td class="px-lg py-lg font-body-md text-body-md font-semibold text-on-surface">
        <div class="flex items-center gap-sm flex-wrap">
          <span>${f.firma_adi}</span>
          ${Utils.periyotBadge(f.odeme_periyodu_gun)}
        </div>
      </td>
      <td class="px-lg py-lg">${Utils.durumEtiketi(f.durum)}</td>
      <td class="px-lg py-lg font-mono-data text-mono-data text-right font-bold${tutarSinif}">${Utils.formatTRY(f.tutar, f.para_birimi)}</td>
      <td class="px-lg py-lg font-body-md text-body-md text-on-surface-variant">${Utils.formatTarih(f.vade_tarihi)}</td>
      <td class="px-lg py-lg text-center">
        <a href="${Utils.faturaDetayUrl(f.fatura_no)}" class="p-2 hover:bg-surface-container rounded-full text-on-surface-variant inline-flex" title="Detay">
          <span class="material-symbols-outlined">visibility</span>
        </a>
      </td>
    </tr>
  `;
}

async function ozetiYukle() {
  const ozet = await DashboardService.ozetGetir();

  document.getElementById("ozet-fatura-adedi").textContent = `${ozet.fatura_adedi} adet`;
  document.getElementById("ozet-fatura-alt").textContent =
    `${ozet.bekleyen_adedi} bekliyor · ${ozet.geciken_adedi} gecikmiş · ${ozet.odenen_adedi} ödendi`;

  document.getElementById("ozet-odenecek").textContent = Utils.formatTRY(ozet.toplam_odenecek);
  const odenecekAlt = document.getElementById("ozet-odenecek-alt");
  if (ozet.yaklasan_adedi > 0) {
    odenecekAlt.textContent = `${ozet.yaklasan_adedi} fatura — ${ozet.bildirim_gun_siniri} gün içinde vade (${Utils.formatTRY(ozet.yaklasan_odenecek)})`;
  } else if (ozet.bekleyen_adedi > 0) {
    odenecekAlt.textContent = `${ozet.bekleyen_adedi} bekleyen fatura`;
  } else {
    odenecekAlt.textContent = "Bekleyen ödeme yok";
  }

  const gecikenKart = document.getElementById("ozet-geciken-kart");
  const gecikenDeger = document.getElementById("ozet-geciken");
  const gecikenAlt = document.getElementById("ozet-geciken-alt");
  gecikenDeger.textContent = Utils.formatTRY(ozet.toplam_geciken);
  if (ozet.geciken_adedi > 0) {
    gecikenKart.classList.add("border-l-4", "border-l-error");
    gecikenDeger.classList.add("text-error");
    gecikenAlt.className = "mt-sm text-[11px] text-error font-semibold";
    gecikenAlt.textContent = `${ozet.geciken_adedi} fatura · ${ozet.geciken_firma_sayisi} firmada gecikme`;
  } else {
    gecikenKart.classList.remove("border-l-4", "border-l-error");
    gecikenDeger.classList.remove("text-error");
    gecikenAlt.className = "mt-sm text-[11px] text-on-surface-variant font-medium";
    gecikenAlt.textContent = "Geciken fatura yok";
  }

  document.getElementById("ozet-odenen").textContent = Utils.formatTRY(ozet.toplam_odenen);
  document.getElementById("ozet-odenen-alt").textContent =
    ozet.odenen_adedi > 0 ? `${ozet.odenen_adedi} fatura tahsil edildi` : "Henüz tahsilat yok";
}

async function faturalariYukle() {
  const body = document.getElementById("fatura-tablo-body");
  const faturalar = await InvoiceService.listele(
    aktifDurumFiltre ? { durum: aktifDurumFiltre } : {}
  );
  const sonBes = faturalar.slice(0, 8);
  if (!sonBes.length) {
    body.innerHTML = `<tr><td colspan="6" class="px-lg py-lg text-center text-on-surface-variant">Kayıt bulunamadı.</td></tr>`;
    return;
  }
  body.innerHTML = sonBes.map(faturaSatirCiz).join("");
}

function filtreButonlariniBagla() {
  const bar = document.getElementById("durum-filtre-bar");
  if (!bar) return;
  bar.querySelectorAll("[data-durum]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      aktifDurumFiltre = btn.getAttribute("data-durum") || "";
      bar.querySelectorAll("[data-durum]").forEach((b) => {
        const secili = b === btn;
        b.className = filtreButonSinifi(secili);
      });
      await faturalariYukle();
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await Layout.init();
    panelUyariBagla();
    filtreButonlariniBagla();
    await ozetiYukle();
    await panelBildirimleriYukle();
    await faturalariYukle();

    const yeniBtn = document.getElementById("yeni-fatura-btn");
    if (yeniBtn) {
      yeniBtn.addEventListener("click", () => {
        window.location.href = "/faturalar?yeni=1";
      });
    }

    const panelAra = document.getElementById("panel-ara");
    if (panelAra) {
      panelAra.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const arama = panelAra.value.trim();
          if (arama) window.location.href = `/faturalar?firma=${encodeURIComponent(arama)}`;
        }
      });
    }
  } catch (hata) {
    console.error(hata);
    alert(`Veri yüklenemedi: ${hata.message}`);
  }
});
