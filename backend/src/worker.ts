import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker/worker.module';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(WorkerModule);
    console.log('Worker process is running...');
}
bootstrap();
