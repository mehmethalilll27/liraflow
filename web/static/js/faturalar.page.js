let tumFaturalar = [];
let tumFirmalar = [];
let filtreliFaturalar = [];
let faturaSayfa = 1;
const FATURA_SAYFA_BASINA = 10;

function durumSelectHtml(mevcut) {
  const durumlar = [
    { kod: "BEKLIYOR", metin: "Bekliyor" },
    { kod: "GECIKTI", metin: "Gecikmiş" },
    { kod: "ODENDI", metin: "Ödendi" },
    { kod: "IPTAL", metin: "İptal" },
  ];
  return durumlar
    .map((d) => `<option value="${d.kod}" ${d.kod === mevcut ? "selected" : ""}>${d.metin}</option>`)
    .join("");
}

function faturaSatirCiz(f) {
  const baslik = Utils.firmaBasHarfleri(f.firma_adi);
  return `
    <tr class="hover:bg-surface-container-low transition-colors duration-150 group">
      <td class="px-lg py-lg text-center">${Utils.odemeSiraBadge(f.odeme_sira_no || 0, f.durum)}</td>
      <td class="px-lg py-lg font-mono-data text-body-md font-semibold text-primary">${f.fatura_no}</td>
      <td class="px-lg py-lg">
        <div class="flex items-center gap-sm flex-wrap">
          <div class="w-8 h-8 rounded-lg bg-primary-container/10 flex items-center justify-center text-primary font-bold shrink-0">${baslik}</div>
          <div class="min-w-0">
            <span class="font-body-md text-body-md font-medium block">${f.firma_adi}</span>
            ${Utils.periyotBadge(f.odeme_periyodu_gun)}
          </div>
        </div>
      </td>
      <td class="px-lg py-lg text-body-md text-on-surface-variant">${f.kategori || "genel"}</td>
      <td class="px-lg py-lg font-mono-data text-body-md font-bold text-primary">${Utils.formatTRY(f.tutar, f.para_birimi)}</td>
      <td class="px-lg py-lg text-body-md">${Utils.formatTarih(f.vade_tarihi)}</td>
      <td class="px-lg py-lg">${Utils.durumEtiketi(f.durum)}</td>
      <td class="px-lg py-lg">
        <div class="flex items-center gap-1">
          <div class="w-1.5 h-1.5 rounded-full ${Utils.oncelikNokta(f.oncelik)}"></div>
          <span class="text-xs font-semibold text-on-surface-variant">${Utils.oncelikMetin(f.oncelik)}</span>
        </div>
      </td>
      <td class="px-lg py-lg text-right space-x-2">
        <button type="button" class="p-2 text-on-surface-variant hover:text-primary transition-colors" title="Durum Güncelle" data-durum-btn data-fatura-no="${f.fatura_no}">
          <span class="material-symbols-outlined text-md">sync_alt</span>
        </button>
        <a href="${Utils.faturaDetayUrl(f.fatura_no)}" class="p-2 text-on-surface-variant hover:text-primary transition-colors inline-flex" title="Detayları Görüntüle">
          <span class="material-symbols-outlined text-md">visibility</span>
        </a>
      </td>
    </tr>
  `;
}

function tabloyuCiz(faturalar) {
  const body = document.getElementById("fatura-tablo-body");
  if (!faturalar.length) {
    body.innerHTML = `<tr><td colspan="9" class="px-lg py-lg text-center text-on-surface-variant">Kayıt bulunamadı.</td></tr>`;
    faturaSayfalamaCiz();
    return;
  }
  const basla = (faturaSayfa - 1) * FATURA_SAYFA_BASINA;
  const sayfaVeri = faturalar.slice(basla, basla + FATURA_SAYFA_BASINA);
  body.innerHTML = sayfaVeri.map(faturaSatirCiz).join("");
  const toplamSayfa = Math.max(1, Math.ceil(faturalar.length / FATURA_SAYFA_BASINA));
  document.getElementById("fatura-sayac").textContent = `${faturalar.length} fatura • Sayfa ${faturaSayfa}/${toplamSayfa}`;
  faturaSayfalamaCiz();
}

function faturaSayfalamaCiz() {
  const butonlar = document.getElementById("fatura-sayfa-butonlari");
  const onceki = document.getElementById("fatura-onceki");
  const sonraki = document.getElementById("fatura-sonraki");
  if (!butonlar || !onceki || !sonraki) return;

  const toplamSayfa = Math.max(1, Math.ceil(filtreliFaturalar.length / FATURA_SAYFA_BASINA));
  const baslangic = Math.max(1, faturaSayfa - 1);
  const bitis = Math.min(toplamSayfa, baslangic + 2);

  onceki.disabled = faturaSayfa <= 1;
  onceki.classList.toggle("opacity-40", onceki.disabled);
  sonraki.disabled = faturaSayfa >= toplamSayfa;
  sonraki.classList.toggle("opacity-40", sonraki.disabled);

  butonlar.innerHTML = "";
  for (let s = baslangic; s <= bitis; s += 1) {
    const secili = s === faturaSayfa;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = String(s);
    btn.className = secili
      ? "w-9 h-9 flex items-center justify-center rounded-lg bg-primary text-on-primary font-semibold"
      : "w-9 h-9 flex items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-all";
    btn.addEventListener("click", () => {
      faturaSayfa = s;
      tabloyuCiz(filtreliFaturalar);
    });
    butonlar.appendChild(btn);
  }
}

function drawerAc(fatura) {
  const drawer = document.getElementById("transaction-drawer");
  const icerik = drawer.querySelector("[data-drawer-panel]");
  document.getElementById("drawer-fatura-no").textContent = fatura.fatura_no;
  document.getElementById("drawer-firma").textContent = fatura.firma_adi;
  document.getElementById("drawer-tutar").textContent = Utils.formatTRY(fatura.tutar, fatura.para_birimi);
  document.getElementById("drawer-durum-select").innerHTML = durumSelectHtml(fatura.durum);
  document.getElementById("drawer-durum-select").value = fatura.durum;
  document.getElementById("drawer-kaydet-btn").setAttribute("data-fatura-no", fatura.fatura_no);

  drawer.classList.remove("opacity-0", "pointer-events-none");
  drawer.classList.add("opacity-100");
  icerik.classList.remove("translate-x-full");
}

function drawerKapat() {
  const drawer = document.getElementById("transaction-drawer");
  const icerik = drawer.querySelector("[data-drawer-panel]");
  drawer.classList.add("opacity-0", "pointer-events-none");
  drawer.classList.remove("opacity-100");
  icerik.classList.add("translate-x-full");
}

function firmaPeriyotGoster() {
  const ad = document.getElementById("yeni-firma-adi").value.trim();
  const firma = tumFirmalar.find((f) => f.firma_adi === ad);
  const info = document.getElementById("yeni-vade-info");
  const periyotSelect = document.getElementById("yeni-odeme-periyodu");
  if (!firma) {
    if (info) info.textContent = "";
    return;
  }
  const gun = firma.odeme_periyodu_gun || firma.odeme_vadesi_gun || 30;
  if (periyotSelect) periyotSelect.value = String(gun === 10 ? 15 : gun);
  if (info) info.textContent = `Bu firmaya ${Utils.periyotEtiketi(gun)} ödeme yapılır`;
}

function yeniFaturaModalAc() {
  const modal = document.getElementById("yeni-fatura-modal");
  const liste = document.getElementById("yeni-firma-listesi");
  liste.innerHTML = tumFirmalar.map((f) => `<option value="${f.firma_adi}">`).join("");
  document.getElementById("yeni-firma-adi").value = "";
  document.getElementById("yeni-tutar").value = "";
  document.getElementById("yeni-vade").value = new Date().toISOString().slice(0, 10);
  document.getElementById("yeni-notlar").value = "";
  document.getElementById("yeni-odeme-periyodu").value = "30";
  document.getElementById("yeni-vade-info").textContent = "";
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function yeniFaturaModalKapat() {
  const modal = document.getElementById("yeni-fatura-modal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

function disaAktar() {
  if (!tumFaturalar.length) {
    alert("Dışa aktarılacak fatura yok.");
    return;
  }
  const basliklar = ["Sıra", "Fatura No", "Firma", "Ödeme Periyodu", "Tutar", "Vade", "Durum", "Öncelik", "Kategori"];
  const satirlar = tumFaturalar.map((f) => [
    f.odeme_sira_no || "",
    f.fatura_no,
    f.firma_adi,
    Utils.periyotEtiketi(f.odeme_periyodu_gun),
    String(f.tutar).replace(".", ","),
    f.vade_tarihi,
    f.durum,
    Utils.oncelikMetin(f.oncelik),
    f.kategori || "genel",
  ]);
  Utils.csvIndir(`liraflow-faturalar-${new Date().toISOString().slice(0, 10)}.csv`, basliklar, satirlar);
}

async function faturalariYukle() {
  const firmaAdi = document.getElementById("filtre-firma").value.trim();
  const durumHam = document.getElementById("filtre-durum").value;
  const tarihBaslangic = document.getElementById("filtre-tarih-baslangic").value;
  const tarihBitis = document.getElementById("filtre-tarih-bitis").value;
  const durumHarita = {
    "": "",
    Tümü: "",
    Bekliyor: "BEKLIYOR",
    Gecikmiş: "GECIKTI",
    Ödendi: "ODENDI",
    İptal: "IPTAL",
  };
  const durum = durumHarita[durumHam] ?? durumHam.toUpperCase();

  tumFaturalar = await InvoiceService.listele({
    firma_adi: firmaAdi || undefined,
    durum: durum || undefined,
  });
  filtreliFaturalar = tumFaturalar.filter((f) => {
    if (tarihBaslangic && f.vade_tarihi < tarihBaslangic) return false;
    if (tarihBitis && f.vade_tarihi > tarihBitis) return false;
    return true;
  });
  faturaSayfa = 1;
  tabloyuCiz(filtreliFaturalar);
}

async function durumKaydet(faturaNo) {
  const select = document.getElementById("drawer-durum-select");
  await InvoiceService.durumGuncelle(faturaNo, select.value);
  drawerKapat();
  await faturalariYukle();
}

async function yeniFaturaKaydet() {
  const firma_adi = document.getElementById("yeni-firma-adi").value.trim();
  const tutarRaw = document.getElementById("yeni-tutar").value;
  const tutar = parseFloat(String(tutarRaw).replace(",", "."));
  const vade_tarihi = document.getElementById("yeni-vade").value;
  const notlar = document.getElementById("yeni-notlar").value.trim();
  const odeme_periyodu_gun = parseInt(document.getElementById("yeni-odeme-periyodu").value, 10);

  if (!firma_adi || !tutar || !vade_tarihi) {
    alert("Firma adı, tutar ve vade tarihi zorunludur.");
    return;
  }

  const yeni = await InvoiceService.ekle({
    firma_adi,
    tutar,
    vade_tarihi: vade_tarihi || undefined,
    notlar,
    odeme_periyodu_gun,
  });
  yeniFaturaModalKapat();
  await faturalariYukle();
  window.location.href = Utils.faturaDetayUrl(yeni.fatura_no);
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await Layout.init();
    tumFirmalar = await FirmService.listele();
    await faturalariYukle();

    const params = new URLSearchParams(window.location.search);
    if (params.get("firma")) {
      document.getElementById("filtre-firma").value = params.get("firma");
      await faturalariYukle();
    }

    document.getElementById("filtrele-btn").addEventListener("click", faturalariYukle);
    document.getElementById("filtre-firma").addEventListener("keydown", (e) => {
      if (e.key === "Enter") faturalariYukle();
    });
    document.getElementById("filtre-firma").addEventListener("input", () => {
      clearTimeout(window._firmaFiltreTimer);
      window._firmaFiltreTimer = setTimeout(faturalariYukle, 300);
    });
    document.getElementById("filtre-tarih-baslangic").addEventListener("change", faturalariYukle);
    document.getElementById("filtre-tarih-bitis").addEventListener("change", faturalariYukle);

    const ustAra = document.getElementById("ust-ara");
    if (ustAra) {
      ustAra.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          document.getElementById("filtre-firma").value = ustAra.value.trim();
          faturalariYukle();
        }
      });
    }

    document.getElementById("disa-aktar-btn").addEventListener("click", disaAktar);
    document.getElementById("yeni-fatura-btn").addEventListener("click", yeniFaturaModalAc);
    document.getElementById("yeni-firma-adi").addEventListener("change", firmaPeriyotGoster);
    document.getElementById("yeni-firma-adi").addEventListener("blur", firmaPeriyotGoster);
    document.getElementById("yeni-fatura-kapat").addEventListener("click", yeniFaturaModalKapat);
    document.getElementById("yeni-fatura-iptal").addEventListener("click", yeniFaturaModalKapat);
    document.getElementById("yeni-fatura-kaydet").addEventListener("click", yeniFaturaKaydet);
    document.getElementById("yeni-fatura-modal").addEventListener("click", (e) => {
      if (e.target.id === "yeni-fatura-modal") yeniFaturaModalKapat();
    });

    if (new URLSearchParams(window.location.search).get("yeni") === "1") {
      yeniFaturaModalAc();
    }

    document.getElementById("fatura-tablo-body").addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-durum-btn]");
      if (!btn) return;
      const fatura = tumFaturalar.find((f) => f.fatura_no === btn.getAttribute("data-fatura-no"));
      if (fatura) drawerAc(fatura);
    });

    document.getElementById("close-drawer").addEventListener("click", drawerKapat);
    document.getElementById("transaction-drawer").addEventListener("click", (e) => {
      if (e.target.id === "transaction-drawer") drawerKapat();
    });
    document.getElementById("drawer-kaydet-btn").addEventListener("click", async () => {
      const faturaNo = document.getElementById("drawer-kaydet-btn").getAttribute("data-fatura-no");
      await durumKaydet(faturaNo);
    });
    document.getElementById("fatura-onceki").addEventListener("click", () => {
      if (faturaSayfa <= 1) return;
      faturaSayfa -= 1;
      tabloyuCiz(filtreliFaturalar);
    });
    document.getElementById("fatura-sonraki").addEventListener("click", () => {
      const toplamSayfa = Math.max(1, Math.ceil(filtreliFaturalar.length / FATURA_SAYFA_BASINA));
      if (faturaSayfa >= toplamSayfa) return;
      faturaSayfa += 1;
      tabloyuCiz(filtreliFaturalar);
    });
  } catch (hata) {
    console.error(hata);
    alert(`Veri yüklenemedi: ${hata.message}`);
  }
});
