import { Controller, Get } from '@nestjs/common';
import type { ApiEnvelope } from './common/api-envelope.types';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHealth(): ApiEnvelope<{ status: string }> {
    return this.appService.getHealth();
  }
}
