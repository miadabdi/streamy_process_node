import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { NodeEnv } from '../common/enums';

export const ConfigModuleSetup = ConfigModule.forRoot({
	envFilePath: '.env',
	isGlobal: true,
	cache: true,
	validationSchema: Joi.object({
		NODE_ENV: Joi.string()
			.valid(...Object.values(NodeEnv))
			.required(),
		PORT: Joi.number().min(1024).default(3001),
		MINIO_ENDPOINT: Joi.string().min(1).required(),
		MINIO_PORT: Joi.number().min(0).max(65535).required(),
		MINIO_ACCESS_KEY: Joi.string().min(1).required(),
		MINIO_SECRET_KEY: Joi.string().min(1).required(),
		RMQ_URL: Joi.string().min(1).required(),
	}),
});
