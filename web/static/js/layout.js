const Layout = {
  async oturumKontrol() {
    if (window.location.pathname === "/giris") return;
    if (!AuthService.oturumVarMi()) {
      window.location.href = "/giris";
      return;
    }
    try {
      await AuthService.me();
    } catch {
      window.location.href = "/giris";
    }
  },

  cikisYap() {
    AuthService.cikis();
    window.location.href = "/giris";
  },

  panelKapat(panelId, btnId) {
    const panel = document.getElementById(panelId);
    const btn = document.getElementById(btnId);
    if (!panel || panel.classList.contains("hidden")) return;
    if (btn && (btn === document.activeElement || btn.contains(document.activeElement))) return;
    panel.classList.add("hidden");
  },

  async bildirimleriYukle() {
    const banner = document.getElementById("bildirim-uyari-alani");
    if (banner) banner.remove();

    const badge = document.getElementById("bildirim-badge");
    const liste = document.getElementById("bildirim-liste");
    const ozet = document.getElementById("ozet-bildirim");
    if (!badge && !liste && !ozet) return;

    if (ozet) ozet.textContent = "Adjust verileri panelden takip edilir";
    if (badge) {
      badge.classList.add("hidden");
      badge.classList.remove("flex");
    }
    if (liste) liste.innerHTML = "<p>Bildirim yok — Adjust verileri panelden takip edilir.</p>";
  },

  async hesapBilgisiYukle() {
    const adEl = document.getElementById("hesap-ad");
    const unvanEl = document.getElementById("hesap-unvan");
    const basHarfEl = document.getElementById("hesap-bas-harf");
    const kisaEl = document.getElementById("hesap-ad-kisa");
    if (!adEl && !basHarfEl) return;

    let ad = "Kullanıcı";
    let unvan = "Yönetici";
    try {
      const oturum = await AuthService.me();
      ad = oturum.ad_soyad || oturum.kullanici_adi;
      unvan = oturum.unvan || unvan;
    } catch {
      const kayitli = AuthService.kayitliKullanici();
      if (kayitli) {
        ad = kayitli.ad_soyad || kayitli.kullanici_adi;
        unvan = kayitli.unvan || unvan;
      }
    }

    if (adEl) adEl.textContent = ad;
    if (unvanEl) unvanEl.textContent = unvan;
    if (basHarfEl) basHarfEl.textContent = Utils.firmaBasHarfleri(ad);
    if (kisaEl) kisaEl.textContent = ad.split(" ")[0] || "Hesabım";
  },

  globalAramaBagla() {
    // Panel araması panel.page.js içinde yönetilir (anlık filtre).
  },

  bagla() {
    this.globalAramaBagla();

    const bildirimBtn = document.getElementById("bildirim-btn");
    const bildirimPanel = document.getElementById("bildirim-panel");
    const hesapBtn = document.getElementById("hesap-btn");
    const hesapPanel = document.getElementById("hesap-panel");
    const cikisBtn = document.getElementById("cikis-btn");

    if (bildirimBtn && bildirimPanel) {
      bildirimBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        bildirimPanel.classList.toggle("hidden");
        if (hesapPanel) hesapPanel.classList.add("hidden");
      });
    }

    if (hesapBtn && hesapPanel) {
      hesapBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        hesapPanel.classList.toggle("hidden");
        if (bildirimPanel) bildirimPanel.classList.add("hidden");
      });
    }

    if (cikisBtn) {
      cikisBtn.addEventListener("click", () => this.cikisYap());
    }

    document.addEventListener("click", () => {
      if (bildirimPanel) bildirimPanel.classList.add("hidden");
      if (hesapPanel) hesapPanel.classList.add("hidden");
    });

    [bildirimPanel, hesapPanel].forEach((panel) => {
      if (panel) {
        panel.addEventListener("click", (e) => e.stopPropagation());
      }
    });
  },

  async init() {
    await this.oturumKontrol();
    this.bagla();
    try {
      await Promise.all([this.bildirimleriYukle(), this.hesapBilgisiYukle()]);
    } catch (hata) {
      console.error("Layout yüklenemedi:", hata);
    }
  },
};
