const SettingsService = {
  getir() {
    return ApiService.istek("/ayarlar");
  },
  guncelle(payload) {
    return ApiService.istek("/ayarlar", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
};

const BildirimService = {
  listele() {
    return ApiService.istek("/bildirimler");
  },
};
