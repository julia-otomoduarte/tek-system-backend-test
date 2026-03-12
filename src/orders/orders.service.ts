import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrderDto } from './dto/list-order.dto';
import { UpdateOrderDto, UpdateOrderStatusDto } from './dto/update-order.dto';
import { OrderItemDto } from './dto/order-item.dto';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async getAllOrders(filter: ListOrderDto) {
    const where: any = {};

    if (filter.orderNumber) {
      where.orderNumber = { contains: filter.orderNumber };
    }
    if (filter.customerId) {
      where.customerId = filter.customerId;
    }
    if (filter.total_gte !== undefined || filter.total_lte !== undefined) {
      where.total = {};
      if (filter.total_gte !== undefined) {
        where.total.gte = filter.total_gte;
      }
      if (filter.total_lte !== undefined) {
        where.total.lte = filter.total_lte;
      }
    }
    if (filter.status) {
      where.status = filter.status;
    }

    return this.prisma.order.findMany({ where });
  }

  async getOrderById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new Error('Pedido não encontrado');
    }
    return order;
  }

  private async generateOrderNumber(): Promise<string> {
    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.orderCounter.findFirst();
      if (existing) {
        return tx.orderCounter.update({
          where: { id: existing.id },
          data: { counter: { increment: 1 } },
        });
      }
      return tx.orderCounter.create({ data: { counter: 1 } });
    });

    return `TK-${result.counter}`;
  }

  private async prepareOrderItemsPayload(items: OrderItemDto[]) {
    const orderItems = [];
    const productMap = new Map<string, any>();

    for (const item of items) {
      let product = productMap.get(item.productId);
      if (!product) {
        product = await this.prisma.product.findUnique({
          where: { id: item.productId },
        });
        if (!product)
          throw new Error(`Produto #${item.productId} não encontrado`);
        productMap.set(item.productId, product);
      }

      const totalQty =
        (orderItems.find((product) => product.productId === item.productId)
          ?.quantity || 0) + item.quantity;

      if (totalQty > product.stock) {
        throw new Error(
          `Estoque insuficiente para o produto "${product.name}". Disponível: ${product.stock}`,
        );
      }

      orderItems.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        quantity: item.quantity,
        unitPrice: product.price,
      });
    }

    const total = orderItems.reduce<number>(
      (sum, item) => sum + (item.unitPrice * item.quantity || 0),
      0,
    );
    return { orderItems, total };
  }

  async createOrder(data: CreateOrderDto) {
    const { customerId, items } = data;

    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new Error('Cliente não encontrado');
    }

    const { orderItems, total } = await this.prepareOrderItemsPayload(items);

    const orderNumber = await this.generateOrderNumber();

    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        customerId,
        total,
        items: orderItems,
        status: 'DRAFT',
      },
      include: { customer: true },
    });
    return order;
  }

  async updateOrder(id: string, data: UpdateOrderDto) {
    const order = await this.getOrderById(id);

    if (order.status === 'COMPLETED' || order.status === 'CANCELED') {
      throw new Error(
        'Apenas pedidos em rascunho ou pendentes podem ser editados',
      );
    }

    const { items, customerId } = data;

    if (customerId) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer) {
        throw new Error('Cliente não encontrado');
      }
    }

    const updateData: any = {};

    if (customerId) updateData.customerId = customerId;

    if (items) {
      const existingItems: any[] = order.items as any[];
      const keptItems = [];
      const newItemDtos: OrderItemDto[] = [];

      for (const item of items) {
        const existing = existingItems.find(
          (product) => product.productId === item.productId,
        );
        if (existing) {
          keptItems.push({ ...existing, quantity: item.quantity });
        } else {
          newItemDtos.push(item);
        }
      }

      const { orderItems: newItems } =
        newItemDtos.length > 0
          ? await this.prepareOrderItemsPayload(newItemDtos)
          : { orderItems: [] };

      const mergedItems = [...keptItems, ...newItems];

      updateData.items = mergedItems;
      updateData.total = mergedItems.reduce(
        (sum: number, i: any) => sum + i.unitPrice * i.quantity,
        0,
      );
    }

    return this.prisma.order.update({ where: { id }, data: updateData });
  }

  async updateOrderStatus(id: string, data: UpdateOrderStatusDto) {
    const order = await this.getOrderById(id);

    const allowedTransitions: Record<string, string[]> = {
      DRAFT: ['PENDING', 'COMPLETED', 'CANCELED'],
      PENDING: ['COMPLETED', 'CANCELED'],
      COMPLETED: [],
      CANCELED: [],
    };

    const allowed = allowedTransitions[order.status];
    if (!allowed.includes(data.status)) {
      throw new Error(
        `Não é possível alterar o status de ${order.status} para ${data.status}`,
      );
    }

    const items = order.items as any[];

    const shouldDecrementStock =
      order.status === 'DRAFT' &&
      (data.status === 'PENDING' || data.status === 'COMPLETED');

    const shouldRevertStock =
      order.status === 'PENDING' && data.status === 'CANCELED';

    return this.prisma.$transaction(async (tx) => {
      if (shouldDecrementStock) {
        for (const item of items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }

      if (shouldRevertStock) {
        for (const item of items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      return tx.order.update({
        where: { id },
        data: { status: data.status },
      });
    });
  }

  async deleteOrder(id: string) {
    const order = await this.getOrderById(id);

    if (order.status === 'COMPLETED' || order.status === 'CANCELED') {
      throw new Error(
        'Apenas pedidos em rascunho ou pendentes podem ser deletados',
      );
    }

    return this.prisma.order.delete({ where: { id } });
  }
}
