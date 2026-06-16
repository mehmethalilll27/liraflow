const durumFiltreEl = document.getElementById("durum-filtre");
const firmaAraEl = document.getElementById("firma-ara");
const filtreleBtn = document.getElementById("filtrele-btn");
const temizleBtn = document.getElementById("temizle-btn");
const faturaBodyEl = document.getElementById("fatura-tablo-body");

function durumSecenekleriSecili(mevcutDurum) {
  const durumlar = ["BEKLIYOR", "GECIKTI", "ODENDI", "IPTAL"];
  return `
    <select data-durum-guncelle>
      ${durumlar
        .map((d) => `<option value="${d}" ${d === mevcutDurum ? "selected" : ""}>${d}</option>`)
        .join("")}
    </select>
  `;
}

function satirlariCiz(faturalar) {
  if (!faturalar.length) {
    faturaBodyEl.innerHTML = `<tr><td colspan="6">Kayit bulunamadi.</td></tr>`;
    return;
  }
  faturaBodyEl.innerHTML = faturalar
    .map(
      (f) => `
    <tr>
      <td>${f.fatura_no}</td>
      <td>${f.firma_adi}</td>
      <td>${f.durum}</td>
      <td>${new Intl.NumberFormat("tr-TR", { style: "currency", currency: f.para_birimi || "TRY" }).format(f.tutar || 0)}</td>
      <td>${f.vade_tarihi}</td>
      <td>
        ${durumSecenekleriSecili(f.durum)}
        <button data-fatura-no="${f.fatura_no}" data-kaydet-durum>Kaydet</button>
      </td>
    </tr>
  `
    )
    .join("");
}

async function faturalariYukle() {
  const durum = durumFiltreEl.value;
  const firma_adi = firmaAraEl.value.trim();
  const query = new URLSearchParams();
  if (durum) query.set("durum", durum);
  if (firma_adi) query.set("firma_adi", firma_adi);

  try {
    const yol = query.toString() ? `/faturalar?${query.toString()}` : "/faturalar";
    const faturalar = await API.istek(yol);
    satirlariCiz(faturalar);
  } catch (hata) {
    durumMesajiEl.textContent = `Faturalar yuklenemedi: ${hata.message}`;
  }
}

async function faturaDurumGuncelle(buttonEl) {
  const tr = buttonEl.closest("tr");
  const select = tr.querySelector("[data-durum-guncelle]");
  const yeniDurum = select.value;
  const faturaNo = buttonEl.getAttribute("data-fatura-no");

  try {
    await API.istek(`/faturalar/${encodeURIComponent(faturaNo)}/durum`, {
      method: "PATCH",
      body: JSON.stringify({ durum: yeniDurum }),
    });
    durumMesajiEl.textContent = `${faturaNo} durumu guncellendi.`;
    await ozetiYukle();
    await faturalariYukle();
  } catch (hata) {
    durumMesajiEl.textContent = `Durum guncellenemedi: ${hata.message}`;
  }
}

filtreleBtn.addEventListener("click", faturalariYukle);
temizleBtn.addEventListener("click", async () => {
  durumFiltreEl.value = "";
  firmaAraEl.value = "";
  await faturalariYukle();
});

faturaBodyEl.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-kaydet-durum]");
  if (!btn) return;
  faturaDurumGuncelle(btn);
});
