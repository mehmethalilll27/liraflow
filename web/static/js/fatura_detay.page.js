let aktifFatura = null;

function urlFaturaNo() {
  return new URLSearchParams(window.location.search).get("no");
}

function faturaKalanTutar(fatura) {
  if (!fatura) return 0;
  if (fatura.kalan_tutar != null) return fatura.kalan_tutar;
  if (fatura.durum === "ODENDI" || fatura.durum === "IPTAL") return 0;
  const odenen = Number(fatura.odenen_tutar || 0);
  return Math.max(0, Number(fatura.tutar || 0) - odenen);
}

function sayfayiDoldur(fatura) {
  aktifFatura = fatura;
  document.title = `LiraFlow - ${fatura.fatura_no}`;

  document.getElementById("detay-fatura-no").textContent = fatura.fatura_no;
  document.getElementById("detay-firma").textContent = fatura.firma_adi;
  document.getElementById("detay-firma-link").href = `/faturalar?firma=${encodeURIComponent(fatura.firma_adi)}`;
  document.getElementById("detay-durum").innerHTML = Utils.durumEtiketiBuyuk(fatura.durum);
  document.getElementById("detay-notlar").textContent = fatura.notlar || "-";
  document.getElementById("detay-olusturma").textContent = Utils.formatTarihUzun(fatura.olusturma_tarihi);
  document.getElementById("detay-vade").textContent = Utils.formatTarihUzun(fatura.vade_tarihi);
  document.getElementById("detay-guncelleme").textContent = Utils.formatTarihUzun(fatura.guncelleme_tarihi);
  document.getElementById("detay-odeme").textContent = fatura.odeme_tarihi
    ? Utils.formatTarihUzun(fatura.odeme_tarihi)
    : "-";
  document.getElementById("detay-tutar").textContent = Utils.formatTRY(fatura.tutar, fatura.para_birimi);
  const kalanTutar = faturaKalanTutar(fatura);
  const kalanTutarEl = document.getElementById("detay-kalan-tutar");
  if (kalanTutarEl) {
    if (fatura.durum === "ODENDI" || fatura.durum === "IPTAL") {
      kalanTutarEl.classList.add("hidden");
    } else {
      kalanTutarEl.textContent = `Kalan: ${Utils.formatTRY(kalanTutar, fatura.para_birimi)}`;
      kalanTutarEl.classList.remove("hidden");
    }
  }
  document.getElementById("detay-yon").innerHTML = Utils.yonEtiketi(fatura.yon || "GIDER");
  document.getElementById("detay-kategori").textContent = fatura.kategori || "genel";
  document.getElementById("detay-oncelik").textContent = Utils.oncelikMetin(fatura.oncelik);
  document.getElementById("detay-vade-gun").textContent = Utils.periyotEtiketi(fatura.odeme_periyodu_gun || 30);
  document.getElementById("detay-firma-ozet").textContent = `${fatura.firma_adi} — ${Utils.periyotEtiketi(fatura.odeme_periyodu_gun || 30)}`;

  const kalanGunEl = document.getElementById("detay-kalan-gun");
  const kalanMetin = Utils.kalanGunMetin(fatura.kalan_gun, fatura.durum);
  kalanGunEl.textContent = kalanMetin;
  kalanGunEl.className =
    fatura.kalan_gun !== null && fatura.kalan_gun < 0
      ? "font-body-md text-error font-bold"
      : fatura.kalan_gun !== null && fatura.kalan_gun <= 7
        ? "font-body-md text-on-tertiary-container font-bold"
        : "font-body-md text-on-surface";

  const gecmisEl = document.getElementById("detay-gecmis");
  const gecmis = fatura.tahsilat_gecmisi || [];
  if (!gecmis.length) {
    gecmisEl.innerHTML = `<p class="text-on-surface-variant text-body-md">Henüz kayıt yok.</p>`;
  } else {
    gecmisEl.innerHTML = gecmis
      .map(
        (kayit) => `
      <div class="relative flex gap-lg pl-lg mb-lg">
        <div class="absolute left-0 w-6 h-6 bg-secondary-container border-2 border-white rounded-full flex items-center justify-center z-10">
          <span class="material-symbols-outlined text-[14px] text-on-secondary-container">history</span>
        </div>
        <div class="flex-1">
          <div class="flex justify-between items-start gap-md">
            <h5 class="font-label-md text-label-md font-bold text-on-surface">${kayit.baslik || "Kayıt"}</h5>
            <span class="text-xs text-on-surface-variant whitespace-nowrap">${Utils.formatTarih(kayit.tarih)}</span>
          </div>
          <p class="font-body-md text-on-surface-variant mt-xs">${kayit.aciklama || ""}</p>
        </div>
      </div>`
      )
      .join("");
  }

  document.getElementById("modal-durum-select").value = fatura.durum;
  const odemeTarihEl = document.getElementById("modal-odeme-tarih");
  if (odemeTarihEl) {
    odemeTarihEl.value = fatura.odeme_tarihi || new Date().toISOString().slice(0, 10);
  }

  const yon = fatura.yon || "GIDER";
  const odemeKaydetBtn = document.getElementById("odeme-kaydet-btn");
  if (odemeKaydetBtn) {
    const kapali = fatura.durum === "ODENDI" || fatura.durum === "IPTAL";
    odemeKaydetBtn.disabled = kapali;
    odemeKaydetBtn.classList.toggle("opacity-50", kapali);
    odemeKaydetBtn.classList.toggle("pointer-events-none", kapali);
    odemeKaydetBtn.innerHTML = `
      <span class="material-symbols-outlined">${yon === "GELIR" ? "south_west" : "payments"}</span>
      ${yon === "GELIR" ? "Tahsilat Kaydet" : "Ödeme Kaydet"}`;
  }
}

function odemeModalAc() {
  if (!aktifFatura) return;
  const yon = aktifFatura.yon || "GIDER";
  const baslik = document.getElementById("odeme-modal-baslik");
  if (baslik) {
    baslik.textContent = yon === "GELIR" ? "Tahsilat Kaydet" : "Ödeme Kaydet";
  }
  const tutarInput = document.getElementById("odeme-tutar");
  if (tutarInput) tutarInput.value = faturaKalanTutar(aktifFatura);
  const tarihInput = document.getElementById("odeme-tarih");
  if (tarihInput) tarihInput.value = new Date().toISOString().slice(0, 10);
  const kanalInput = document.getElementById("odeme-kanal");
  if (kanalInput) kanalInput.value = "";
  const notInput = document.getElementById("odeme-notlar");
  if (notInput) notInput.value = "";
  modalAc("odemeModal");
}

const DETAY_MODALLAR = ["statusModal", "odemeModal"];

function tumModallariKapat() {
  DETAY_MODALLAR.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add("hidden");
    el.classList.remove("flex");
  });
  document.body.classList.remove("overflow-hidden");
}

function modalAc(id) {
  tumModallariKapat();
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("hidden");
  el.classList.add("flex");
  document.body.classList.add("overflow-hidden");
}

function modalKapat(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add("hidden");
  el.classList.remove("flex");
  const acik = DETAY_MODALLAR.some((modalId) => {
    const modal = document.getElementById(modalId);
    return modal && !modal.classList.contains("hidden");
  });
  if (!acik) document.body.classList.remove("overflow-hidden");
}

async function durumKaydet() {
  if (!aktifFatura) return;
  const yeniDurum = document.getElementById("modal-durum-select").value;
  const odemeTarihi = document.getElementById("modal-odeme-tarih").value || null;
  await InvoiceService.durumGuncelle(aktifFatura.fatura_no, yeniDurum, odemeTarihi);
  modalKapat("statusModal");
  sayfayiDoldur(await InvoiceService.getir(aktifFatura.fatura_no));
}

async function odemeKaydet() {
  if (!aktifFatura) return;
  const tutarInput = document.getElementById("odeme-tutar");
  const tutar = parseFloat(tutarInput?.value);
  const odeme_tarihi = document.getElementById("odeme-tarih")?.value;
  const kanal = document.getElementById("odeme-kanal")?.value.trim() || "";
  const notlar = document.getElementById("odeme-notlar")?.value.trim() || "";
  const kaydetBtn = document.getElementById("odeme-onay-btn");
  if (!Number.isFinite(tutar) || tutar <= 0) {
    alert("Geçerli bir tutar girin.");
    tutarInput?.focus();
    return;
  }
  if (!odeme_tarihi) {
    alert("Ödeme tarihi zorunludur.");
    return;
  }
  try {
    if (kaydetBtn) {
      kaydetBtn.disabled = true;
      kaydetBtn.textContent = "Kaydediliyor...";
    }
    const guncel = await InvoiceService.odemeKaydet(aktifFatura.fatura_no, {
      tutar,
      odeme_tarihi,
      kanal,
      notlar,
    });
    modalKapat("odemeModal");
    sayfayiDoldur(guncel);
    const yon = guncel.yon || "GIDER";
    const eylem = yon === "GELIR" ? "Tahsilat" : "Ödeme";
    const kalan = faturaKalanTutar(guncel);
    const mesaj =
      guncel.durum === "ODENDI"
        ? `${eylem} kaydedildi. Fatura ödendi olarak işaretlendi.`
        : `${eylem} kaydedildi. Kalan: ${Utils.formatTRY(kalan, guncel.para_birimi)}`;
    alert(mesaj);
  } catch (hata) {
    alert(`Kayıt başarısız: ${hata.message}`);
  } finally {
    if (kaydetBtn) {
      kaydetBtn.disabled = false;
      kaydetBtn.textContent = "Kaydet";
    }
  }
}

function faturaIndir() {
  if (!aktifFatura) return;
  const f = aktifFatura;
  Utils.csvIndir(
    `${f.fatura_no}.csv`,
    ["Alan", "Değer"],
    [
      ["Fatura No", f.fatura_no],
      ["Firma", f.firma_adi],
      ["Tutar", String(f.tutar)],
      ["Vade", f.vade_tarihi],
      ["Durum", f.durum],
      ["Notlar", f.notlar || ""],
    ]
  );
}

async function faturaArsivle() {
  if (!aktifFatura || !confirm("Bu faturayı arşivlemek istiyor musunuz?")) return;
  await InvoiceService.arsivle(aktifFatura.fatura_no);
  window.location.href = "/faturalar";
}

async function faturaSil() {
  if (!aktifFatura || !confirm("Bu fatura kalıcı olarak silinecek. Emin misiniz?")) return;
  await InvoiceService.sil(aktifFatura.fatura_no);
  window.location.href = "/faturalar";
}

document.addEventListener("DOMContentLoaded", async () => {
  const faturaNo = urlFaturaNo();
  if (!faturaNo) {
    window.location.href = "/faturalar";
    return;
  }

  try {
    await Layout.init();
    sayfayiDoldur(await InvoiceService.getir(faturaNo));

    document.getElementById("geri-btn").addEventListener("click", () => {
      window.location.href = "/faturalar";
    });
    document.getElementById("durum-guncelle-btn").addEventListener("click", () => modalAc("statusModal"));
    document.getElementById("odeme-kaydet-btn").addEventListener("click", odemeModalAc);
    document.getElementById("indir-btn").addEventListener("click", faturaIndir);
    document.getElementById("arsiv-btn").addEventListener("click", faturaArsivle);
    document.getElementById("sil-btn").addEventListener("click", faturaSil);

    document.getElementById("modal-iptal-btn").addEventListener("click", () => modalKapat("statusModal"));
    document.getElementById("modal-kaydet-btn").addEventListener("click", durumKaydet);
    document.getElementById("odeme-iptal-btn").addEventListener("click", () => modalKapat("odemeModal"));
    document.getElementById("odeme-onay-btn").addEventListener("click", (e) => {
      e.preventDefault();
      odemeKaydet();
    });
    document.getElementById("odeme-tutar-tam")?.addEventListener("click", () => {
      if (aktifFatura) {
        document.getElementById("odeme-tutar").value = faturaKalanTutar(aktifFatura);
      }
    });

    DETAY_MODALLAR.forEach((id) => {
      const modal = document.getElementById(id);
      if (!modal) return;
      modal.addEventListener("click", (e) => {
        if (e.target === modal || e.target.hasAttribute("data-modal-backdrop")) {
          modalKapat(id);
        }
      });
      const panel = modal.querySelector("[data-modal-panel]");
      if (panel) {
        panel.addEventListener("click", (e) => e.stopPropagation());
      }
    });
  } catch (hata) {
    alert(`Fatura yüklenemedi: ${hata.message}`);
    window.location.href = "/faturalar";
  }
});
