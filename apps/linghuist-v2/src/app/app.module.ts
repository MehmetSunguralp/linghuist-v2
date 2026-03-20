import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from '../../../../libs/prisma/prisma.module';
import { SupabaseModule } from '../../../../libs/supabase/supabase.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [PrismaModule, SupabaseModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
