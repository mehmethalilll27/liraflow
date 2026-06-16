const API = {
  async istek(atlanan_yol, secenekler = {}) {
    const cevap = await fetch(`/api${atlanan_yol}`, {
      headers: { "Content-Type": "application/json" },
      ...secenekler,
    });
    if (!cevap.ok) {
      let mesaj = "Bir hata olustu.";
      try {
        const json = await cevap.json();
        mesaj = json.detail || mesaj;
      } catch (e) {}
      throw new Error(mesaj);
    }
    return cevap.json();
  },
};
