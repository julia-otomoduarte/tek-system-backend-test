/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

const VIACEP_BASE_URL = 'https://viacep.com.br/ws';

const IBGE_BASE_URL = 'https://servicodados.ibge.gov.br/api/v1/localidades';

@Injectable()
export class LocationsService {
  constructor(private readonly httpService: HttpService) {}

  async getStates() {
    const { data } = await firstValueFrom(
      this.httpService.get(`${IBGE_BASE_URL}/estados`, {
        params: { orderBy: 'nome' },
      }),
    );
    return data.map(
      ({ id, sigla, nome }: { id: number; sigla: string; nome: string }) => ({
        id,
        sigla,
        nome,
      }),
    );
  }

  async getCitiesByState(uf: string) {
    const { data } = await firstValueFrom(
      this.httpService.get(`${IBGE_BASE_URL}/estados/${uf}/municipios`, {
        params: { orderBy: 'nome' },
      }),
    );
    return data.map(({ id, nome }: { id: number; nome: string }) => ({
      id,
      nome,
    }));
  }

  async getCep(cep: string) {
    const cleaned = cep.replace(/\D/g, '');

    if (cleaned.length !== 8) {
      throw new BadRequestException('CEP deve conter 8 dígitos');
    }

    const { data } = await firstValueFrom(
      this.httpService.get(`${VIACEP_BASE_URL}/${cleaned}/json/`),
    );

    if (data.erro) {
      throw new NotFoundException('CEP não encontrado');
    }

    return {
      cep: data.cep,
      street: data.logradouro,
      complement: data.complemento,
      neighborhood: data.bairro,
      city: data.localidade,
      state: data.uf,
      zipCode: cleaned,
    };
  }
}
