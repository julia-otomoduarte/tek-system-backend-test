import { CustomersService } from './customers.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCustomerDto } from './dto/update-customer.dto';

const mockPrisma = {
  customer: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  order: {
    findFirst: jest.fn(),
  },
};

// CPF válido para testes: 529.982.247-25
const validCpf = '529.982.247-25';
// CNPJ válido para testes: 11.222.333/0001-81
const validCnpj = '11.222.333/0001-81';

const makeCustomerDto = (overrides = {}) => ({
  name: 'Maria Silva',
  email: 'maria@email.com',
  phone: '(11) 91234-5678',
  document: validCpf,
  address: {
    street: 'Rua das Flores',
    number: '123',
    neighborhood: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01001-000',
  },
  ...overrides,
});

describe('CustomersService', () => {
  let service: CustomersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CustomersService(mockPrisma as unknown as PrismaService);
  });

  describe('createCustomer', () => {
    it('deve criar cliente com sucesso usando CPF válido', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(null);
      const created = {
        id: '1',
        ...makeCustomerDto(),
        document: '52998224725',
        phone: '11912345678',
      };
      mockPrisma.customer.create.mockResolvedValue(created);

      const result = await service.createCustomer(makeCustomerDto());

      expect(mockPrisma.customer.create).toHaveBeenCalled();
      expect(result).toEqual(created);
    });

    it('deve criar cliente com sucesso usando CNPJ válido', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(null);
      const dto = makeCustomerDto({
        document: validCnpj,
        email: 'empresa@email.com',
        phone: '(11) 98765-4321',
      });
      const created = {
        id: '2',
        ...dto,
        document: '11222333000181',
        phone: '11987654321',
      };
      mockPrisma.customer.create.mockResolvedValue(created);

      const result = await service.createCustomer(dto);

      expect(result.id).toBe('2');
    });

    it('deve lançar erro para CPF inválido', async () => {
      const dto = makeCustomerDto({ document: '111.111.111-11' });
      await expect(service.createCustomer(dto)).rejects.toThrow('CPF inválido');
    });

    it('deve lançar erro para documento com tamanho incorreto', async () => {
      const dto = makeCustomerDto({ document: '123' });
      await expect(service.createCustomer(dto)).rejects.toThrow(
        'Documento deve ser um CPF (11 dígitos) ou CNPJ (14 dígitos)',
      );
    });

    it('deve lançar erro quando email já cadastrado', async () => {
      const existing = {
        id: '1',
        email: 'maria@email.com',
        document: '99999999999',
        phone: '99999999999',
      };
      mockPrisma.customer.findFirst.mockResolvedValue(existing);

      await expect(service.createCustomer(makeCustomerDto())).rejects.toThrow(
        'Email de cliente já cadastrado',
      );
    });

    it('deve lançar erro quando documento já cadastrado', async () => {
      const existing = {
        id: '1',
        email: 'outro@email.com',
        document: '52998224725',
        phone: '99999999999',
      };
      mockPrisma.customer.findFirst.mockResolvedValue(existing);

      await expect(service.createCustomer(makeCustomerDto())).rejects.toThrow(
        'Documento de cliente já cadastrado',
      );
    });

    it('deve lançar erro quando telefone já cadastrado', async () => {
      const existing = {
        id: '1',
        email: 'outro@email.com',
        document: '99999999999',
        phone: '11912345678',
      };
      mockPrisma.customer.findFirst.mockResolvedValue(existing);

      await expect(service.createCustomer(makeCustomerDto())).rejects.toThrow(
        'Telefone de cliente já cadastrado',
      );
    });
  });

  describe('getAllCustomers', () => {
    it('deve retornar todos os clientes sem filtros com paginação padrão', async () => {
      const customers = [{ id: '1', name: 'Maria' }];
      mockPrisma.customer.findMany.mockResolvedValue(customers);
      mockPrisma.customer.count.mockResolvedValue(1);

      const result = await service.getAllCustomers();

      expect(mockPrisma.customer.findMany).toHaveBeenCalledWith({ where: {}, skip: 0, take: 10 });
      expect(result).toEqual({ data: customers, meta: { total: 1, page: 1, limit: 10, totalPages: 1 } });
    });

    it('deve filtrar por nome', async () => {
      mockPrisma.customer.findMany.mockResolvedValue([]);
      mockPrisma.customer.count.mockResolvedValue(0);

      await service.getAllCustomers({ name: 'Maria' });

      expect(mockPrisma.customer.findMany).toHaveBeenCalledWith({
        where: { name: { contains: 'Maria', mode: 'insensitive' } },
        skip: 0,
        take: 10,
      });
    });

    it('deve filtrar por email', async () => {
      mockPrisma.customer.findMany.mockResolvedValue([]);
      mockPrisma.customer.count.mockResolvedValue(0);

      await service.getAllCustomers({ email: 'maria@' });

      expect(mockPrisma.customer.findMany).toHaveBeenCalledWith({
        where: { email: { contains: 'maria@', mode: 'insensitive' } },
        skip: 0,
        take: 10,
      });
    });

    it('deve filtrar por cidade e estado', async () => {
      mockPrisma.customer.findMany.mockResolvedValue([]);
      mockPrisma.customer.count.mockResolvedValue(0);

      await service.getAllCustomers({ city: 'São Paulo', state: 'SP' });

      expect(mockPrisma.customer.findMany).toHaveBeenCalledWith({
        where: {
          address: {
            is: { city: { equals: 'São Paulo' }, state: { equals: 'SP' } },
          },
        },
        skip: 0,
        take: 10,
      });
    });

    it('deve respeitar page e limit informados', async () => {
      mockPrisma.customer.findMany.mockResolvedValue([]);
      mockPrisma.customer.count.mockResolvedValue(25);

      const result = await service.getAllCustomers({ page: 2, limit: 5 });

      expect(mockPrisma.customer.findMany).toHaveBeenCalledWith({ where: {}, skip: 5, take: 5 });
      expect(result.meta).toEqual({ total: 25, page: 2, limit: 5, totalPages: 5 });
    });
  });

  describe('getCustomerById', () => {
    it('deve retornar cliente pelo id', async () => {
      const customer = { id: '1', name: 'Maria' };
      mockPrisma.customer.findUnique.mockResolvedValue(customer);

      const result = await service.getCustomerById('1');

      expect(mockPrisma.customer.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(result).toEqual(customer);
    });

    it('deve lançar erro quando cliente não existe', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(null);
      await expect(service.getCustomerById('inexistente')).rejects.toThrow(
        'Cliente não encontrado',
      );
    });
  });

  describe('updateCustomer', () => {
    const existingCustomer = {
      id: '1',
      name: 'Maria',
      email: 'maria@email.com',
      document: '52998224725',
      phone: '11912345678',
    };

    it('deve atualizar cliente com sucesso', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(existingCustomer);
      mockPrisma.customer.findFirst.mockResolvedValue(null);
      const updated = { ...existingCustomer, name: 'Maria Atualizada' };
      mockPrisma.customer.update.mockResolvedValue(updated);

      const result = await service.updateCustomer('1', {
        name: 'Maria Atualizada',
      } as UpdateCustomerDto);

      expect(result.name).toBe('Maria Atualizada');
    });

    it('deve lançar erro quando cliente não encontrado', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(null);
      await expect(
        service.updateCustomer('inexistente', {
          name: 'X',
        } as UpdateCustomerDto),
      ).rejects.toThrow('Cliente não encontrado');
    });

    it('deve lançar erro para CPF inválido ao atualizar', async () => {
      await expect(
        service.updateCustomer('1', {
          document: '111.111.111-11',
        } as UpdateCustomerDto),
      ).rejects.toThrow('CPF inválido');
    });

    it('deve lançar erro quando email já pertence a outro cliente', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(existingCustomer);
      mockPrisma.customer.findFirst.mockResolvedValue({
        id: '2',
        email: 'outro@email.com',
        document: '99999999999',
        phone: '99999999999',
      });

      await expect(
        service.updateCustomer('1', {
          email: 'outro@email.com',
        } as UpdateCustomerDto),
      ).rejects.toThrow('Email de cliente já cadastrado');
    });
  });

  describe('deleteCustomer', () => {
    it('deve deletar cliente com sucesso', async () => {
      const customer = { id: '1', name: 'Maria' };
      mockPrisma.customer.findUnique.mockResolvedValue(customer);
      mockPrisma.order.findFirst.mockResolvedValue(null);
      mockPrisma.customer.delete.mockResolvedValue(customer);

      const result = await service.deleteCustomer('1');

      expect(mockPrisma.customer.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(result).toEqual(customer);
    });

    it('deve lançar erro quando cliente não existe', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(null);
      await expect(service.deleteCustomer('inexistente')).rejects.toThrow(
        'Cliente não encontrado',
      );
      expect(mockPrisma.customer.delete).not.toHaveBeenCalled();
    });

    it('deve lançar erro quando cliente possui pedidos cadastrados', async () => {
      const customer = { id: '1', name: 'Maria' };
      mockPrisma.customer.findUnique.mockResolvedValue(customer);
      mockPrisma.order.findFirst.mockResolvedValue({ id: 'order-1' });

      await expect(service.deleteCustomer('1')).rejects.toThrow(
        'Cliente possui pedidos cadastrados e não pode ser deletado',
      );
      expect(mockPrisma.customer.delete).not.toHaveBeenCalled();
    });
  });
});
