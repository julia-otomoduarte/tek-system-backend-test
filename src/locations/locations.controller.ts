import { Controller, Get, Param } from '@nestjs/common';
import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('states')
  getStates() {
    return this.locationsService.getStates();
  }

  @Get('states/:uf/cities')
  getCitiesByState(@Param('uf') uf: string) {
    return this.locationsService.getCitiesByState(uf);
  }

  @Get('cep/:cep')
  getCep(@Param('cep') cep: string) {
    return this.locationsService.getCep(cep);
  }
}
