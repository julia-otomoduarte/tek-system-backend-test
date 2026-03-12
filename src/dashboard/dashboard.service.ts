/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
    const result = await this.prisma.$runCommandRaw({
      aggregate: 'orders',
      pipeline: [
        { $match: { status: 'COMPLETED' } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalPrice' } } },
      ],
      cursor: {},
    });

    const cursor = (
      result?.cursor as { firstBatch?: { totalRevenue?: number }[] }
    )?.firstBatch;
    return cursor && cursor.length > 0 ? cursor[0].totalRevenue : 0;
  }

  async getOrdersQuantityByStatus() {
    const result = await this.prisma.$runCommandRaw({
      aggregate: 'orders',
      pipeline: [
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $project: { _id: 0, status: '$_id', count: 1 } },
      ],
      cursor: {},
    });

    const counts =
      (result?.cursor as { firstBatch?: { status: string; count: number }[] })
        ?.firstBatch ?? [];

    const statusCounts: Record<string, number> = {
      PENDING: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      DRAFT: 0,
    };

    counts.forEach((item: { status: string; count: number }) => {
      statusCounts[item.status] = item.count;
    });

    return statusCounts;
  }

  async getTopFiveSellingProducts() {
    const result = await this.prisma.$runCommandRaw({
      aggregate: 'orders',
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
              $sum: { $multiply: ['$items.quantity', '$items.price'] },
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
      cursor: {},
    });

    const topProducts =
      (result?.cursor as { firstBatch?: any[] })?.firstBatch ?? [];

    return topProducts;
  }
}