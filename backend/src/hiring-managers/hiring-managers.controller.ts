import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { HiringManagersService } from './hiring-managers.service';

@Controller('api/hiring-managers')
export class HiringManagersController {
    constructor(private readonly service: HiringManagersService) {}

    @Post()
    async create(@Body() body: { name: string; email: string; password: string; phone?: string; subject?: string }) {
        return this.service.create(body);
    }

    @Get()
    async findAll() {
        return this.service.findAll();
    }

    @Get('active')
    async findActive() {
        return this.service.findActive();
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() body: any) {
        return this.service.update(id, body);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}
