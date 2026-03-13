import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

const mockDashboardService = {
  getDashboardData: jest.fn(),
};

const makeDashboardData = (overrides = {}) => ({
  totalRevenue: 5000,
  ordersQuantityByStatus: {
    PENDING: 8,
    COMPLETED: 20,
    CANCELLED: 2,
    DRAFT: 3,
  },
  topSellingProducts: [
    { productId: 'prod-1', productName: 'Produto A', sku: 'SKU-A', totalQuantity: 40, totalValue: 2000 },
  ],
  ...overrides,
});

describe('DashboardController', () => {
  let controller: DashboardController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new DashboardController(
      mockDashboardService as unknown as DashboardService,
    );
  });

  describe('getDashboardData', () => {
    it('deve retornar os dados do dashboard', async () => {
      const data = makeDashboardData();
      mockDashboardService.getDashboardData.mockResolvedValue(data);

      const result = await controller.getDashboardData();

      expect(mockDashboardService.getDashboardData).toHaveBeenCalledTimes(1);
      expect(result).toEqual(data);
    });

    it('deve retornar receita zero quando não há pedidos', async () => {
      const data = makeDashboardData({ totalRevenue: 0 });
      mockDashboardService.getDashboardData.mockResolvedValue(data);

      const result = await controller.getDashboardData();

      expect(result.totalRevenue).toBe(0);
    });

    it('deve repassar erros lançados pelo serviço', async () => {
      mockDashboardService.getDashboardData.mockRejectedValue(
        new Error('Erro interno'),
      );

      await expect(controller.getDashboardData()).rejects.toThrow('Erro interno');
    });
  });
});
