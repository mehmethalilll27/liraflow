const AdjustService = {
  durumGetir() {
    return ApiService.istek("/adjust/durum");
  },

  senkronize(gun = null) {
    const query = gun ? `?gun=${gun}` : "";
    return ApiService.istek(`/adjust/sync${query}`, { method: "POST" });
  },
};

const HareketService = {
  listele({ gun = null, yon = null, partner = null } = {}) {
    const params = new URLSearchParams();
    if (gun) params.set("gun", String(gun));
    if (yon) params.set("yon", yon);
    if (partner) params.set("partner", partner);
    const query = params.toString();
    return ApiService.istek(`/hareketler${query ? `?${query}` : ""}`);
  },
};
