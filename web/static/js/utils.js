const Utils = {
  formatTRY(tutar, paraBirimi = "TRY") {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: paraBirimi || "TRY",
    }).format(tutar || 0);
  },

  formatTarih(isoTarih) {
    if (!isoTarih) return "-";
    const parca = isoTarih.split("-");
    if (parca.length !== 3) return isoTarih;
    return `${parca[2]}.${parca[1]}.${parca[0]}`;
  },

  formatTarihUzun(isoTarih) {
    if (!isoTarih) return "-";
    const tarih = new Date(isoTarih);
    if (Number.isNaN(tarih.getTime())) return isoTarih;
    return tarih.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  },

  durumEtiketi(durum) {
    const harita = {
      BEKLIYOR: {
        metin: "BEKLİYOR",
        sinif:
          "inline-flex items-center px-sm py-xs rounded-lg text-[10px] font-bold uppercase tracking-tight bg-tertiary-fixed-dim/20 text-on-tertiary-container border border-on-tertiary-container/20",
      },
      GECIKTI: {
        metin: "GECİKTİ",
        sinif:
          "inline-flex items-center px-sm py-xs rounded-lg text-[10px] font-bold uppercase tracking-tight bg-error-container text-on-error-container border border-error/20",
      },
      ODENDI: {
        metin: "ÖDENDİ",
        sinif:
          "inline-flex items-center px-sm py-xs rounded-lg text-[10px] font-bold uppercase tracking-tight bg-secondary-container/40 text-on-secondary-container border border-secondary/20",
      },
      IPTAL: {
        metin: "İPTAL",
        sinif:
          "inline-flex items-center px-sm py-xs rounded-lg text-[10px] font-bold uppercase tracking-tight bg-outline-variant/30 text-on-surface-variant border border-outline/20",
      },
    };
    const bilgi = harita[durum] || harita.BEKLIYOR;
    return `<span class="${bilgi.sinif}">${bilgi.metin}</span>`;
  },

  durumEtiketiBuyuk(durum) {
    const harita = {
      BEKLIYOR: "px-md py-xs bg-tertiary-fixed-dim/20 text-on-tertiary-container font-label-md rounded-full",
      GECIKTI: "px-md py-xs bg-error-container text-on-error-container font-label-md rounded-full",
      ODENDI: "px-md py-xs bg-secondary-container text-on-secondary-container font-label-md rounded-full",
      IPTAL: "px-md py-xs bg-outline-variant/30 text-on-surface-variant font-label-md rounded-full",
    };
    const metin = {
      BEKLIYOR: "BEKLİYOR",
      GECIKTI: "GECİKTİ",
      ODENDI: "ÖDENDİ",
      IPTAL: "İPTAL",
    };
    return `<span class="${harita[durum] || harita.BEKLIYOR}">${metin[durum] || durum}</span>`;
  },

  firmaBasHarfleri(firmaAdi) {
    if (!firmaAdi) return "?";
    const kelimeler = firmaAdi.trim().split(/\s+/);
    if (kelimeler.length >= 2) {
      return (kelimeler[0][0] + kelimeler[1][0]).toUpperCase();
    }
    return firmaAdi.slice(0, 2).toUpperCase();
  },

  oncelikNokta(oncelik) {
    const harita = {
      yuksek: "bg-error",
      orta: "bg-tertiary-fixed-dim",
      dusuk: "bg-secondary-fixed",
    };
    return harita[oncelik] || harita.orta;
  },

  oncelikMetin(oncelik) {
    const harita = { yuksek: "Yüksek", orta: "Orta", dusuk: "Düşük" };
    return harita[oncelik] || "Orta";
  },

  faturaDetayUrl(faturaNo) {
    return `/fatura-detay?no=${encodeURIComponent(faturaNo)}`;
  },

  kalanGunMetin(kalanGun, durum) {
    if (kalanGun === null || kalanGun === undefined) return "-";
    if (durum === "ODENDI") return "Ödendi";
    if (durum === "IPTAL") return "İptal";
    if (kalanGun < 0) return `${Math.abs(kalanGun)} gün gecikti`;
    if (kalanGun === 0) return "Bugün vade";
    return `${kalanGun} gün kaldı`;
  },

  vadeGunEtiketi(gun) {
    return `${gun} gün vadeli`;
  },

  periyotEtiketi(gun) {
    const normalize = gun === 10 ? 15 : gun;
    return `${normalize} günde bir`;
  },

  periyotBadge(gun) {
    const normalize = gun === 10 ? 15 : gun || 30;
    const siniflar = {
      15: "bg-error-container/40 text-on-error-container border-error/20",
      30: "bg-tertiary-fixed-dim/20 text-on-tertiary-container border-on-tertiary-container/20",
      45: "bg-secondary-container/30 text-on-secondary-container border-secondary/20",
    };
    const sinif =
      siniflar[normalize] ||
      "bg-surface-container-high text-on-surface-variant border-outline-variant/30";
    return `<span class="inline-flex items-center px-sm py-xs rounded-lg text-[10px] font-bold uppercase tracking-tight border ${sinif}">${this.periyotEtiketi(normalize)}</span>`;
  },

  odemeSiraBadge(siraNo, durum) {
    if (!siraNo || siraNo <= 0) {
      return `<span class="text-on-surface-variant text-xs">—</span>`;
    }
    const sinif =
      durum !== "ODENDI" && durum !== "IPTAL" && siraNo <= 3
        ? "bg-primary text-on-primary"
        : "bg-surface-container-high text-on-surface-variant";
    return `<span class="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${sinif}">${siraNo}</span>`;
  },

  csvIndir(dosyaAdi, basliklar, satirlar) {
    const csv = [basliklar.join(";"), ...satirlar.map((s) => s.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = dosyaAdi;
    link.click();
    URL.revokeObjectURL(link.href);
  },
};
