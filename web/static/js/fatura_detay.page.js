let aktifFatura = null;

function urlFaturaNo() {
  return new URLSearchParams(window.location.search).get("no");
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
  document.getElementById("detay-kategori").textContent = fatura.kategori || "genel";
  document.getElementById("detay-oncelik").textContent = Utils.oncelikMetin(fatura.oncelik);
  document.getElementById("detay-vade-gun").textContent = Utils.periyotEtiketi(fatura.odeme_periyodu_gun || 30);
  document.getElementById("detay-firma-ozet").textContent = `${fatura.firma_adi} — ${Utils.periyotEtiketi(fatura.odeme_periyodu_gun || 30)}`;

  const kalanEl = document.getElementById("detay-kalan-gun");
  const kalanMetin = Utils.kalanGunMetin(fatura.kalan_gun, fatura.durum);
  kalanEl.textContent = kalanMetin;
  kalanEl.className =
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
  document.getElementById("odeme-tutar").value = fatura.tutar;
  document.getElementById("odeme-tarih").value = new Date().toISOString().slice(0, 10);
}

function modalAc(id) {
  document.getElementById(id).classList.remove("hidden");
  document.getElementById(id).classList.add("flex");
}

function modalKapat(id) {
  document.getElementById(id).classList.add("hidden");
  document.getElementById(id).classList.remove("flex");
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
  const tutarRaw = document.getElementById("odeme-tutar").value;
  const tutar = parseFloat(String(tutarRaw).replace(",", "."));
  const odeme_tarihi = document.getElementById("odeme-tarih").value;
  const kanal = document.getElementById("odeme-kanal").value.trim();
  const notlar = document.getElementById("odeme-notlar").value.trim();
  const kaydetBtn = document.getElementById("odeme-onay-btn");
  if (!tutar || tutar <= 0) {
    alert("Geçerli bir tutar girin.");
    return;
  }
  if (!odeme_tarihi) {
    alert("Ödeme tarihi zorunludur.");
    return;
  }
  try {
    if (kaydetBtn) {
      kaydetBtn.disabled = true;
      kaydetBtn.classList.add("opacity-60");
    }
    await InvoiceService.odemeKaydet(aktifFatura.fatura_no, {
      tutar,
      odeme_tarihi,
      kanal,
      notlar,
    });
    modalKapat("odemeModal");
    sayfayiDoldur(await InvoiceService.getir(aktifFatura.fatura_no));
    alert("Ödeme kaydı başarıyla işlendi.");
  } catch (hata) {
    alert(`Ödeme kaydedilemedi: ${hata.message}`);
  } finally {
    if (kaydetBtn) {
      kaydetBtn.disabled = false;
      kaydetBtn.classList.remove("opacity-60");
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
    document.getElementById("odeme-kaydet-btn").addEventListener("click", () => modalAc("odemeModal"));
    document.getElementById("indir-btn").addEventListener("click", faturaIndir);
    document.getElementById("arsiv-btn").addEventListener("click", faturaArsivle);
    document.getElementById("sil-btn").addEventListener("click", faturaSil);

    document.getElementById("modal-iptal-btn").addEventListener("click", () => modalKapat("statusModal"));
    document.getElementById("modal-kaydet-btn").addEventListener("click", durumKaydet);
    document.getElementById("odeme-iptal-btn").addEventListener("click", () => modalKapat("odemeModal"));
    document.getElementById("odeme-onay-btn").addEventListener("click", odemeKaydet);

    ["statusModal", "odemeModal"].forEach((id) => {
      document.getElementById(id).addEventListener("click", (e) => {
        if (e.target.id === id) modalKapat(id);
      });
    });
  } catch (hata) {
    alert(`Fatura yüklenemedi: ${hata.message}`);
    window.location.href = "/faturalar";
  }
});
