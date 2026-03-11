/* eslint-disable @typescript-eslint/no-unsafe-return */
import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  describe('handleRequest', () => {
    it('deve retornar o usuário quando token é válido', () => {
      const user = { id: '1', email: 'joao@email.com' };
      const result = guard.handleRequest(null, user);
      expect(result).toEqual(user);
    });

    it('deve lançar UnauthorizedException quando não há usuário', () => {
      expect(() => guard.handleRequest(null, null)).toThrow(
        UnauthorizedException,
      );
      expect(() => guard.handleRequest(null, null)).toThrow(
        'Token inválido ou expirado',
      );
    });

    it('deve lançar UnauthorizedException quando não há usuário e err é null', () => {
      expect(() => guard.handleRequest(null, undefined)).toThrow(
        UnauthorizedException,
      );
    });

    it('deve relançar o erro original quando err é fornecido', () => {
      const originalError = new UnauthorizedException('Token expirado');
      expect(() => guard.handleRequest(originalError, null)).toThrow(
        originalError,
      );
    });

    it('deve relançar erro mesmo que usuário esteja presente quando err é fornecido', () => {
      const originalError = new Error('Erro de autenticação');
      const user = { id: '1', email: 'joao@email.com' };
      expect(() => guard.handleRequest(originalError, user)).toThrow(
        originalError,
      );
    });
  });
});
