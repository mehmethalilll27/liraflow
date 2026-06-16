let seciliFirma = null;
let tumFirmalar = [];
let filtreliFirmalar = [];
let firmaSayfa = 1;
const FIRMA_SAYFA_BASINA = 10;

function firmaSatirCiz(firma) {
  const baslik = Utils.firmaBasHarfleri(firma.firma_adi);
  const aktif = firma.aktif_mi !== false;
  const vadeGun = firma.odeme_periyodu_gun || firma.odeme_vadesi_gun || 30;
  return `
    <tr class="hover:bg-surface-container-low transition-all cursor-pointer group" data-firma-adi="${firma.firma_adi}">
      <td class="px-xl py-lg">
        <div class="flex items-center gap-md">
          <div class="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center font-bold text-primary">${baslik}</div>
          <div>
            <p class="font-bold text-body-md text-on-surface">${firma.firma_adi}</p>
            <p class="text-label-md text-on-surface-variant">${Utils.periyotEtiketi(vadeGun)}</p>
          </div>
        </div>
      </td>
      <td class="px-xl py-lg">
        <p class="text-body-md text-on-surface">${firma.eposta || "-"}</p>
        <p class="text-label-md text-on-surface-variant">${firma.telefon || "-"}</p>
      </td>
      <td class="px-xl py-lg font-mono-data text-on-surface">${Utils.formatTRY(firma.toplam_borc)}</td>
      <td class="px-xl py-lg font-mono-data text-secondary">${Utils.formatTRY(firma.toplam_odenen)}</td>
      <td class="px-xl py-lg font-mono-data text-error">${Utils.formatTRY(firma.toplam_geciken)}</td>
      <td class="px-xl py-lg">
        <span class="px-3 py-1 rounded-full ${aktif ? "bg-secondary-container/30 text-on-secondary-container" : "bg-outline-variant/30 text-on-surface-variant"} text-label-md font-bold">
          ${aktif ? "Aktif" : "Pasif"}
        </span>
      </td>
      <td class="px-xl py-lg">
        <button type="button" class="p-2 rounded-full hover:bg-surface-container-highest opacity-0 group-hover:opacity-100 transition-opacity" data-duzenle>
          <span class="material-symbols-outlined">edit</span>
        </button>
      </td>
    </tr>
  `;
}

function ozetKartlariniGuncelle(firmalar) {
  const sayac = document.getElementById("firma-sayac");
  if (sayac) {
    const toplamSayfa = Math.max(1, Math.ceil(firmalar.length / FIRMA_SAYFA_BASINA));
    sayac.textContent = `Toplam ${firmalar.length} firma • Sayfa ${firmaSayfa}/${toplamSayfa}`;
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
    body.innerHTML = `<tr><td colspan="7" class="px-xl py-lg text-center text-on-surface-variant">Kayıt bulunamadı.</td></tr>`;
    firmaSayfalamaCiz();
    return;
  }
  const basla = (firmaSayfa - 1) * FIRMA_SAYFA_BASINA;
  const sayfaVeri = firmalar.slice(basla, basla + FIRMA_SAYFA_BASINA);
  body.innerHTML = sayfaVeri.map(firmaSatirCiz).join("");
  firmaSayfalamaCiz();
}

function drawerAc(firma = null) {
  const drawer = document.getElementById("editDrawer");
  const backdrop = document.getElementById("drawerBackdrop");
  const baslik = document.getElementById("drawerBaslik");
  const kaydetBtn = document.getElementById("drawerKaydetBtn");

  seciliFirma = firma;
  if (firma) {
    baslik.textContent = "Firma Düzenle";
    kaydetBtn.textContent = "Kaydet";
    document.getElementById("drawerFirmaId").textContent = `ID: #${firma.firma_id}`;
    document.getElementById("inputFirmaAd").value = firma.firma_adi || "";
    document.getElementById("inputEmail").value = firma.eposta || "";
    document.getElementById("inputTel").value = firma.telefon || "";
    document.getElementById("inputYetkili").value = firma.yetkili_kisi || "";
    document.getElementById("inputVergiNo").value = firma.vergi_no || "";
    document.getElementById("inputAdres").value = firma.adres || "";
    document.getElementById("inputVadeGun").value = String(firma.odeme_periyodu_gun || firma.odeme_vadesi_gun || 30);
  } else {
    baslik.textContent = "Yeni Firma Ekle";
    kaydetBtn.textContent = "Kaydet";
    document.getElementById("drawerFirmaId").textContent = "Yeni kayıt";
    document.getElementById("inputFirmaAd").value = "";
    document.getElementById("inputEmail").value = "";
    document.getElementById("inputTel").value = "";
    document.getElementById("inputYetkili").value = "";
    document.getElementById("inputVergiNo").value = "";
    document.getElementById("inputAdres").value = "";
    document.getElementById("inputVadeGun").value = "30";
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

function toastGoster(_mesaj) {}

function formPayload() {
  return {
    firma_adi: document.getElementById("inputFirmaAd").value.trim(),
    eposta: document.getElementById("inputEmail").value.trim(),
    telefon: document.getElementById("inputTel").value.trim(),
    yetkili_kisi: document.getElementById("inputYetkili").value.trim(),
    vergi_no: document.getElementById("inputVergiNo").value.trim(),
    adres: document.getElementById("inputAdres").value.trim(),
    odeme_periyodu_gun: parseInt(document.getElementById("inputVadeGun").value, 10),
  };
}

async function firmalariYukle(arama = "") {
  tumFirmalar = await FirmService.listele();
  let liste = tumFirmalar;
  if (arama) {
    const hedef = arama.trim().toLowerCase();
    liste = tumFirmalar.filter((f) => f.firma_adi.toLowerCase().startsWith(hedef));
  }
  filtreliFirmalar = liste;
  firmaSayfa = 1;
  ozetKartlariniGuncelle(filtreliFirmalar);
  tabloyuCiz(filtreliFirmalar);
}

async function firmaKaydet() {
  const payload = formPayload();
  if (!payload.firma_adi) {
    alert("Firma adı zorunludur.");
    return;
  }

  if (seciliFirma) {
    await FirmService.guncelle(seciliFirma.firma_adi, payload);
    toastGoster("Firma güncellendi.");
  } else {
    await FirmService.ekle(payload);
    toastGoster("Firma eklendi.");
  }

  drawerKapat();
  await firmalariYukle(document.getElementById("firma-ara").value);
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
    document.getElementById("firma-ara").addEventListener("input", (e) => firmalariYukle(e.target.value));
    document.getElementById("firma-onceki").addEventListener("click", () => {
      if (firmaSayfa <= 1) return;
      firmaSayfa -= 1;
      ozetKartlariniGuncelle(filtreliFirmalar);
      tabloyuCiz(filtreliFirmalar);
    });
    document.getElementById("firma-sonraki").addEventListener("click", () => {
      const toplamSayfa = Math.max(1, Math.ceil(filtreliFirmalar.length / FIRMA_SAYFA_BASINA));
      if (firmaSayfa >= toplamSayfa) return;
      firmaSayfa += 1;
      ozetKartlariniGuncelle(filtreliFirmalar);
      tabloyuCiz(filtreliFirmalar);
    });

    document.getElementById("firma-tablo-body").addEventListener("click", (e) => {
      const satir = e.target.closest("tr[data-firma-adi]");
      if (!satir) return;
      const firma = tumFirmalar.find((f) => f.firma_adi === satir.getAttribute("data-firma-adi"));
      if (firma) drawerAc(firma);
    });
  } catch (hata) {
    alert(`Veri yüklenemedi: ${hata.message}`);
  }
});
