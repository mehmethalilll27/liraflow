const DashboardService = {
  ozetGetir() {
    return ApiService.istek("/ozet");
  },

  dashboardGetir(gun = 30) {
    return ApiService.istek(`/dashboard?gun=${gun}`);
  },
};
