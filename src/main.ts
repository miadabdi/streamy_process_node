import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoggerService } from './logger/logger.service';

async function bootstrap() {
	const app = await NestFactory.create(AppModule, {
		// logger,
		bufferLogs: true,
	});

	app.useLogger(app.get(LoggerService));

	const configService = app.get(ConfigService);

	const port = configService.get<number>('PORT');
	await app.listen(port);

	const bootstrapLogger = new Logger('bootstrap');

	process.on('uncaughtException', (err) => {
		bootstrapLogger.fatal(err);
		process.exit(1);
	});

	process.on('unhandledRejection', (err) => {
		bootstrapLogger.fatal(err);
		process.exit(1);
	});
}
bootstrap();
