/* eslint-disable @typescript-eslint/no-unsafe-return */
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';

const makeTxMock = () => ({
  orderCounter: {
    findFirst: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  product: {
    update: jest.fn(),
  },
  order: {
    update: jest.fn(),
  },
});

const mockPrisma = {
  order: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  customer: {
    findUnique: jest.fn(),
  },
  product: {
    findUnique: jest.fn(),
  },
  orderCounter: {
    findFirst: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

const makeProduct = (overrides = {}) => ({
  id: 'prod-1',
  name: 'Produto A',
  sku: 'SKU-A',
  price: 50,
  stock: 10,
  ...overrides,
});

const makeOrder = (overrides = {}) => ({
  id: 'order-1',
  orderNumber: 'TK-1',
  customerId: 'customer-1',
  status: 'DRAFT',
  total: 100,
  items: [
    {
      productId: 'prod-1',
      productName: 'Produto A',
      sku: 'SKU-A',
      quantity: 2,
      unitPrice: 50,
    },
  ],
  ...overrides,
});

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OrdersService(mockPrisma as unknown as PrismaService);
  });

  describe('getAllOrders', () => {
    it('deve retornar todos os pedidos sem filtros', async () => {
      const orders = [makeOrder()];
      mockPrisma.order.findMany.mockResolvedValue(orders);

      const result = await service.getAllOrders({});

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith({ where: {} });
      expect(result).toEqual(orders);
    });

    it('deve filtrar por orderNumber', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      await service.getAllOrders({ orderNumber: 'TK-1' });
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
        where: { orderNumber: { contains: 'TK-1' } },
      });
    });

    it('deve filtrar por customerId', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      await service.getAllOrders({ customerId: 'customer-1' });
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
        where: { customerId: 'customer-1' },
      });
    });

    it('deve filtrar por faixa de total', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      await service.getAllOrders({ totalGte: 100, totalLte: 500 });
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
        where: { total: { gte: 100, lte: 500 } },
      });
    });

    it('deve filtrar por status', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      await service.getAllOrders({ status: 'PENDING' as any });
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
        where: { status: 'PENDING' },
      });
    });
  });

  describe('getOrderById', () => {
    it('deve retornar pedido pelo id', async () => {
      const order = makeOrder();
      mockPrisma.order.findUnique.mockResolvedValue(order);

      const result = await service.getOrderById('order-1');

      expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: 'order-1' },
      });
      expect(result).toEqual(order);
    });

    it('deve lançar erro quando pedido não existe', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);
      await expect(service.getOrderById('inexistente')).rejects.toThrow(
        'Pedido não encontrado',
      );
    });
  });

  describe('createOrder', () => {
    it('deve criar pedido com sucesso', async () => {
      const customer = { id: 'customer-1', name: 'Maria' };
      const product = makeProduct();
      const created = makeOrder();

      mockPrisma.customer.findUnique.mockResolvedValue(customer);
      mockPrisma.product.findUnique.mockResolvedValue(product);
      mockPrisma.$transaction.mockImplementation((fn) => {
        const tx = makeTxMock();
        tx.orderCounter.findFirst.mockResolvedValue(null);
        tx.orderCounter.create.mockResolvedValue({ counter: 1 });
        return fn(tx);
      });
      mockPrisma.order.create.mockResolvedValue(created);

      const result = await service.createOrder({
        customerId: 'customer-1',
        items: [{ productId: 'prod-1', quantity: 2 }],
      });

      expect(mockPrisma.order.create).toHaveBeenCalled();
      expect(result).toEqual(created);
    });

    it('deve lançar erro quando cliente não encontrado', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(null);

      await expect(
        service.createOrder({
          customerId: 'inexistente',
          items: [{ productId: 'prod-1', quantity: 1 }],
        }),
      ).rejects.toThrow('Cliente não encontrado');
    });

    it('deve lançar erro quando produto não encontrado', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue({ id: 'customer-1' });
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.createOrder({
          customerId: 'customer-1',
          items: [{ productId: 'inexistente', quantity: 1 }],
        }),
      ).rejects.toThrow('Produto #inexistente não encontrado');
    });

    it('deve lançar erro quando estoque insuficiente', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue({ id: 'customer-1' });
      mockPrisma.product.findUnique.mockResolvedValue(
        makeProduct({ stock: 1 }),
      );

      await expect(
        service.createOrder({
          customerId: 'customer-1',
          items: [{ productId: 'prod-1', quantity: 5 }],
        }),
      ).rejects.toThrow('Estoque insuficiente para o produto "Produto A"');
    });
  });

  describe('updateOrder', () => {
    it('deve lançar erro quando pedido está COMPLETED', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(
        makeOrder({ status: 'COMPLETED' }),
      );

      await expect(
        service.updateOrder('order-1', { items: [] }),
      ).rejects.toThrow(
        'Apenas pedidos em rascunho ou pendentes podem ser editados',
      );
    });

    it('deve lançar erro quando pedido está CANCELED', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(
        makeOrder({ status: 'CANCELED' }),
      );

      await expect(
        service.updateOrder('order-1', { items: [] }),
      ).rejects.toThrow(
        'Apenas pedidos em rascunho ou pendentes podem ser editados',
      );
    });

    it('deve lançar erro quando novo cliente não existe', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(makeOrder());
      mockPrisma.customer.findUnique.mockResolvedValue(null);

      await expect(
        service.updateOrder('order-1', { customerId: 'inexistente' }),
      ).rejects.toThrow('Cliente não encontrado');
    });

    it('deve manter preço original para item já existente no pedido', async () => {
      const order = makeOrder({
        items: [
          {
            productId: 'prod-1',
            productName: 'Produto A',
            sku: 'SKU-A',
            quantity: 2,
            unitPrice: 50,
          },
        ],
      });
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockPrisma.order.update.mockResolvedValue(order);

      await service.updateOrder('order-1', {
        items: [{ productId: 'prod-1', quantity: 3 }],
      });

      const updateCall = mockPrisma.order.update.mock.calls[0][0];
      expect(updateCall.data.items[0].unitPrice).toBe(50);
      expect(updateCall.data.items[0].quantity).toBe(3);
    });

    it('deve buscar preço atual para item novo adicionado ao pedido', async () => {
      const order = makeOrder({ items: [] });
      const product = makeProduct({ id: 'prod-2', price: 75 });
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockPrisma.product.findUnique.mockResolvedValue(product);
      mockPrisma.order.update.mockResolvedValue(order);

      await service.updateOrder('order-1', {
        items: [{ productId: 'prod-2', quantity: 1 }],
      });

      const updateCall = mockPrisma.order.update.mock.calls[0][0];
      expect(updateCall.data.items[0].unitPrice).toBe(75);
    });
  });

  describe('updateOrderStatus', () => {
    it('deve lançar erro para transição inválida (COMPLETED → DRAFT)', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(
        makeOrder({ status: 'COMPLETED' }),
      );

      await expect(
        service.updateOrderStatus('order-1', { status: 'DRAFT' as any }),
      ).rejects.toThrow(
        'Não é possível alterar o status de COMPLETED para DRAFT',
      );
    });

    it('deve lançar erro para transição inválida (CANCELED → PENDING)', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(
        makeOrder({ status: 'CANCELED' }),
      );

      await expect(
        service.updateOrderStatus('order-1', { status: 'PENDING' as any }),
      ).rejects.toThrow(
        'Não é possível alterar o status de CANCELED para PENDING',
      );
    });

    it('deve dar baixa no estoque ao ir de DRAFT para PENDING', async () => {
      const order = makeOrder({ status: 'DRAFT' });
      mockPrisma.order.findUnique.mockResolvedValue(order);

      const tx = makeTxMock();
      tx.product.update.mockResolvedValue({});
      tx.order.update.mockResolvedValue({ ...order, status: 'PENDING' });
      mockPrisma.$transaction.mockImplementation((fn) => fn(tx));

      await service.updateOrderStatus('order-1', { status: 'PENDING' });

      expect(tx.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { stock: { decrement: 2 } },
      });
    });

    it('deve dar baixa no estoque ao ir de DRAFT para COMPLETED', async () => {
      const order = makeOrder({ status: 'DRAFT' });
      mockPrisma.order.findUnique.mockResolvedValue(order);

      const tx = makeTxMock();
      tx.product.update.mockResolvedValue({});
      tx.order.update.mockResolvedValue({ ...order, status: 'COMPLETED' });
      mockPrisma.$transaction.mockImplementation((fn) => fn(tx));

      await service.updateOrderStatus('order-1', { status: 'COMPLETED' });

      expect(tx.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { stock: { decrement: 2 } },
      });
    });

    it('deve estornar estoque ao ir de PENDING para CANCELED', async () => {
      const order = makeOrder({ status: 'PENDING' });
      mockPrisma.order.findUnique.mockResolvedValue(order);

      const tx = makeTxMock();
      tx.product.update.mockResolvedValue({});
      tx.order.update.mockResolvedValue({ ...order, status: 'CANCELED' });
      mockPrisma.$transaction.mockImplementation((fn) => fn(tx));

      await service.updateOrderStatus('order-1', { status: 'CANCELED' });

      expect(tx.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { stock: { increment: 2 } },
      });
    });

    it('não deve alterar estoque ao ir de DRAFT para CANCELED', async () => {
      const order = makeOrder({ status: 'DRAFT' });
      mockPrisma.order.findUnique.mockResolvedValue(order);

      const tx = makeTxMock();
      tx.order.update.mockResolvedValue({ ...order, status: 'CANCELED' });
      mockPrisma.$transaction.mockImplementation((fn) => fn(tx));

      await service.updateOrderStatus('order-1', { status: 'CANCELED' });

      expect(tx.product.update).not.toHaveBeenCalled();
    });

    it('não deve alterar estoque ao ir de PENDING para COMPLETED', async () => {
      const order = makeOrder({ status: 'PENDING' });
      mockPrisma.order.findUnique.mockResolvedValue(order);

      const tx = makeTxMock();
      tx.order.update.mockResolvedValue({ ...order, status: 'COMPLETED' });
      mockPrisma.$transaction.mockImplementation((fn) => fn(tx));

      await service.updateOrderStatus('order-1', { status: 'COMPLETED' });

      expect(tx.product.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteOrder', () => {
    it('deve deletar pedido DRAFT com sucesso', async () => {
      const order = makeOrder({ status: 'DRAFT' });
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockPrisma.order.delete.mockResolvedValue(order);

      const result = await service.deleteOrder('order-1');

      expect(mockPrisma.order.delete).toHaveBeenCalledWith({
        where: { id: 'order-1' },
      });
      expect(result).toEqual(order);
    });

    it('deve deletar pedido PENDING com sucesso', async () => {
      const order = makeOrder({ status: 'PENDING' });
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockPrisma.order.delete.mockResolvedValue(order);

      await service.deleteOrder('order-1');

      expect(mockPrisma.order.delete).toHaveBeenCalled();
    });

    it('deve lançar erro ao tentar deletar pedido COMPLETED', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(
        makeOrder({ status: 'COMPLETED' }),
      );

      await expect(service.deleteOrder('order-1')).rejects.toThrow(
        'Apenas pedidos em rascunho ou pendentes podem ser deletados',
      );
      expect(mockPrisma.order.delete).not.toHaveBeenCalled();
    });

    it('deve lançar erro ao tentar deletar pedido CANCELED', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(
        makeOrder({ status: 'CANCELED' }),
      );

      await expect(service.deleteOrder('order-1')).rejects.toThrow(
        'Apenas pedidos em rascunho ou pendentes podem ser deletados',
      );
      expect(mockPrisma.order.delete).not.toHaveBeenCalled();
    });

    it('deve lançar erro quando pedido não existe', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(service.deleteOrder('inexistente')).rejects.toThrow(
        'Pedido não encontrado',
      );
    });
  });
});
