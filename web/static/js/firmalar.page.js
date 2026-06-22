let seciliFirma = null;
let tumFirmalar = [];
let filtreliFirmalar = [];
let firmaSayfa = 1;
const FIRMA_SAYFA_BASINA = 10;

function filtreDegerleri() {
  return {
    arama: (document.getElementById("firma-ara")?.value || "").trim().toLowerCase(),
    tip: document.getElementById("filtre-tip")?.value || "",
    aktif: document.getElementById("filtre-aktif")?.value || "",
  };
}

function firmaFiltreUygun(firma, filtre) {
  if (filtre.arama && !firma.firma_adi.toLowerCase().includes(filtre.arama)) return false;
  if (filtre.tip && (firma.firma_tipi || "BOS") !== filtre.tip) return false;
  if (filtre.aktif === "aktif" && firma.aktif_mi === false) return false;
  if (filtre.aktif === "pasif" && firma.aktif_mi !== false) return false;
  return true;
}

function paraBirimi(firma) {
  return firma.para_birimi || "USD";
}

function firmaSatirCiz(firma) {
  const baslik = Utils.firmaBasHarfleri(firma.firma_adi);
  const aktif = firma.aktif_mi !== false;
  const net = Utils.netPozisyonGoster(firma.net_pozisyon || 0);
  const pb = paraBirimi(firma);
  const hareketAdet = firma.hareket_adedi || 0;

  return `
    <tr class="hover:bg-surface-container-low transition-all cursor-pointer group" data-firma-adi="${firma.firma_adi}">
      <td class="px-xl py-lg">
        <div class="flex items-center gap-md">
          <div class="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center font-bold text-primary">${baslik}</div>
          <div>
            <div class="flex items-center gap-sm flex-wrap">
              <p class="font-bold text-body-md text-on-surface">${firma.firma_adi}</p>
              ${Utils.firmaTipiEtiketi(firma.firma_tipi || "BOS")}
            </div>
            <p class="text-label-md text-on-surface-variant">Adjust partner</p>
          </div>
        </div>
      </td>
      <td class="px-xl py-lg">
        <p class="text-body-md text-on-surface">${firma.eposta || "-"}</p>
        <p class="text-label-md text-on-surface-variant">${firma.telefon || "-"}</p>
      </td>
      <td class="px-xl py-lg font-mono-data text-error text-right font-bold">${Utils.formatTRY(firma.toplam_harcama || firma.acik_gider || 0, pb)}</td>
      <td class="px-xl py-lg font-mono-data text-secondary text-right font-bold">${Utils.formatTRY(firma.toplam_gelir || firma.acik_gelir || 0, pb)}</td>
      <td class="px-xl py-lg font-mono-data text-right ${net.sinif}">${net.metin}</td>
      <td class="px-xl py-lg font-mono-data text-right text-on-surface-variant">${hareketAdet}</td>
      <td class="px-xl py-lg">
        <span class="px-3 py-1 rounded-full ${aktif ? "bg-secondary-container/30 text-on-secondary-container" : "bg-outline-variant/30 text-on-surface-variant"} text-label-md font-bold">
          ${aktif ? "Aktif" : "Pasif"}
        </span>
      </td>
      <td class="px-xl py-lg text-center">
        <div class="flex items-center justify-center gap-1">
          <button type="button" class="p-2 rounded-full hover:bg-surface-container-highest opacity-0 group-hover:opacity-100 transition-opacity" data-harcamalar title="Harcamaları gör">
            <span class="material-symbols-outlined text-md">payments</span>
          </button>
          <button type="button" class="p-2 rounded-full hover:bg-surface-container-highest opacity-0 group-hover:opacity-100 transition-opacity" data-duzenle title="Düzenle">
            <span class="material-symbols-outlined text-md">edit</span>
          </button>
        </div>
      </td>
    </tr>
  `;
}

function ustOzetKartlariGuncelle(firmalar) {
  let harcama = 0;
  let gelir = 0;
  firmalar.forEach((f) => {
    harcama += f.toplam_harcama || f.acik_gider || 0;
    gelir += f.toplam_gelir || f.acik_gelir || 0;
  });
  const net = gelir - harcama;

  const giderEl = document.getElementById("ozet-acik-gider");
  const gelirEl = document.getElementById("ozet-acik-gelir");
  const netEl = document.getElementById("ozet-net-pozisyon");
  const partnerEl = document.getElementById("ozet-partner-sayisi");

  if (giderEl) giderEl.textContent = Utils.formatTRY(harcama, "USD");
  if (gelirEl) gelirEl.textContent = Utils.formatTRY(gelir, "USD");
  if (netEl) {
    const n = Utils.netPozisyonGoster(net);
    netEl.textContent = n.metin;
    netEl.className = `font-headline-md text-headline-md font-bold mt-sm ${n.sinif}`;
  }
  if (partnerEl) partnerEl.textContent = String(firmalar.length);

  const sayac = document.getElementById("firma-sayac");
  if (sayac) {
    const toplamSayfa = Math.max(1, Math.ceil(firmalar.length / FIRMA_SAYFA_BASINA));
    sayac.textContent = `${firmalar.length} partner listeleniyor · Sayfa ${firmaSayfa}/${toplamSayfa}`;
  }
}

function firmaSayfalamaCiz() {
  const butonlar = document.getElementById("firma-sayfa-butonlari");
  const onceki = document.getElementById("firma-onceki");
  const sonraki = document.getElementById("firma-sonraki");
  if (!butonlar || !onceki || !sonraki) return;

  const toplamSayfa = Math.max(1, Math.ceil(filtreliFirmalar.length / FIRMA_SAYFA_BASINA));
  const baslangic = Math.max(1, firmaSayfa - 1);
  const bitis = Math.min(toplamSayfa, baslangic + 2);

  onceki.disabled = firmaSayfa <= 1;
  onceki.classList.toggle("opacity-40", onceki.disabled);
  sonraki.disabled = firmaSayfa >= toplamSayfa;
  sonraki.classList.toggle("opacity-40", sonraki.disabled);

  butonlar.innerHTML = "";
  for (let s = baslangic; s <= bitis; s += 1) {
    const secili = s === firmaSayfa;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = String(s);
    btn.className = secili
      ? "w-8 h-8 flex items-center justify-center rounded bg-primary text-on-primary font-bold text-label-md"
      : "w-8 h-8 flex items-center justify-center rounded border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-all";
    btn.addEventListener("click", () => {
      firmaSayfa = s;
      tabloyuCiz(filtreliFirmalar);
    });
    butonlar.appendChild(btn);
  }
}

function tabloyuCiz(firmalar) {
  const body = document.getElementById("firma-tablo-body");
  if (!firmalar.length) {
    body.innerHTML = `<tr><td colspan="8" class="px-xl py-lg text-center text-on-surface-variant">Partner bulunamadı. Adjust senkronu sonrası otomatik eklenir.</td></tr>`;
    firmaSayfalamaCiz();
    return;
  }
  const basla = (firmaSayfa - 1) * FIRMA_SAYFA_BASINA;
  const sayfaVeri = firmalar.slice(basla, basla + FIRMA_SAYFA_BASINA);
  body.innerHTML = sayfaVeri.map(firmaSatirCiz).join("");
  firmaSayfalamaCiz();
}

function drawerFinansGuncelle(firma) {
  const ozetKutu = document.getElementById("drawerFinansOzet");
  const sonKutu = document.getElementById("drawerSonHareketler");
  if (!firma || !ozetKutu) return;

  const pb = paraBirimi(firma);
  ozetKutu.classList.remove("hidden");
  document.getElementById("drawerAcikGider").textContent = Utils.formatTRY(
    firma.toplam_harcama || firma.acik_gider || 0,
    pb
  );
  document.getElementById("drawerAcikGelir").textContent = Utils.formatTRY(
    firma.toplam_gelir || firma.acik_gelir || 0,
    pb
  );
  const net = Utils.netPozisyonGoster(firma.net_pozisyon || 0);
  const netEl = document.getElementById("drawerNet");
  netEl.textContent = net.metin;
  netEl.className = `font-mono-data font-bold ${net.sinif}`;
  document.getElementById("drawerGeciken").textContent = String(firma.hareket_adedi || 0);

  const linkler = document.getElementById("drawerHareketLinkleri");
  const enc = encodeURIComponent(firma.firma_adi);
  linkler.innerHTML = `
    <a href="/harcamalar?partner=${enc}" class="text-xs font-semibold text-primary hover:underline">Tüm hareketler</a>
  `;

  const liste = document.getElementById("drawerSonHareketlerListe");
  const son = firma.son_hareketler || [];
  if (!son.length) {
    sonKutu.classList.add("hidden");
    liste.innerHTML = "";
  } else {
    sonKutu.classList.remove("hidden");
    liste.innerHTML = son
      .map(
        (h) => `
      <div class="flex items-center justify-between py-xs px-sm rounded-lg bg-surface-container-low/50">
        <span class="font-semibold text-on-surface">${Utils.formatTarih(h.tarih)} · ${Utils.yonEtiketi(h.yon || "GIDER")}</span>
        <span class="font-mono-data text-sm">${Utils.formatTRY(h.tutar, h.para_birimi || pb)}</span>
      </div>`
      )
      .join("");
  }
}

function drawerAc(firma = null) {
  const drawer = document.getElementById("editDrawer");
  const backdrop = document.getElementById("drawerBackdrop");
  const baslik = document.getElementById("drawerBaslik");
  const kaydetBtn = document.getElementById("drawerKaydetBtn");

  seciliFirma = firma;
  const ozetKutu = document.getElementById("drawerFinansOzet");
  const sonKutu = document.getElementById("drawerSonHareketler");

  if (firma) {
    baslik.textContent = "Partner Düzenle";
    kaydetBtn.textContent = "Kaydet";
    document.getElementById("drawerFirmaId").textContent = `ID: #${firma.firma_id} · ${firma.firma_tipi || "BOS"}`;
    document.getElementById("inputFirmaAd").value = firma.firma_adi || "";
    document.getElementById("inputEmail").value = firma.eposta || "";
    document.getElementById("inputTel").value = firma.telefon || "";
    document.getElementById("inputYetkili").value = firma.yetkili_kisi || "";
    document.getElementById("inputVergiNo").value = firma.vergi_no || "";
    document.getElementById("inputAdres").value = firma.adres || "";
    document.getElementById("inputNotlar").value = firma.notlar || "";
    drawerFinansGuncelle(firma);
  } else {
    baslik.textContent = "Yeni Partner Ekle";
    kaydetBtn.textContent = "Kaydet";
    document.getElementById("drawerFirmaId").textContent = "Yeni kayıt";
    document.getElementById("inputFirmaAd").value = "";
    document.getElementById("inputEmail").value = "";
    document.getElementById("inputTel").value = "";
    document.getElementById("inputYetkili").value = "";
    document.getElementById("inputVergiNo").value = "";
    document.getElementById("inputAdres").value = "";
    document.getElementById("inputNotlar").value = "";
    ozetKutu?.classList.add("hidden");
    sonKutu?.classList.add("hidden");
  }

  backdrop.classList.remove("hidden");
  setTimeout(() => {
    drawer.classList.remove("translate-x-full");
    drawer.classList.add("translate-x-0");
    backdrop.classList.remove("opacity-0");
  }, 10);
}

function drawerKapat() {
  const drawer = document.getElementById("editDrawer");
  const backdrop = document.getElementById("drawerBackdrop");
  drawer.classList.remove("translate-x-0");
  drawer.classList.add("translate-x-full");
  backdrop.classList.add("opacity-0");
  setTimeout(() => backdrop.classList.add("hidden"), 300);
  seciliFirma = null;
}

function formPayload() {
  return {
    firma_adi: document.getElementById("inputFirmaAd").value.trim(),
    eposta: document.getElementById("inputEmail").value.trim(),
    telefon: document.getElementById("inputTel").value.trim(),
    yetkili_kisi: document.getElementById("inputYetkili").value.trim(),
    vergi_no: document.getElementById("inputVergiNo").value.trim(),
    adres: document.getElementById("inputAdres").value.trim(),
    notlar: document.getElementById("inputNotlar").value.trim(),
  };
}

function filtreUygula() {
  const filtre = filtreDegerleri();
  filtreliFirmalar = tumFirmalar.filter((f) => firmaFiltreUygun(f, filtre));
  filtreliFirmalar.sort(
    (a, b) =>
      (b.toplam_harcama || 0) + (b.toplam_gelir || 0) - ((a.toplam_harcama || 0) + (a.toplam_gelir || 0))
  );
  firmaSayfa = 1;
  ustOzetKartlariGuncelle(filtreliFirmalar);
  tabloyuCiz(filtreliFirmalar);
}

function filtreleriTemizle() {
  document.getElementById("firma-ara").value = "";
  document.getElementById("filtre-tip").value = "";
  document.getElementById("filtre-aktif").value = "";
  filtreUygula();
}

async function firmalariYukle() {
  tumFirmalar = await FirmService.listele();
  filtreUygula();
}

async function firmaKaydet() {
  const payload = formPayload();
  if (!payload.firma_adi) {
    alert("Partner adı zorunludur.");
    return;
  }

  if (seciliFirma) {
    await FirmService.guncelle(seciliFirma.firma_adi, payload);
  } else {
    await FirmService.ekle(payload);
  }

  drawerKapat();
  await firmalariYukle();
}

function harcamalaraGit(firmaAdi) {
  window.location.href = `/harcamalar?partner=${encodeURIComponent(firmaAdi)}`;
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await Layout.init();
    await firmalariYukle();

    document.getElementById("yeni-firma-btn").addEventListener("click", () => drawerAc(null));
    document.getElementById("drawerKapatBtn").addEventListener("click", drawerKapat);
    document.getElementById("drawerBackdrop").addEventListener("click", drawerKapat);
    document.getElementById("drawerIptalBtn").addEventListener("click", drawerKapat);
    document.getElementById("drawerKaydetBtn").addEventListener("click", firmaKaydet);
    document.getElementById("firma-ara").addEventListener("input", filtreUygula);
    document.getElementById("filtre-tip").addEventListener("change", filtreUygula);
    document.getElementById("filtre-aktif").addEventListener("change", filtreUygula);
    document.getElementById("filtre-temizle-btn").addEventListener("click", filtreleriTemizle);

    document.getElementById("firma-onceki").addEventListener("click", () => {
      if (firmaSayfa <= 1) return;
      firmaSayfa -= 1;
      tabloyuCiz(filtreliFirmalar);
    });
    document.getElementById("firma-sonraki").addEventListener("click", () => {
      const toplamSayfa = Math.max(1, Math.ceil(filtreliFirmalar.length / FIRMA_SAYFA_BASINA));
      if (firmaSayfa >= toplamSayfa) return;
      firmaSayfa += 1;
      tabloyuCiz(filtreliFirmalar);
    });

    document.getElementById("firma-tablo-body").addEventListener("click", (e) => {
      const duzenle = e.target.closest("[data-duzenle]");
      const harcamalar = e.target.closest("[data-harcamalar]");
      const satir = e.target.closest("tr[data-firma-adi]");
      if (!satir) return;
      const firmaAdi = satir.getAttribute("data-firma-adi");
      const firma = tumFirmalar.find((f) => f.firma_adi === firmaAdi);
      if (duzenle && firma) {
        e.stopPropagation();
        drawerAc(firma);
        return;
      }
      if (harcamalar) {
        e.stopPropagation();
        harcamalaraGit(firmaAdi);
        return;
      }
      harcamalaraGit(firmaAdi);
    });
  } catch (hata) {
    alert(`Veri yüklenemedi: ${hata.message}`);
  }
});
