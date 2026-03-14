import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface TopSellingProduct {
  productId: string;
  productName: string;
  sku: string;
  totalQuantity: number;
  totalValue: number;
}

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboardData() {
    const [totalRevenue, ordersQuantityByStatus, topSellingProducts] =
      await Promise.all([
        this.getTotalRevenue(),
        this.getOrdersQuantityByStatus(),
        this.getTopFiveSellingProducts(),
      ]);

    return {
      totalRevenue,
      ordersQuantityByStatus,
      topSellingProducts,
    };
  }

  async getTotalRevenue() {
    const result = await this.prisma.order.aggregateRaw({
      pipeline: [
        { $match: { status: 'COMPLETED' } },
        { $group: { _id: null, totalRevenue: { $sum: '$total' } } },
      ],
    });

    const rows = (result as unknown as { totalRevenue?: number }[]) ?? [];
    return rows[0]?.totalRevenue ?? 0;
  }

  async getOrdersQuantityByStatus() {
    const rows = (await this.prisma.order.aggregateRaw({
      pipeline: [
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $project: { _id: 0, status: '$_id', count: 1 } },
      ],
    })) as unknown as { status: string; count: number }[];

    const statusCounts: Record<string, number> = {
      PENDING: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      DRAFT: 0,
    };

    rows.forEach((item) => {
      statusCounts[item.status] = item.count;
    });

    return statusCounts;
  }

  async getTopFiveSellingProducts() {
    const topProducts = (await this.prisma.order.aggregateRaw({
      pipeline: [
        { $match: { status: 'COMPLETED' } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productId',
            productName: { $first: '$items.productName' },
            sku: { $first: '$items.sku' },
            totalQuantity: { $sum: '$items.quantity' },
            totalValue: {
              $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] },
            },
          },
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 5 },
        {
          $project: {
            _id: 0,
            productId: '$_id',
            productName: 1,
            sku: 1,
            totalQuantity: 1,
            totalValue: 1,
          },
        },
      ],
    })) as unknown as TopSellingProduct[];

    return topProducts;
  }
}
