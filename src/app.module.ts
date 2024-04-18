import { Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { v4 as uuidv4 } from 'uuid';
import { ConfigModuleSetup } from './externalModules';
import { LoggerModule } from './logger/logger.module';
import { MinioClientModule } from './minio-client/minio-client.module';
import { QueueModule } from './queue/queue.module';

@Module({
	imports: [
		ConfigModuleSetup,
		MinioClientModule,
		LoggerModule,
		QueueModule,
		ClsModule.forRoot({
			global: true,
			middleware: {
				mount: true,
				generateId: true,
				idGenerator: (req: Request) => req.headers['x-correlation-id'] ?? uuidv4(),
			},
		}),
	],
	controllers: [],
})
export class AppModule {}
