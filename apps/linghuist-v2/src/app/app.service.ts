import { Injectable } from '@nestjs/common';
import type { ApiEnvelope } from './common/api-envelope.types';

@Injectable()
export class AppService {
  /** Root health check — same envelope shape as the rest of the API. */
  getHealth(): ApiEnvelope<{ status: string }> {
    return {
      message: 'OK',
      data: { status: 'running' },
    };
  }
}
