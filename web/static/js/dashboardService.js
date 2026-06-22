const DashboardService = {
  dashboardGetir(gun = 30) {
    return ApiService.istek(`/dashboard?gun=${gun}`);
  },
};
