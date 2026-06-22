const FirmService = {
  listele() {
    return ApiService.istek("/firmalar");
  },

  getir(firmaAdi) {
    return ApiService.istek(`/firmalar/${encodeURIComponent(firmaAdi)}`);
  },

  ekle(payload) {
    return ApiService.istek("/firmalar", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  guncelle(firmaAdi, payload) {
    return ApiService.istek(`/firmalar/${encodeURIComponent(firmaAdi)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
};
