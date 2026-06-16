const AuthService = {
  async giris(kullanici_adi, sifre) {
    const sonuc = await ApiService.istek("/auth/login", {
      method: "POST",
      body: JSON.stringify({ kullanici_adi, sifre }),
    });
    localStorage.setItem("liraflow_token", sonuc.token);
    localStorage.setItem("liraflow_kullanici", JSON.stringify(sonuc.kullanici));
    return sonuc;
  },

  async me() {
    return ApiService.istek("/auth/me");
  },

  kayitliKullanici() {
    const ham = localStorage.getItem("liraflow_kullanici");
    if (!ham) return null;
    try {
      return JSON.parse(ham);
    } catch {
      return null;
    }
  },

  cikis() {
    localStorage.removeItem("liraflow_token");
    localStorage.removeItem("liraflow_kullanici");
  },

  oturumVarMi() {
    return !!localStorage.getItem("liraflow_token");
  },
};
