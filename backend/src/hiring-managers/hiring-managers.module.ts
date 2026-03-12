import { Module } from '@nestjs/common';
import { HiringManagersController } from './hiring-managers.controller';
import { HiringManagersService } from './hiring-managers.service';
import { PrismaService } from '../prisma.service';

@Module({
    controllers: [HiringManagersController],
    providers: [HiringManagersService, PrismaService],
    exports: [HiringManagersService],
})
export class HiringManagersModule {}
