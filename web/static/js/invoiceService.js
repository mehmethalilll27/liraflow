const InvoiceService = {
  listele({ durum, firma_adi } = {}) {
    const query = new URLSearchParams();
    if (durum) query.set("durum", durum);
    if (firma_adi) query.set("firma_adi", firma_adi);
    const ek = query.toString() ? `?${query.toString()}` : "";
    return ApiService.istek(`/faturalar${ek}`);
  },

  getir(faturaNo) {
    return ApiService.istek(`/faturalar/${encodeURIComponent(faturaNo)}`);
  },

  durumGuncelle(faturaNo, durum, odeme_tarihi = null) {
    return ApiService.istek(`/faturalar/${encodeURIComponent(faturaNo)}/durum`, {
      method: "PATCH",
      body: JSON.stringify({ durum, odeme_tarihi }),
    });
  },

  ekle(payload) {
    return ApiService.istek("/faturalar", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  odemeKaydet(faturaNo, payload) {
    return ApiService.istek(`/faturalar/${encodeURIComponent(faturaNo)}/odeme`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  arsivle(faturaNo) {
    return ApiService.istek(`/faturalar/${encodeURIComponent(faturaNo)}/arsiv`, {
      method: "PATCH",
    });
  },

  sil(faturaNo) {
    return ApiService.istek(`/faturalar/${encodeURIComponent(faturaNo)}`, {
      method: "DELETE",
    });
  },
};
