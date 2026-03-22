import { Test } from '@nestjs/testing';
import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    service = app.get<AppService>(AppService);
  });

  describe('getHealth', () => {
    it('returns standard API envelope', () => {
      expect(service.getHealth()).toEqual({
        message: 'OK',
        data: { status: 'running' },
      });
    });
  });
});
