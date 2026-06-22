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

  firmaBasHarfleri(firmaAdi) {
    if (!firmaAdi) return "?";
    const kelimeler = firmaAdi.trim().split(/\s+/);
    if (kelimeler.length >= 2) {
      return (kelimeler[0][0] + kelimeler[1][0]).toUpperCase();
    }
    return firmaAdi.slice(0, 2).toUpperCase();
  },

  harcamalarUrl(partner) {
    return `/harcamalar?partner=${encodeURIComponent(partner)}`;
  },

  periyotSinirla(gun) {
    const n = parseInt(gun, 10);
    if (!Number.isFinite(n) || n < 1) return 30;
    return Math.min(365, n);
  },

  yonEtiketi(yon) {
    const harita = {
      GELIR: {
        metin: "GELİR",
        sinif: "bg-secondary-container/40 text-on-secondary-container border-secondary/20",
      },
      GIDER: {
        metin: "GİDER",
        sinif: "bg-error-container/30 text-on-error-container border-error/20",
      },
    };
    const bilgi = harita[yon] || harita.GIDER;
    return `<span class="inline-flex items-center px-sm py-xs rounded-lg text-[10px] font-bold uppercase tracking-tight border ${bilgi.sinif}">${bilgi.metin}</span>`;
  },

  firmaTipiEtiketi(tip) {
    const harita = {
      TEDARIKCI: {
        metin: "Tedarikçi",
        sinif: "bg-error-container/30 text-on-error-container border-error/20",
      },
      MUSTERI: {
        metin: "Müşteri",
        sinif: "bg-secondary-container/40 text-on-secondary-container border-secondary/20",
      },
      KARMA: {
        metin: "Karma",
        sinif: "bg-primary-container/30 text-on-primary-container border-primary/20",
      },
      BOS: {
        metin: "Yeni",
        sinif: "bg-outline-variant/20 text-on-surface-variant border-outline-variant",
      },
    };
    const bilgi = harita[tip] || harita.BOS;
    return `<span class="inline-flex items-center px-sm py-xs rounded-lg text-[10px] font-bold uppercase tracking-tight border ${bilgi.sinif}">${bilgi.metin}</span>`;
  },

  netPozisyonGoster(net) {
    if (net > 0) {
      return { metin: `+${this.formatTRY(net)}`, sinif: "text-secondary font-bold" };
    }
    if (net < 0) {
      return { metin: `−${this.formatTRY(Math.abs(net))}`, sinif: "text-error font-bold" };
    }
    return { metin: this.formatTRY(0), sinif: "text-on-surface-variant" };
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
