import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from '@linghuist-v2/prisma';
import { SupabaseModule } from '@linghuist-v2/supabase';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [PrismaModule, SupabaseModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
