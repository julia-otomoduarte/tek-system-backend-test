import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProductDto } from './dto/update-product.dto';

const mockPrisma = {
  product: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const makeProductDto = (overrides = {}) => ({
  sku: 'PROD-001',
  name: 'Notebook Dell',
  description: 'Notebook Dell Inspiron 15',
  price: 3500,
  stock: 10,
  ...overrides,
});

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProductsService(mockPrisma as unknown as PrismaService);
  });

  describe('createProduct', () => {
    it('deve criar produto com sucesso', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);
      mockPrisma.product.findFirst.mockResolvedValue(null);
      const created = { id: '1', ...makeProductDto() };
      mockPrisma.product.create.mockResolvedValue(created);

      const result = await service.createProduct(makeProductDto());

      expect(mockPrisma.product.create).toHaveBeenCalled();
      expect(result).toEqual(created);
    });

    it('deve lançar erro quando preço é zero', async () => {
      await expect(
        service.createProduct(makeProductDto({ price: 0 })),
      ).rejects.toThrow('O preço unitário deve ser maior que zero');
    });

    it('deve lançar erro quando preço é negativo', async () => {
      await expect(
        service.createProduct(makeProductDto({ price: -10 })),
      ).rejects.toThrow('O preço unitário deve ser maior que zero');
    });

    it('deve lançar erro quando estoque é negativo', async () => {
      await expect(
        service.createProduct(makeProductDto({ stock: -1 })),
      ).rejects.toThrow('O estoque não pode ser negativo');
    });

    it('deve lançar erro quando SKU já cadastrado', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: '1',
        sku: 'PROD-001',
      });

      await expect(service.createProduct(makeProductDto())).rejects.toThrow(
        'SKU de produto já cadastrado',
      );
    });

    it('deve lançar erro quando nome já cadastrado', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);
      mockPrisma.product.findFirst.mockResolvedValue({
        id: '2',
        name: 'Notebook Dell',
      });

      await expect(service.createProduct(makeProductDto())).rejects.toThrow(
        'Nome de produto já cadastrado',
      );
    });
  });

  describe('getAllProducts', () => {
    it('deve retornar todos os produtos sem filtros', async () => {
      const products = [{ id: '1', name: 'Notebook Dell' }];
      mockPrisma.product.findMany.mockResolvedValue(products);

      const result = await service.getAllProducts();

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({ where: {} });
      expect(result).toEqual(products);
    });

    it('deve filtrar por SKU', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);

      await service.getAllProducts({ sku: 'PROD' });

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: { sku: { contains: 'PROD' } },
      });
    });

    it('deve filtrar por nome', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);

      await service.getAllProducts({ name: 'Notebook' });

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: { name: { contains: 'Notebook', mode: 'insensitive' } },
      });
    });

    it('deve filtrar por faixa de preço', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);

      await service.getAllProducts({ priceGte: 1000, priceLte: 5000 });

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: { price: { gte: 1000, lte: 5000 } },
      });
    });
  });

  describe('getProductById', () => {
    it('deve retornar produto pelo id', async () => {
      const product = { id: '1', name: 'Notebook Dell' };
      mockPrisma.product.findUnique.mockResolvedValue(product);

      const result = await service.getProductById('1');

      expect(mockPrisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(result).toEqual(product);
    });

    it('deve lançar erro quando produto não existe', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.getProductById('inexistente')).rejects.toThrow(
        'Produto não encontrado',
      );
    });
  });

  describe('updateProduct', () => {
    const existingProduct = {
      id: '1',
      sku: 'PROD-001',
      name: 'Notebook Dell',
      price: 3500,
      stock: 10,
    };

    it('deve atualizar produto com sucesso', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(existingProduct);
      mockPrisma.product.findFirst.mockResolvedValue(null);
      const updated = { ...existingProduct, name: 'Notebook Dell Atualizado' };
      mockPrisma.product.update.mockResolvedValue(updated);

      const result = await service.updateProduct('1', {
        name: 'Notebook Dell Atualizado',
      } as UpdateProductDto);

      expect(result.name).toBe('Notebook Dell Atualizado');
    });

    it('deve lançar erro quando produto não encontrado', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProduct('inexistente', { name: 'X' } as UpdateProductDto),
      ).rejects.toThrow('Produto não encontrado');
    });

    it('deve lançar erro para preço inválido ao atualizar', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(existingProduct);

      await expect(
        service.updateProduct('1', { price: 0 } as UpdateProductDto),
      ).rejects.toThrow('O preço unitário deve ser maior que zero');
    });

    it('deve lançar erro para estoque negativo ao atualizar', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(existingProduct);

      await expect(
        service.updateProduct('1', { stock: -5 } as UpdateProductDto),
      ).rejects.toThrow('O estoque não pode ser negativo');
    });

    it('deve lançar erro quando SKU já pertence a outro produto', async () => {
      mockPrisma.product.findUnique
        .mockResolvedValueOnce(existingProduct)
        .mockResolvedValueOnce({ id: '2', sku: 'PROD-002' });

      await expect(
        service.updateProduct('1', { sku: 'PROD-002' } as UpdateProductDto),
      ).rejects.toThrow('SKU de produto já cadastrado');
    });

    it('deve lançar erro quando nome já pertence a outro produto', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(existingProduct);
      mockPrisma.product.findFirst.mockResolvedValue({
        id: '2',
        name: 'Outro Notebook',
      });

      await expect(
        service.updateProduct('1', {
          name: 'Outro Notebook',
        } as UpdateProductDto),
      ).rejects.toThrow('Nome de produto já cadastrado');
    });
  });

  describe('deleteProduct', () => {
    it('deve deletar produto com sucesso', async () => {
      const product = { id: '1', name: 'Notebook Dell' };
      mockPrisma.product.findUnique.mockResolvedValue(product);
      mockPrisma.product.delete.mockResolvedValue(product);

      const result = await service.deleteProduct('1');

      expect(mockPrisma.product.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(result).toEqual(product);
    });

    it('deve lançar erro quando produto não existe', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.deleteProduct('inexistente')).rejects.toThrow(
        'Produto não encontrado',
      );
      expect(mockPrisma.product.delete).not.toHaveBeenCalled();
    });
  });
});
