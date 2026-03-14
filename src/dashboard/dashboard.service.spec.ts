import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';

const mockAggregateRaw = jest.fn();

const mockPrisma = {
  order: {
    aggregateRaw: mockAggregateRaw,
  },
};

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DashboardService(mockPrisma as unknown as PrismaService);
  });

  describe('getTotalRevenue', () => {
    it('deve retornar a receita total de pedidos COMPLETED', async () => {
      mockAggregateRaw.mockResolvedValue([{ totalRevenue: 1500 }]);

      const result = await service.getTotalRevenue();

      expect(result).toBe(1500);
      expect(mockAggregateRaw).toHaveBeenCalledWith(
        expect.objectContaining({
          pipeline: expect.arrayContaining([
            { $match: { status: 'COMPLETED' } },
            { $group: { _id: null, totalRevenue: { $sum: '$total' } } },
          ]),
        }),
      );
    });

    it('deve retornar 0 quando não há pedidos COMPLETED', async () => {
      mockAggregateRaw.mockResolvedValue([]);

      const result = await service.getTotalRevenue();

      expect(result).toBe(0);
    });

    it('deve retornar 0 quando resultado é nulo', async () => {
      mockAggregateRaw.mockResolvedValue(null);

      const result = await service.getTotalRevenue();

      expect(result).toBe(0);
    });
  });

  describe('getOrdersQuantityByStatus', () => {
    it('deve retornar contagem de pedidos por status', async () => {
      mockAggregateRaw.mockResolvedValue([
        { status: 'PENDING', count: 5 },
        { status: 'COMPLETED', count: 10 },
        { status: 'CANCELLED', count: 2 },
      ]);

      const result = await service.getOrdersQuantityByStatus();

      expect(result).toEqual({
        PENDING: 5,
        COMPLETED: 10,
        CANCELLED: 2,
        DRAFT: 0,
      });
    });

    it('deve retornar zeros para todos os status quando não há pedidos', async () => {
      mockAggregateRaw.mockResolvedValue([]);

      const result = await service.getOrdersQuantityByStatus();

      expect(result).toEqual({
        PENDING: 0,
        COMPLETED: 0,
        CANCELLED: 0,
        DRAFT: 0,
      });
    });

    it('deve incluir status DRAFT na contagem', async () => {
      mockAggregateRaw.mockResolvedValue([{ status: 'DRAFT', count: 3 }]);

      const result = await service.getOrdersQuantityByStatus();

      expect(result.DRAFT).toBe(3);
    });
  });

  describe('getTopFiveSellingProducts', () => {
    it('deve retornar os top 5 produtos mais vendidos', async () => {
      const topProducts = [
        {
          productId: 'prod-1',
          productName: 'Produto A',
          sku: 'SKU-A',
          totalQuantity: 50,
          totalValue: 2500,
        },
        {
          productId: 'prod-2',
          productName: 'Produto B',
          sku: 'SKU-B',
          totalQuantity: 30,
          totalValue: 1500,
        },
      ];

      mockAggregateRaw.mockResolvedValue(topProducts);

      const result = await service.getTopFiveSellingProducts();

      expect(result).toEqual(topProducts);
      expect(mockAggregateRaw).toHaveBeenCalledWith(
        expect.objectContaining({
          pipeline: expect.arrayContaining([
            { $match: { status: 'COMPLETED' } },
            { $unwind: '$items' },
            {
              $group: expect.objectContaining({
                totalValue: {
                  $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] },
                },
              }),
            },
            { $limit: 5 },
          ]),
        }),
      );
    });

    it('deve retornar array vazio quando não há produtos', async () => {
      mockAggregateRaw.mockResolvedValue([]);

      const result = await service.getTopFiveSellingProducts();

      expect(result).toEqual([]);
    });
  });

  describe('getDashboardData', () => {
    it('deve retornar todos os dados do dashboard combinados', async () => {
      mockAggregateRaw
        .mockResolvedValueOnce([{ totalRevenue: 5000 }])
        .mockResolvedValueOnce([
          { status: 'COMPLETED', count: 20 },
          { status: 'PENDING', count: 8 },
        ])
        .mockResolvedValueOnce([
          {
            productId: 'prod-1',
            productName: 'Produto A',
            sku: 'SKU-A',
            totalQuantity: 40,
            totalValue: 2000,
          },
        ]);

      const result = await service.getDashboardData();

      expect(result).toEqual({
        totalRevenue: 5000,
        ordersQuantityByStatus: {
          PENDING: 8,
          COMPLETED: 20,
          CANCELLED: 0,
          DRAFT: 0,
        },
        topSellingProducts: [
          {
            productId: 'prod-1',
            productName: 'Produto A',
            sku: 'SKU-A',
            totalQuantity: 40,
            totalValue: 2000,
          },
        ],
      });
      expect(mockAggregateRaw).toHaveBeenCalledTimes(3);
    });
  });
});
