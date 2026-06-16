document.addEventListener("DOMContentLoaded", () => {
  if (AuthService.oturumVarMi()) {
    window.location.href = "/";
    return;
  }

  const form = document.getElementById("giris-form");
  const hataEl = document.getElementById("giris-hata");
  const btn = document.getElementById("giris-btn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hataEl.classList.add("hidden");
    btn.disabled = true;

    try {
      await AuthService.giris(
        document.getElementById("kullanici-adi").value.trim(),
        document.getElementById("sifre").value
      );
      sessionStorage.removeItem("panel_uyari_kapali");
      sessionStorage.removeItem("panel_uyari_acik");
      window.location.href = "/";
    } catch (hata) {
      hataEl.textContent = hata.message || "Giriş başarısız.";
      hataEl.classList.remove("hidden");
    } finally {
      btn.disabled = false;
    }
  });
});
