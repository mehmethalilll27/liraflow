const ApiService = {
  tokenAl() {
    return localStorage.getItem("liraflow_token");
  },

  async istek(yol, secenekler = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(secenekler.headers || {}),
    };
    const token = this.tokenAl();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const cevap = await fetch(`/api${yol}`, {
      ...secenekler,
      headers,
    });

    if (cevap.status === 401 && yol !== "/auth/login") {
      AuthService.cikis();
      if (window.location.pathname !== "/giris") {
        window.location.href = "/giris";
      }
      throw new Error("Oturum süresi doldu. Lütfen tekrar giriş yapın.");
    }

    if (!cevap.ok) {
      let mesaj = "Bir hata oluştu.";
      try {
        const json = await cevap.json();
        mesaj = json.detail || mesaj;
      } catch (e) {}
      throw new Error(mesaj);
    }
    return cevap.json();
  },
};
