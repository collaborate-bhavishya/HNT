import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from './auth/auth.module';

@Module({
  controllers: [AdminController],
  providers: [AdminService, PrismaService],
  imports: [AuthModule]
})
export class AdminModule { }
