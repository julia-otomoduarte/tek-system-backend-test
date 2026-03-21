import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrderDto } from './dto/list-order.dto';
import { UpdateOrderDto, UpdateOrderStatusDto } from './dto/update-order.dto';
import { OrderItemDto } from './dto/order-item.dto';
import { OrderItem, OrderStatus, Prisma, Product } from '@prisma/client';

interface OrderUpdateData {
  customerId?: string;
  items?: OrderItem[];
  total?: number;
}

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async getAllOrders(filter: ListOrderDto) {
    const { page = 1, limit = 10 } = filter;
    const where: Prisma.OrderWhereInput = {};

    if (filter.orderNumber) {
      where.orderNumber = { contains: filter.orderNumber, mode: 'insensitive' };
    }
    if (filter.customerId) {
      where.customerId = filter.customerId;
    }
    if (filter.totalGte !== undefined || filter.totalLte !== undefined) {
      where.total = {};
      if (filter.totalGte !== undefined) {
        where.total.gte = filter.totalGte;
      }
      if (filter.totalLte !== undefined) {
        where.total.lte = filter.totalLte;
      }
    }
    if (filter.status) {
      where.status = filter.status;
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({ where, skip, take: limit }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOrderById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
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
    const orderItems: OrderItem[] = [];
    const productMap = new Map<string, Product>();

    for (const item of items) {
      let product = productMap.get(item.productId);
      if (!product) {
        product = await this.prisma.product.findUnique({
          where: { id: item.productId },
        });
        if (!product)
          throw new NotFoundException(
            `Produto #${item.productId} não encontrado`,
          );
        productMap.set(item.productId, product);
      }

      const totalQty =
        (orderItems.find((product) => product.productId === item.productId)
          ?.quantity || 0) + item.quantity;

      if (totalQty > product.stock) {
        throw new BadRequestException(
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
      throw new NotFoundException('Cliente não encontrado');
    }

    const { orderItems, total } = await this.prepareOrderItemsPayload(items);

    const orderNumber = await this.generateOrderNumber();

    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        customerId,
        total,
        items: orderItems,
        status: OrderStatus.DRAFT,
      },
      include: { customer: true },
    });
    return order;
  }

  async updateOrder(id: string, data: UpdateOrderDto) {
    const order = await this.getOrderById(id);

    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }

    if (
      order.status === OrderStatus.COMPLETED ||
      order.status === OrderStatus.CANCELED
    ) {
      throw new BadRequestException(
        'Apenas pedidos em rascunho ou pendentes podem ser editados',
      );
    }

    const { items, customerId } = data;

    if (customerId) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer) {
        throw new NotFoundException('Cliente não encontrado');
      }
    }

    const updateData: OrderUpdateData = {};

    updateData.customerId = customerId;

    if (items) {
      const existingItems: OrderItem[] = order.items as OrderItem[];
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
        (sum: number, i: OrderItem) => sum + i.unitPrice * i.quantity,
        0,
      );
    }

    return this.prisma.order.update({ where: { id }, data: updateData });
  }

  async updateOrderStatus(id: string, data: UpdateOrderStatusDto) {
    const order = await this.getOrderById(id);

    const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.DRAFT]: [
        OrderStatus.PENDING,
        OrderStatus.COMPLETED,
        OrderStatus.CANCELED,
      ],
      [OrderStatus.PENDING]: [OrderStatus.COMPLETED, OrderStatus.CANCELED],
      [OrderStatus.COMPLETED]: [],
      [OrderStatus.CANCELED]: [],
    };

    const allowed = allowedTransitions[order.status];
    if (!allowed.includes(data.status)) {
      throw new BadRequestException(
        `Não é possível alterar o status de ${order.status} para ${data.status}`,
      );
    }

    const items = order.items as OrderItem[];

    const shouldDecrementStock =
      order.status === OrderStatus.DRAFT &&
      (data.status === OrderStatus.PENDING ||
        data.status === OrderStatus.COMPLETED);

    const shouldRevertStock =
      order.status === OrderStatus.PENDING &&
      data.status === OrderStatus.CANCELED;

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

    if (
      order.status === OrderStatus.COMPLETED ||
      order.status === OrderStatus.CANCELED
    ) {
      throw new BadRequestException(
        'Apenas pedidos em rascunho ou pendentes podem ser deletados',
      );
    }

    return this.prisma.order.delete({ where: { id } });
  }
}
