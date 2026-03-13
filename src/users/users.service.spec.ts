import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

const mockPrisma = {
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(mockPrisma as unknown as PrismaService);
  });

  describe('getAllUsers', () => {
    it('deve retornar lista de usuários sem senha', async () => {
      const users = [{ id: '1', name: 'João', email: 'joao@email.com' }];
      mockPrisma.user.findMany.mockResolvedValue(users);

      const result = await service.getAllUsers();

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        select: { id: true, name: true, email: true },
      });
      expect(result).toEqual(users);
    });

    it('deve retornar array vazio quando não há usuários', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      const result = await service.getAllUsers();
      expect(result).toEqual([]);
    });
  });

  describe('getUserById', () => {
    it('deve retornar o usuário pelo id', async () => {
      const user = { id: '1', name: 'João', email: 'joao@email.com' };
      mockPrisma.user.findUnique.mockResolvedValue(user);

      const result = await service.getUserById('1');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        select: { id: true, name: true, email: true },
      });
      expect(result).toEqual(user);
    });

    it('deve lançar erro quando usuário não existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getUserById('inexistente')).rejects.toThrow(
        'Usuário não encontrado',
      );
    });
  });

  describe('getUserByEmail', () => {
    it('deve retornar o usuário pelo email', async () => {
      const user = { id: '1', name: 'João', email: 'joao@email.com' };
      mockPrisma.user.findUnique.mockResolvedValue(user);

      const result = await service.getUserByEmail('joao@email.com');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'joao@email.com' },
        select: { id: true, name: true, email: true },
      });
      expect(result).toEqual(user);
    });

    it('deve lançar erro quando email não encontrado', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getUserByEmail('nao@existe.com')).rejects.toThrow(
        'Usuário não encontrado',
      );
    });
  });

  describe('updateUser', () => {
    const existingUser = {
      id: '1',
      name: 'João',
      email: 'joao@email.com',
      password: 'hashed',
    };

    it('deve atualizar o usuário com sucesso', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(existingUser);
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      const updatedUser = { ...existingUser, name: 'João Atualizado' };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateUser('1', { name: 'João Atualizado' });

      expect(result).not.toHaveProperty('password');
      expect(result.name).toBe('João Atualizado');
    });

    it('deve lançar erro quando usuário não existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.updateUser('inexistente', { name: 'X' }),
      ).rejects.toThrow('Usuário não encontrado');
    });

    it('deve lançar erro quando email já pertence a outro usuário', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(existingUser);
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: '2',
        email: 'outro@email.com',
      });

      await expect(
        service.updateUser('1', { email: 'outro@email.com' }),
      ).rejects.toThrow('Email já registrado, por favor escolha outro');
    });

    it('deve fazer hash da senha ao atualizar', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(existingUser);
      const updatedUser = { ...existingUser, password: 'nova-hash' };
      mockPrisma.user.update.mockResolvedValue(updatedUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('nova-hash');

      await service.updateUser('1', { password: 'novaSenha123' });

      expect(bcrypt.hash).toHaveBeenCalledWith('novaSenha123', 10);
    });

    it('deve permitir atualizar com o próprio email', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(existingUser);
      mockPrisma.user.findUnique.mockResolvedValueOnce(existingUser);
      const updatedUser = { ...existingUser };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateUser('1', { email: 'joao@email.com' });

      expect(result).not.toHaveProperty('password');
    });
  });

  describe('deleteUser', () => {
    it('deve deletar o usuário com sucesso', async () => {
      const user = {
        id: '1',
        name: 'João',
        email: 'joao@email.com',
        password: 'hash',
      };
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.user.delete.mockResolvedValue(undefined);

      await service.deleteUser('1');

      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('deve lançar erro quando usuário não existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.deleteUser('inexistente')).rejects.toThrow(
        'Usuário não encontrado',
      );
      expect(mockPrisma.user.delete).not.toHaveBeenCalled();
    });
  });
});
