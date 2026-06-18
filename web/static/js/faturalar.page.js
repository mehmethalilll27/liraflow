let tumFaturalarHam = [];
let tumFirmalar = [];
let filtreliFaturalar = [];
let faturaSayfa = 1;
const FATURA_SAYFA_BASINA = 10;

function acikFatura(f) {
  return f.durum === "BEKLIYOR" || f.durum === "GECIKTI";
}

function buAyOneki() {
  return new Date().toISOString().slice(0, 7);
}

function ozetHesapla(faturalar) {
  const ay = buAyOneki();
  const ozet = {
    giderBekleyen: 0,
    gelirBekleyen: 0,
    giderBekleyenAdet: 0,
    gelirBekleyenAdet: 0,
    gecikenGider: 0,
    gecikenGelir: 0,
    gecikenAdet: 0,
    giderOdenenAy: 0,
    gelirTahsilAy: 0,
    tamamlananAyAdet: 0,
  };

  faturalar.forEach((f) => {
    const yon = f.yon || "GIDER";
    if (acikFatura(f)) {
      if (yon === "GELIR") {
        ozet.gelirBekleyen += f.tutar;
        ozet.gelirBekleyenAdet += 1;
      } else {
        ozet.giderBekleyen += f.tutar;
        ozet.giderBekleyenAdet += 1;
      }
    }
    if (f.durum === "GECIKTI") {
      ozet.gecikenAdet += 1;
      if (yon === "GELIR") ozet.gecikenGelir += f.tutar;
      else ozet.gecikenGider += f.tutar;
    }
    if (f.durum === "ODENDI" && f.odeme_tarihi && f.odeme_tarihi.startsWith(ay)) {
      ozet.tamamlananAyAdet += 1;
      if (yon === "GELIR") ozet.gelirTahsilAy += f.tutar;
      else ozet.giderOdenenAy += f.tutar;
    }
  });

  return ozet;
}

function ozetKartlariniGuncelle(faturalar) {
  const o = ozetHesapla(faturalar);
  const yonFiltre = document.getElementById("filtre-yon")?.value || "";
  const kartlar = document.getElementById("fatura-ozet-kartlari");

  const giderKart = kartlar?.children[0];
  const gelirKart = kartlar?.children[1];
  if (giderKart) giderKart.classList.toggle("hidden", yonFiltre === "GELIR");
  if (gelirKart) gelirKart.classList.toggle("hidden", yonFiltre === "GIDER");

  const giderEl = document.getElementById("ozet-gider-bekleyen");
  const gelirEl = document.getElementById("ozet-gelir-bekleyen");
  if (giderEl) giderEl.textContent = Utils.formatTRY(o.giderBekleyen);
  if (gelirEl) gelirEl.textContent = Utils.formatTRY(o.gelirBekleyen);

  const giderAlt = document.getElementById("ozet-gider-bekleyen-alt");
  const gelirAlt = document.getElementById("ozet-gelir-bekleyen-alt");
  if (giderAlt) {
    giderAlt.textContent =
      o.giderBekleyenAdet > 0 ? `${o.giderBekleyenAdet} ödenecek fatura` : "Bekleyen gider yok";
  }
  if (gelirAlt) {
    gelirAlt.textContent =
      o.gelirBekleyenAdet > 0 ? `${o.gelirBekleyenAdet} tahsil edilecek fatura` : "Bekleyen gelir yok";
  }

  const gecikenToplam = o.gecikenGider + o.gecikenGelir;
  const gecikenEl = document.getElementById("ozet-geciken");
  const gecikenAlt = document.getElementById("ozet-geciken-alt");
  if (gecikenEl) gecikenEl.textContent = Utils.formatTRY(gecikenToplam);
  if (gecikenAlt) {
    if (!o.gecikenAdet) {
      gecikenAlt.textContent = "Geciken fatura yok";
    } else if (yonFiltre === "GIDER") {
      gecikenAlt.textContent = `${o.gecikenAdet} gider faturası gecikmiş`;
    } else if (yonFiltre === "GELIR") {
      gecikenAlt.textContent = `${o.gecikenAdet} gelir faturası gecikmiş`;
    } else {
      gecikenAlt.textContent = `${o.gecikenAdet} fatura · gider ${Utils.formatTRY(o.gecikenGider)} · gelir ${Utils.formatTRY(o.gecikenGelir)}`;
    }
  }

  const tamamlananToplam = o.giderOdenenAy + o.gelirTahsilAy;
  const tamEl = document.getElementById("ozet-tamamlanan");
  const tamAlt = document.getElementById("ozet-tamamlanan-alt");
  if (tamEl) tamEl.textContent = Utils.formatTRY(tamamlananToplam);
  if (tamAlt) {
    if (!o.tamamlananAyAdet) {
      tamAlt.textContent = "Bu ay henüz tamamlanan işlem yok";
    } else {
      tamAlt.textContent = `${o.tamamlananAyAdet} fatura · ödenen ${Utils.formatTRY(o.giderOdenenAy)} · tahsil ${Utils.formatTRY(o.gelirTahsilAy)}`;
    }
  }

  const sayac = document.getElementById("fatura-sayac");
  const toplamSayfa = Math.max(1, Math.ceil(faturalar.length / FATURA_SAYFA_BASINA));
  if (sayac && !sayac.dataset.sayfaModu) {
    sayac.textContent = `${faturalar.length} fatura listeleniyor`;
  }

  const aciklama = document.getElementById("fatura-sayfa-aciklama");
  if (aciklama) {
    const parcalar = [`${faturalar.length} kayıt`];
    if (yonFiltre === "GIDER") parcalar.push("sadece gider");
    else if (yonFiltre === "GELIR") parcalar.push("sadece gelir");
    if (o.gecikenAdet) parcalar.push(`${o.gecikenAdet} gecikmiş`);
    aciklama.textContent = `${parcalar.join(" · ")} — gecikenler önce, gider ve gelir ayrı sıralı`;
  }
}

function filtreDegerleri() {
  const firmaInput = document.getElementById("filtre-firma");
  const ustAra = document.getElementById("ust-ara");
  const arama = (firmaInput?.value || ustAra?.value || "").trim().toLowerCase();
  return {
    arama,
    durum: document.getElementById("filtre-durum").value,
    yon: document.getElementById("filtre-yon").value,
    tarihBas: document.getElementById("filtre-tarih-baslangic").value,
    tarihBit: document.getElementById("filtre-tarih-bitis").value,
  };
}

function faturaFiltreUygun(f, filtre) {
  if (filtre.arama) {
    const q = filtre.arama;
    const eslesir =
      f.firma_adi.toLowerCase().includes(q) ||
      f.fatura_no.toLowerCase().includes(q) ||
      (f.kategori || "").toLowerCase().includes(q);
    if (!eslesir) return false;
  }
  if (filtre.durum && f.durum !== filtre.durum) return false;
  if (filtre.yon && (f.yon || "GIDER") !== filtre.yon) return false;
  if (filtre.tarihBas && f.vade_tarihi < filtre.tarihBas) return false;
  if (filtre.tarihBit && f.vade_tarihi > filtre.tarihBit) return false;
  return true;
}

function siraNumaralariniYenile(faturalar) {
  let giderNo = 1;
  let gelirNo = 1;
  return faturalar.map((f) => {
    const kopya = { ...f };
    if (f.durum !== "BEKLIYOR" && f.durum !== "GECIKTI") {
      kopya.odeme_sira_no = 0;
      kopya.tahsilat_sira_no = 0;
      return kopya;
    }
    if ((f.yon || "GIDER") === "GELIR") {
      kopya.tahsilat_sira_no = gelirNo;
      kopya.odeme_sira_no = 0;
      gelirNo += 1;
    } else {
      kopya.odeme_sira_no = giderNo;
      kopya.tahsilat_sira_no = 0;
      giderNo += 1;
    }
    return kopya;
  });
}

function filtreUygula() {
  const filtre = filtreDegerleri();
  const ara = tumFaturalarHam.filter((f) => faturaFiltreUygun(f, filtre));
  filtreliFaturalar = siraNumaralariniYenile(ara);
  faturaSayfa = 1;
  tabloyuCiz(filtreliFaturalar);
}

function filtreleriTemizle() {
  document.getElementById("filtre-firma").value = "";
  const ustAra = document.getElementById("ust-ara");
  if (ustAra) ustAra.value = "";
  document.getElementById("filtre-durum").value = "";
  document.getElementById("filtre-yon").value = "";
  document.getElementById("filtre-tarih-baslangic").value = "";
  document.getElementById("filtre-tarih-bitis").value = "";
  filtreUygula();
}

function anlikAramaGuncelle(deger) {
  const metin = deger ?? "";
  const firmaInput = document.getElementById("filtre-firma");
  const ustAra = document.getElementById("ust-ara");
  if (firmaInput && firmaInput.value !== metin) firmaInput.value = metin;
  if (ustAra && ustAra.value !== metin) ustAra.value = metin;
  filtreUygula();
}

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
  const yon = f.yon || "GIDER";
  const tutarSinif = yon === "GELIR" ? "text-secondary" : "text-error";
  return `
    <tr class="hover:bg-surface-container-low transition-colors duration-150 group">
      <td class="px-lg py-lg text-center">${
        yon === "GELIR"
          ? Utils.tahsilatSiraBadge(f.tahsilat_sira_no || 0, f.durum)
          : Utils.odemeSiraBadge(f.odeme_sira_no || 0, f.durum)
      }</td>
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
      <td class="px-lg py-lg">${Utils.yonEtiketi(yon)}</td>
      <td class="px-lg py-lg text-body-md text-on-surface-variant">${f.kategori || "genel"}</td>
      <td class="px-lg py-lg font-mono-data text-body-md font-bold ${tutarSinif}">${Utils.formatTRY(f.tutar, f.para_birimi)}</td>
      <td class="px-lg py-lg text-body-md">${Utils.formatTarih(f.vade_tarihi)}<span class="block text-xs text-on-surface-variant">${Utils.kalanGunMetin(f.kalan_gun, f.durum)}</span></td>
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
    body.innerHTML = `<tr><td colspan="10" class="px-lg py-lg text-center text-on-surface-variant">Kayıt bulunamadı.</td></tr>`;
    const sayac = document.getElementById("fatura-sayac");
    if (sayac) {
      sayac.dataset.sayfaModu = "1";
      sayac.textContent = "0 fatura";
    }
    faturaSayfalamaCiz();
    ozetKartlariniGuncelle(faturalar);
    return;
  }
  const basla = (faturaSayfa - 1) * FATURA_SAYFA_BASINA;
  const sayfaVeri = faturalar.slice(basla, basla + FATURA_SAYFA_BASINA);
  body.innerHTML = sayfaVeri.map(faturaSatirCiz).join("");
  const toplamSayfa = Math.max(1, Math.ceil(faturalar.length / FATURA_SAYFA_BASINA));
  const sayac = document.getElementById("fatura-sayac");
  if (sayac) {
    sayac.dataset.sayfaModu = "1";
    sayac.textContent = `${faturalar.length} fatura · Sayfa ${faturaSayfa}/${toplamSayfa}`;
  }
  faturaSayfalamaCiz();
  ozetKartlariniGuncelle(faturalar);
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
  const yon = fatura.yon || "GIDER";
  const yonEl = document.getElementById("drawer-yon");
  if (yonEl) {
    yonEl.innerHTML = Utils.yonEtiketi(yon);
  }
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
  if (info) {
    const yon = document.getElementById("yeni-yon")?.value || "GIDER";
    const eylem = yon === "GELIR" ? "tahsilat" : "ödeme";
    info.textContent = `Bu firmadan ${Utils.periyotEtiketi(gun)} ${eylem} beklenir`;
  }
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
  document.getElementById("yeni-yon").value = "GIDER";
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
  const kaynak = filtreliFaturalar.length ? filtreliFaturalar : tumFaturalarHam;
  if (!kaynak.length) {
    alert("Dışa aktarılacak fatura yok.");
    return;
  }
  const basliklar = ["Ödeme Sıra", "Tahsilat Sıra", "Fatura No", "Yön", "Firma", "Ödeme Periyodu", "Tutar", "Vade", "Durum", "Öncelik", "Kategori"];
  const satirlar = kaynak.map((f) => [
    f.odeme_sira_no || "",
    f.tahsilat_sira_no || "",
    f.fatura_no,
    f.yon || "GIDER",
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

async function faturalariIlkYukle() {
  tumFaturalarHam = await InvoiceService.listele();
  filtreUygula();
}

async function faturalariYenile() {
  tumFaturalarHam = await InvoiceService.listele();
  filtreUygula();
}

async function durumKaydet(faturaNo) {
  const select = document.getElementById("drawer-durum-select");
  await InvoiceService.durumGuncelle(faturaNo, select.value);
  drawerKapat();
  await faturalariYenile();
}

async function yeniFaturaKaydet() {
  const firma_adi = document.getElementById("yeni-firma-adi").value.trim();
  const tutarRaw = document.getElementById("yeni-tutar").value;
  const tutar = parseFloat(String(tutarRaw).replace(",", "."));
  const vade_tarihi = document.getElementById("yeni-vade").value;
  const notlar = document.getElementById("yeni-notlar").value.trim();
  const odeme_periyodu_gun = parseInt(document.getElementById("yeni-odeme-periyodu").value, 10);
  const yon = document.getElementById("yeni-yon").value;

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
    yon,
  });
  yeniFaturaModalKapat();
  await faturalariYenile();
  window.location.href = Utils.faturaDetayUrl(yeni.fatura_no);
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await Layout.init();
    tumFirmalar = await FirmService.listele();

    const params = new URLSearchParams(window.location.search);
    const firmaParam = params.get("firma") || params.get("firma_adi");
    if (firmaParam) {
      const firmaInput = document.getElementById("filtre-firma");
      const ustAra = document.getElementById("ust-ara");
      if (firmaInput) firmaInput.value = firmaParam;
      if (ustAra) ustAra.value = firmaParam;
    }
    if (params.get("yon")) {
      document.getElementById("filtre-yon").value = params.get("yon").toUpperCase();
    }
    if (params.get("durum")) {
      document.getElementById("filtre-durum").value = params.get("durum").toUpperCase();
    }

    await faturalariIlkYukle();

    document.getElementById("filtrele-btn").addEventListener("click", filtreUygula);
    document.getElementById("filtre-temizle-btn").addEventListener("click", filtreleriTemizle);
    document.getElementById("filtre-firma").addEventListener("input", (e) => {
      anlikAramaGuncelle(e.target.value);
    });
    document.getElementById("filtre-tarih-baslangic").addEventListener("change", filtreUygula);
    document.getElementById("filtre-tarih-bitis").addEventListener("change", filtreUygula);
    document.getElementById("filtre-yon").addEventListener("change", filtreUygula);
    document.getElementById("filtre-durum").addEventListener("change", filtreUygula);
    document.getElementById("yeni-yon").addEventListener("change", firmaPeriyotGoster);

    const ustAra = document.getElementById("ust-ara");
    if (ustAra) {
      ustAra.addEventListener("input", (e) => {
        anlikAramaGuncelle(e.target.value);
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
      const yonParam = new URLSearchParams(window.location.search).get("yon");
      if (yonParam) document.getElementById("yeni-yon").value = yonParam.toUpperCase();
      yeniFaturaModalAc();
    }

    document.getElementById("fatura-tablo-body").addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-durum-btn]");
      if (!btn) return;
      const fatura =
        filtreliFaturalar.find((f) => f.fatura_no === btn.getAttribute("data-fatura-no")) ||
        tumFaturalarHam.find((f) => f.fatura_no === btn.getAttribute("data-fatura-no"));
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
